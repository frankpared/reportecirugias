// --- START OF FILE script.js ---

// Inicialización de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCFtuuSPCcQIkgDN_F1WRS4U-71pRNCf_E", 
  authDomain: "cirugia-reporte.firebaseapp.com",
  projectId: "cirugia-reporte",
  storageBucket: "cirugia-reporte.appspot.com",
  messagingSenderId: "698831567840",
  appId: "1:698831567840:web:fc6d6197f22beba4d88985",
  measurementId: "G-HD7ZLL1GLZ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage(); 

db.enablePersistence()
  .then(() => { console.log("Persistencia habilitada."); })
  .catch((err) => {
    if (err.code == 'failed-precondition') console.warn("Persistencia falló: Múltiples pestañas abiertas?");
    else if (err.code == 'unimplemented') console.warn("Persistencia no soportada en este navegador.");
    else console.error("Error al habilitar persistencia:", err);
  });

// --- Constantes ---
const COLECCION_REPORTES = 'reportes';
const COLECCION_SUGERENCIAS = 'sugerencias';
const LOCALSTORAGE_USER_ID = 'usuarioId';
const DEBOUNCE_DELAY = 300; 
const COLECCION_CLIENTES = 'clientes'; 
const COLECCION_TIPOS_CX = 'tiposCirugia'; 
const COLECCION_MATERIALES = 'materiales';
const MAX_FILE_SIZE = 5 * 1024 * 1024; 
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];


// --- Variables Globales para Datos Cargados ---
let listaClientesCargada = null; 
let listaTiposCxCargada = null; 
let listaMaterialesCargada = null; 
let reportePendiente = null; 
let guardandoReporte = false; 
let archivosParaSubir = []; 
let datosReporteOriginal = null; 

// --- Helper Debounce ---
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- Referencias a Elementos DOM adicionales ---
const loadingIndicator = document.getElementById('loading-indicator');
const retrySaveBtn = document.getElementById('retry-save-btn');
const actionButtons = document.querySelectorAll('.text-center button, .text-center a');
const inputArchivosAdjuntos = document.getElementById('archivosAdjuntos');
const listaArchivosSeleccionadosDiv = document.getElementById('listaArchivosSeleccionados');


function setActionButtonsDisabled(disabled) {
    actionButtons.forEach(btn => {
        if (btn.id !== 'retry-save-btn') { 
            btn.disabled = disabled;
        }
    });
    if (inputArchivosAdjuntos) inputArchivosAdjuntos.disabled = disabled;
}

// --- Funciones para Adjuntar Archivos ---
function mostrarArchivosSeleccionados() {
    archivosParaSubir = Array.from(inputArchivosAdjuntos.files);
    listaArchivosSeleccionadosDiv.innerHTML = '';
    if (archivosParaSubir.length > 0) {
        const ul = document.createElement('ul');
        ul.style.listStyleType = 'none';
        ul.style.paddingLeft = '0';
        archivosParaSubir.forEach(file => {
            const li = document.createElement('li');
            li.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            if (file.size > MAX_FILE_SIZE) {
                li.style.color = 'red';
                li.textContent += ' - Excede el tamaño máximo!';
            } else if (!ALLOWED_FILE_TYPES.includes(file.type.toLowerCase()) && file.type) { 
                li.style.color = 'red';
                li.textContent += ' - Tipo de archivo no permitido!';
            } else if (!file.type && !ALLOWED_FILE_TYPES.some(type => file.name.toLowerCase().endsWith(type.split('/')[1]))) {
                 if (!(file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
                    li.style.color = 'red';
                    li.textContent += ' - Tipo de archivo no reconocido / no permitido!';
                 }
            }
            ul.appendChild(li);
        });
        listaArchivosSeleccionadosDiv.appendChild(ul);
    }
}

async function subirArchivos(reporteId) {
    const urlsArchivos = [];
    if (archivosParaSubir.length === 0) return urlsArchivos;

    mostrarToast("Subiendo archivos adjuntos...", "info");

    for (const file of archivosParaSubir) {
        let isValidType = ALLOWED_FILE_TYPES.includes(file.type.toLowerCase()) || 
                          (!file.type && (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')));

        if (file.size > MAX_FILE_SIZE || !isValidType) {
            console.warn(`Archivo ${file.name} omitido por tamaño o tipo.`);
            continue; 
        }
        const filePath = `reportes/${reporteId}/${Date.now()}_${file.name}`;
        const fileRef = storage.ref().child(filePath);
        try {
            const snapshot = await fileRef.put(file);
            const url = await snapshot.ref.getDownloadURL();
            urlsArchivos.push({ nombre: file.name, url: url, path: filePath, tipo: file.type || 'unknown' });
            console.log(`Archivo ${file.name} subido a ${url}`);
        } catch (error) {
            console.error(`Error subiendo archivo ${file.name}:`, error);
            mostrarToast(`Error al subir ${file.name}.`, "error");
            // Considerar si se debe detener la subida de los demás o continuar
        }
    }
    // Limpiar el input de archivos DESPUÉS de intentar subir todos
    if (inputArchivosAdjuntos) inputArchivosAdjuntos.value = null; 
    archivosParaSubir = []; // Limpiar el array global
    listaArchivosSeleccionadosDiv.innerHTML = ''; // Limpiar la lista visual
    return urlsArchivos;
}


// --- Validación ---
function setupValidacion() {
    const camposRequeridos = ['paciente', 'cliente', 'medico', 'fechaCirugia']; 
    camposRequeridos.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => validarCampo(input));
            input.addEventListener('blur', () => validarCampo(input));
        }
    });
}

function validarCampo(input) {
    const errorDiv = document.getElementById(`error-${input.id}`);
    let esValido = true;

    if (input.required && input.value.trim() === '') {
        esValido = false;
    }

    if (input.type === 'date' && input.required && !input.value) {
       esValido = false;
    } else if (input.type === 'date' && input.value && !/^\d{4}-\d{2}-\d{2}$/.test(input.value)) {
        esValido = false;
    }

    if (!esValido) {
        input.classList.add('campo-invalido');
        if (errorDiv) errorDiv.style.display = 'block';
    } else {
        input.classList.remove('campo-invalido');
        if (errorDiv) errorDiv.style.display = 'none';
    }
    return esValido;
}

function validarFormulario() {
    let esFormularioValido = true;
    const camposRequeridos = ['paciente', 'cliente', 'medico', 'fechaCirugia']; 

    camposRequeridos.forEach(id => {
        const input = document.getElementById(id);
        if (input && !validarCampo(input)) { 
            esFormularioValido = false;
        }
    });
    
    // Re-validar archivos justo antes de guardar, por si el usuario cambió la selección
    archivosParaSubir = inputArchivosAdjuntos ? Array.from(inputArchivosAdjuntos.files) : [];
    for (const file of archivosParaSubir) {
        if (file.size > MAX_FILE_SIZE) {
            mostrarToast(`Archivo ${file.name} excede 5MB.`, 'warning');
            esFormularioValido = false;
            inputArchivosAdjuntos?.classList.add('campo-invalido'); // Marcar input file como inválido
            break; 
        }
        let isValidType = ALLOWED_FILE_TYPES.includes(file.type.toLowerCase()) ||
                          (!file.type && (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')));
        
        if (!isValidType) {
            mostrarToast(`Archivo ${file.name}: formato no permitido.`, 'warning');
            esFormularioValido = false;
             inputArchivosAdjuntos?.classList.add('campo-invalido');
            break;
        }
    }
     // Limpiar marca de inválido si ya no hay error de archivos
    if (esFormularioValido && inputArchivosAdjuntos?.classList.contains('campo-invalido')) {
         inputArchivosAdjuntos.classList.remove('campo-invalido');
    }


    if (!esFormularioValido && !document.querySelector('.toast-notification.visible')) { 
        mostrarToast('Corrija los campos requeridos (*) o los archivos adjuntos.', 'warning');
    }
    return esFormularioValido;
}

// --- Carga de Datos Maestros desde Firestore ---
async function fetchClientes() { 
    if (listaClientesCargada !== null) return; 
    listaClientesCargada = []; 
    try {
        const snapshot = await db.collection(COLECCION_CLIENTES).orderBy('nombreLower').get();
        listaClientesCargada = snapshot.docs.map(doc => doc.data().nombre);
    } catch (error) {
        console.error("Error fetching clientes:", error);
        mostrarToast("Error al cargar clientes desde DB.", "error");
    }
}

async function fetchTiposCirugia() {
    if (listaTiposCxCargada !== null) return; 
    listaTiposCxCargada = []; 
    try {
        const snapshot = await db.collection(COLECCION_TIPOS_CX).orderBy('nombreLower').get();
        listaTiposCxCargada = snapshot.docs.map(doc => doc.data().nombre);
    } catch (error) {
        console.error("Error fetching tipos de cirugía:", error);
        mostrarToast("Error al cargar tipos de cirugía desde DB.", "error");
    }
}

async function fetchMateriales() {
    if (listaMaterialesCargada !== null) return; 
    listaMaterialesCargada = {}; 
    try {
        const snapshot = await db.collection(COLECCION_MATERIALES).orderBy('categoria').orderBy('code').get();
        const materialesAgrupados = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            const categoria = data.categoria || "SIN CATEGORIA"; 
            if (!materialesAgrupados[categoria]) {
                materialesAgrupados[categoria] = [];
            }
            const cleanDescription = (data.description || '').replace(/^-+|-+$/g, '').trim();
            materialesAgrupados[categoria].push({
                code: data.code,
                description: cleanDescription
            });
        });
        listaMaterialesCargada = materialesAgrupados;
    } catch (error) {
        console.error("Error fetching materiales:", error);
        mostrarToast("Error al cargar materiales desde DB.", "error");
    }
}

// --- Sugerencias (Autocompletado) ---
async function cargarSugerenciasIniciales(idInput, idList) {
    const datalistElement = document.getElementById(idList);
    if (!datalistElement) return;
    const campo = idInput; 
    try {
        const snapshot = await db.collection(COLECCION_SUGERENCIAS).doc(campo).get();
        if (snapshot.exists && snapshot.data().valores) {
            const valoresUnicos = [...new Set(snapshot.data().valores)]; 
            // Ordenar alfabéticamente insensible a mayúsculas/minúsculas
            valoresUnicos.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            actualizarListaDatalist(datalistElement, valoresUnicos);
        } else {
            datalistElement.innerHTML = ''; 
        }
    } catch (error) {
        console.error(`Error cargando sugerencias para ${campo}:`, error);
    }
}

async function guardarSugerencia(campo, valor) {
    if (!valor || valor.trim().length < 2) return; 
    const valorLimpio = valor.trim();
    const docRef = db.collection(COLECCION_SUGERENCIAS).doc(campo);

    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            let valores = [];
            if (doc.exists && doc.data().valores) {
                valores = doc.data().valores;
            }
            if (!valores.map(v => v.toLowerCase()).includes(valorLimpio.toLowerCase())) {
                valores.push(valorLimpio);
                valores.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())); 
                // if (valores.length > 100) { valores = valores.slice(0, 100); } 
                transaction.set(docRef, { valores: valores }, { merge: true }); 

                const datalistElement = document.getElementById(`${campo}List`); 
                if (datalistElement) {
                     actualizarListaDatalist(datalistElement, valores); 
                }
            }
        });
    } catch (error) {
        // Silenciar errores de transacción si ocurren concurrentemente (puede pasar con offline)
        if (error.code !== 'transaction-retry') {
             console.error(`Error guardando sugerencia para ${campo}:`, error);
        }
    }
}

function actualizarListaDatalist(datalistElement, valores) {
    datalistElement.innerHTML = ''; 
    valores.forEach(val => {
        const option = document.createElement('option');
        option.value = val;
        datalistElement.appendChild(option);
    });
}

// --- Obtención y Formateo de Datos ---
function obtenerDatos(establecerOriginal = false) {
    const datosActuales = {
        formato: document.getElementById('formato')?.value || 'formal',
        mensajeInicio: document.getElementById('mensajeInicio')?.value || '',
        paciente: document.getElementById('paciente')?.value.trim() || '',
        cliente: document.getElementById('cliente')?.value.trim() || '',
        medico: document.getElementById('medico')?.value.trim() || '',
        instrumentador: document.getElementById('instrumentador')?.value.trim() || '',
        lugarCirugia: document.getElementById('lugarCirugia')?.value.trim() || '',
        fechaCirugia: document.getElementById('fechaCirugia')?.value || '',
        tipoCirugia: document.getElementById('tipoCirugia')?.value.trim() || '',
        material: document.getElementById('material')?.value.trim() || '',
        observaciones: document.getElementById('observaciones')?.value.trim() || '',
        infoAdicional: document.getElementById('infoAdicional')?.value.trim() || '',
    };
    // Establecer como original solo si se pide explícitamente o si no existe y hay datos
    if (establecerOriginal || (!datosReporteOriginal && datosActuales.paciente)) {
        datosReporteOriginal = { ...datosActuales };
        console.log("Datos originales establecidos para auditoría.");
    }
    return datosActuales;
}

function formatearMaterialParaHTML(materialTexto) {
    if (!materialTexto) return '<p>No especificado.</p>';
    const lineas = materialTexto.split('\n').filter(linea => linea.trim() !== '');
    if (lineas.length === 0) return '<p>No especificado.</p>';
    let tablaHTML = '<table class="material-table">';
    lineas.forEach(linea => {
        tablaHTML += `<tr><td>${linea.trim().replace(/</g, "<").replace(/>/g, ">")}</td></tr>`; // Escapar HTML
    });
    tablaHTML += '</table>';
    return tablaHTML;
}

function formatearFechaUsuario(fechaISO) {
    if (!fechaISO) return 'No especificada';
    try {
        const partes = fechaISO.split('-');
        if (partes.length !== 3) return fechaISO; 
        const fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]), 12, 0, 0);
        return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return fechaISO; }
}

// --- Función de Auditoría ---
async function registrarAuditoria(reporteId, accion, cambios = [], usuarioId) {
    const logEntry = {
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        usuarioId: usuarioId || obtenerUsuarioId(),
        accion: accion, 
        cambios: cambios 
    };
    try {
        await db.collection(COLECCION_REPORTES).doc(reporteId).collection('auditLog').add(logEntry);
    } catch (error) {
        console.error(`Error registrando log auditoría para ${reporteId}:`, error);
    }
}

function generarListaDeCambios(datosNuevos, datosAntiguos) {
    const cambios = [];
    const camposAuditables = [
        'paciente', 'cliente', 'medico', 'instrumentador', 'lugarCirugia', 
        'fechaCirugia', 'tipoCirugia', 'material', 'observaciones', 'infoAdicional',
        'formato', 'mensajeInicio' 
    ];

    // Asegurarse que datosAntiguos no sea null o undefined
    const datosAntiguosValidos = datosAntiguos || {};

    for (const campo of camposAuditables) {
        const valorNuevo = datosNuevos[campo] !== undefined ? String(datosNuevos[campo]).trim() : '';
        const valorAntiguo = datosAntiguosValidos[campo] !== undefined ? String(datosAntiguosValidos[campo]).trim() : '';

        if (valorNuevo !== valorAntiguo) {
            cambios.push({
                campo: campo,
                anterior: valorAntiguo || '(vacío)',
                nuevo: valorNuevo || '(vacío)'
            });
        }
    }
    return cambios;
}

// --- Acciones Principales ---
function generarTexto() {
    if (!validarFormulario()) return;
    
    const datos = obtenerDatos(true); // Forzar establecer original al generar texto
    const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia);
    const contenidoMaterialHTML = formatearMaterialParaHTML(datos.material);
    const fraseFinal = "\n\nSaludos, quedo al pendiente.";
    let archivosHtmlParaReporte = '';
    const currentFiles = inputArchivosAdjuntos ? Array.from(inputArchivosAdjuntos.files) : [];


    if (currentFiles.length > 0) {
        archivosHtmlParaReporte += `<h4>Archivos Adjuntos Propuestos:</h4><ul>`;
        currentFiles.forEach(file => {
            let isValidType = ALLOWED_FILE_TYPES.includes(file.type.toLowerCase()) ||
                              (!file.type && (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')));
            if (file.size <= MAX_FILE_SIZE && isValidType) {
                archivosHtmlParaReporte += `<li>${file.name} (${(file.size / 1024).toFixed(1)} KB)</li>`;
            } else {
                 archivosHtmlParaReporte += `<li style="color:red;">${file.name} (INVÁLIDO - no se subirá)</li>`;
            }
        });
        archivosHtmlParaReporte += `</ul>`;
    }

    const reporteHTML = `
      <div class="reporte-contenido reporte-box">
        <img src="https://i.imgur.com/aA7RzTN.png" alt="Logo Districorr" style="max-height: 70px; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;">
        <h3>📝 Reporte de Cirugía</h3>
        <p>${datos.mensajeInicio || 'Detalles de la cirugía programada:'}</p>
        <ul>
          <li><strong>Paciente:</strong> ${datos.paciente || '-'}</li>
          <li><strong>Cliente:</strong> ${datos.cliente || '-'}</li>
          <li><strong>Tipo de Cirugía:</strong> ${datos.tipoCirugia || '-'}</li>
          <li><strong>Médico:</strong> ${datos.medico || '-'}</li>
          <li><strong>Instrumentador:</strong> ${datos.instrumentador || '-'}</li>
          <li><strong>Fecha Cirugía:</strong> ${fechaFormateada}</li>
          <li><strong>Lugar:</strong> ${datos.lugarCirugia || '-'}</li>
        </ul>
        <h4>Material Requerido:</h4>
        ${contenidoMaterialHTML}
        ${archivosHtmlParaReporte}
        ${datos.observaciones ? `<h4>Observaciones:</h4><p>${datos.observaciones.replace(/\n/g, '<br>')}</p>` : ''}
        ${datos.infoAdicional ? `<h4>Información Adicional:</h4><p>${datos.infoAdicional.replace(/\n/g, '<br>')}</p>` : ''}
        <p style="margin-top: 20px;">${fraseFinal.trim().replace(/\n/g, '<br>')}</p>
      </div>`;

    const resultadoContainer = document.getElementById('resultado-container');
    if (resultadoContainer) {
        resultadoContainer.innerHTML = reporteHTML;
        resultadoContainer.style.display = 'block';
        resultadoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        mostrarToast('✅ Reporte generado. Listo para copiar o enviar.', 'success');
    } else {
        mostrarToast('❌ Error interno: No se pudo mostrar el reporte.', 'error');
    }
}

async function copiarTexto() {
    if (!validarFormulario()) return;
    if (guardandoReporte) { mostrarToast("Guardado en proceso...", "info"); return; }
    
    ocultarBotonReintento(); 
    const resultadoContainer = document.getElementById('resultado-container');
    let reporteContenidoElement = resultadoContainer?.querySelector('.reporte-contenido');

    // Si el reporte no está visible, generarlo primero
    if (!reporteContenidoElement || resultadoContainer.style.display === 'none') {
        generarTexto(); 
        reporteContenidoElement = document.getElementById('resultado-container')?.querySelector('.reporte-contenido');
        if (!reporteContenidoElement) { mostrarToast('Error al generar reporte antes de copiar.', 'error'); return; }
        // Esperar un instante para que el DOM se actualice
        await new Promise(resolve => setTimeout(resolve, 50)); 
    } else {
         // Si ya estaba generado, asegurarse que los datos originales están seteados
         if (!datosReporteOriginal && document.getElementById('paciente').value.trim()) {
            obtenerDatos(true); // Forzar setear original si no existía
         }
    }
    await copiarYGuardarInterno(reporteContenidoElement);
}

async function copiarYGuardarInterno(reporteElement) {
    if (guardandoReporte) return; 
    guardandoReporte = true;
    loadingIndicator.style.display = 'block';
    setActionButtonsDisabled(true);
    ocultarBotonReintento();

    const datosParaGuardar = obtenerDatos(); // Obtiene datos actuales, NO setea original aquí
    const textoPlanoParaCopiar = reporteElement.innerText;
    let copiadoExitoso = false;
    let guardadoExitoso = false;
    
    try {
        await navigator.clipboard.writeText(textoPlanoParaCopiar);
        copiadoExitoso = true;
    } catch (err) { console.error('Error al copiar:', err); }

    try {
        // Siempre es creación desde la interfaz principal
        await guardarEnFirebase(datosParaGuardar, null); 
        guardadoExitoso = true;
        reportePendiente = null; 
        ocultarBotonReintento();
        
        // Limpiar formulario y estado
        ['paciente', 'cliente', 'medico', 'tipoCirugia', 'material', 'observaciones', 'infoAdicional', 'instrumentador', 'lugarCirugia'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        const fechaInput = document.getElementById('fechaCirugia');
        if (fechaInput) { 
            const hoy = new Date(); const offset = hoy.getTimezoneOffset();
            const hoyLocal = new Date(hoy.getTime() - (offset*60*1000));
            fechaInput.value = hoyLocal.toISOString().split('T')[0];
             validarCampo(fechaInput); // Re-validar fecha default
        }
        if (inputArchivosAdjuntos) inputArchivosAdjuntos.value = null; 
        archivosParaSubir = [];
        listaArchivosSeleccionadosDiv.innerHTML = '';
        datosReporteOriginal = null; // Resetear para el próximo reporte
        
        // Ocultar resultado y limpiar validaciones de campos limpiados
         ['paciente', 'cliente', 'medico'].forEach(id => validarCampo(document.getElementById(id))); // Revalidar vacíos
        const resultadoContainer = document.getElementById('resultado-container');
        if (resultadoContainer) resultadoContainer.style.display = 'none';

    } catch (err) { 
        console.error('Error guardando:', err); 
        // No limpiar formulario si falla el guardado para que el usuario no pierda datos
    }

    if (copiadoExitoso && guardadoExitoso) mostrarToast('✅ Copiado y Guardado!', 'success');
    else if (copiadoExitoso) mostrarToast('⚠️ Copiado, pero falló el guardado.', 'warning');
    else if (guardadoExitoso) mostrarToast('⚠️ Guardado, pero falló la copia.', 'warning');
    else mostrarToast('❌ Falló copia y guardado.', 'error');

    if (!reportePendiente) {
        loadingIndicator.style.display = 'none';
        setActionButtonsDisabled(false);
    }
    guardandoReporte = false;
}

function obtenerUsuarioId() {
    let userId = localStorage.getItem(LOCALSTORAGE_USER_ID);
    if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        try { localStorage.setItem(LOCALSTORAGE_USER_ID, userId); } catch (e) { console.warn("localStorage no disponible");}
    }
    return userId;
}

async function guardarEnFirebase(data, reporteIdExistente = null) {
    // Ya no es necesario setear 'guardandoReporte', 'loadingIndicator', etc. aquí, 
    // porque se hace en la función que llama (copiarYGuardarInterno)

    if (!data.paciente || !data.cliente || !data.medico || !data.fechaCirugia) { 
        throw new Error("Datos insuficientes."); // Lanzar error para que la función llamante lo maneje
    }

    const usuarioActualId = obtenerUsuarioId();
    let docRef;
    let esNuevaCreacion = !reporteIdExistente;
    const idParaOperacion = reporteIdExistente || db.collection(COLECCION_REPORTES).doc().id; 
    const archivosActuales = inputArchivosAdjuntos ? Array.from(inputArchivosAdjuntos.files) : []; // Obtener archivos actuales del input

    // Filtrar archivos válidos para subir
    const archivosValidosParaSubir = archivosActuales.filter(file => {
         let isValidType = ALLOWED_FILE_TYPES.includes(file.type.toLowerCase()) ||
                           (!file.type && (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')));
        return file.size <= MAX_FILE_SIZE && isValidType;
    });

    const urlsDeArchivosSubidos = await subirArchivos(idParaOperacion); // subirArchivos ahora limpia el input y el array global

    // Asegurarse que los datos originales estén disponibles para comparación si es edición
    if (!esNuevaCreacion && !datosReporteOriginal) {
        console.warn("Intentando editar sin datos originales cargados. Auditoría puede ser incompleta.");
         // Podríamos intentar cargarlos aquí, pero es mejor hacerlo al iniciar la edición.
         // const snapshot = await db.collection(COLECCION_REPORTES).doc(idParaOperacion).get();
         // datosReporteOriginal = snapshot.data(); // Asignar si existe
    }

    const reporte = { ...data, usuario: usuarioActualId }; // No incluir archivos aquí inicialmente

    try {
        if (esNuevaCreacion) {
            reporte.creadoEn = firebase.firestore.FieldValue.serverTimestamp(); 
            reporte.creadoPor = usuarioActualId; 
            reporte.modificadoEn = reporte.creadoEn; 
            reporte.modificadoPor = usuarioActualId; 
            reporte.archivosAdjuntos = urlsDeArchivosSubidos; // Añadir archivos subidos
            
            docRef = db.collection(COLECCION_REPORTES).doc(idParaOperacion);
            await docRef.set(reporte);
            await registrarAuditoria(idParaOperacion, "Creación", [], usuarioActualId);
            if (urlsDeArchivosSubidos.length > 0) {
                 const cambiosArchivos = urlsDeArchivosSubidos.map(a => ({ campo: 'archivoAdjunto', anterior: '(ninguno)', nuevo: a.nombre }));
                 await registrarAuditoria(idParaOperacion, "Archivos Subidos", cambiosArchivos, usuarioActualId);
            }
        } else { 
            docRef = db.collection(COLECCION_REPORTES).doc(idParaOperacion);
            const datosAntiguos = datosReporteOriginal || {}; // Usar original si existe
            const cambiosDetectados = generarListaDeCambios(data, datosAntiguos);
            const archivosExistentes = datosAntiguos.archivosAdjuntos || [];
            
            const datosParaActualizar = {
                 ...data, // Campos principales actualizados
                 modificadoEn: firebase.firestore.FieldValue.serverTimestamp(),
                 modificadoPor: usuarioActualId,
                 archivosAdjuntos: [...archivosExistentes, ...urlsDeArchivosSubidos] // Combinar archivos
            };

            await docRef.update(datosParaActualizar);
            if (cambiosDetectados.length > 0) {
                await registrarAuditoria(idParaOperacion, "Modificación", cambiosDetectados, usuarioActualId);
            }
            if (urlsDeArchivosSubidos.length > 0) {
                 const cambiosArchivos = urlsDeArchivosSubidos.map(a => ({ campo: 'archivoAdjunto', anterior: `(${archivosExistentes.length} existentes)`, nuevo: a.nombre }));
                 await registrarAuditoria(idParaOperacion, "Archivos Subidos", cambiosArchivos, usuarioActualId);
            }
            // Resetear original DESPUÉS de una edición exitosa
             datosReporteOriginal = null;
        }

        // Guardar sugerencias (solo si el valor no está vacío)
        ['cliente', 'medico', 'instrumentador', 'lugarCirugia', 'tipoCirugia'].forEach(async (campo) => {
            if(data[campo]) await guardarSugerencia(campo, data[campo]);
        });
        
        return idParaOperacion; // Devolver el ID del reporte

    } catch (error) {
        console.error("Error Firebase en guardarEnFirebase:", error);
        // Re-lanzar el error para que la función llamante (copiarYGuardarInterno) lo maneje (ponga toast, botón reintento, etc.)
        throw error; 
    } 
    // No manejar UI (loading, botones) aquí, se hace en copiarYGuardarInterno
}

// --- Funciones Auxiliares y de Interfaz (Toast, Botón Reintento) ---
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    // Ocultar toast anterior si existe
    toast.classList.remove('visible');
    toast.style.display = 'none'; // Ocultar inmediatamente antes de mostrar el nuevo

    toast.textContent = mensaje;
    toast.className = 'toast-notification'; 
    toast.classList.add(tipo); 
    toast.style.display = 'block';
    void toast.offsetWidth; // Forzar reflow
    toast.classList.add('visible'); // Añadir clase para transición
    toast.style.transform = 'translateY(0)'; // Asegurar posición final

    // Ocultar después de un tiempo
    setTimeout(() => {
        toast.classList.remove('visible');
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => { toast.style.display = 'none'; }, 300); 
    }, 4000); 
}

function mostrarBotonReintento() {
    if (retrySaveBtn) {
        retrySaveBtn.style.display = 'inline-block';
        loadingIndicator.style.display = 'none';
        setActionButtonsDisabled(false); // Habilitar botones para poder reintentar
    }
}
function ocultarBotonReintento() {
    if (retrySaveBtn) retrySaveBtn.style.display = 'none';
}

function reintentarGuardado() {
    if (reportePendiente) {
        console.log("Reintentando guardar reporte pendiente...");
        loadingIndicator.style.display = 'block'; // Mostrar carga durante reintento
        setActionButtonsDisabled(true);
        ocultarBotonReintento();
        
        const idExistente = reportePendiente.id; // Asumir que el ID estaría en el objeto pendiente si fuera edición
        guardarEnFirebase(reportePendiente, idExistente)
            .then(() => {
                mostrarToast("✅ Guardado tras reintento.", "success");
                reportePendiente = null; 
                ocultarBotonReintento(); // Ocultar al tener éxito
            })
            .catch(err => { 
                console.error("Fallo el reintento:", err);
                // El error ya se maneja en guardarEnFirebase (muestra toast/botón si falla de nuevo)
            })
            .finally(() => {
                 if (!reportePendiente) { // Si tuvo éxito o fue error no recuperable
                    loadingIndicator.style.display = 'none';
                    setActionButtonsDisabled(false);
                }
            });
    } else {
        ocultarBotonReintento(); 
    }
}

// --- Otras Acciones (Compartir, Email, Imprimir, Imagen) ---
function compartirWhatsApp() {
    if (!validarFormulario()) return;
    const resultadoContainer = document.getElementById('resultado-container');
    const reporteContenidoElement = resultadoContainer?.querySelector('.reporte-contenido');
    if (!reporteContenidoElement || resultadoContainer.style.display === 'none') {
        generarTexto(); 
        const nuevoReporteElement = document.getElementById('resultado-container')?.querySelector('.reporte-contenido');
        if (!nuevoReporteElement) { mostrarToast('Genere reporte primero.', 'warning'); return; }
        const textoPlano = `*Reporte Cirugía Districorr*\n\n${nuevoReporteElement.innerText}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textoPlano)}`, '_blank');
    } else {
        const textoPlano = `*Reporte Cirugía Districorr*\n\n${reporteContenidoElement.innerText}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textoPlano)}`, '_blank');
    }
}

function enviarPorEmail() {
    if (!validarFormulario()) return;
    const resultadoContainer = document.getElementById('resultado-container');
    let reporteContenidoElement = resultadoContainer?.querySelector('.reporte-contenido');
    if (!reporteContenidoElement || resultadoContainer.style.display === 'none') {
        generarTexto();
        reporteContenidoElement = document.getElementById('resultado-container')?.querySelector('.reporte-contenido');
        if (!reporteContenidoElement) { mostrarToast('Genere reporte primero.', 'warning'); return; }
    }
    const datos = obtenerDatos();
    const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia);
    const subject = `Reporte Cirugía: ${datos.paciente} - Cliente: ${datos.cliente} (${fechaFormateada})`;
    let body = reporteContenidoElement.innerText;
    body += `\n\n--\nGenerado con App Districorr`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function imprimirReporte() {
    const resultadoContainer = document.getElementById('resultado-container');
    if (!resultadoContainer?.querySelector('.reporte-contenido') || resultadoContainer.style.display === 'none') {
        mostrarToast('Genere reporte primero.', 'warning'); return;
    }
    const contenidoParaImprimir = resultadoContainer.querySelector('.reporte-contenido').cloneNode(true);
    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write('<html><head><title>Imprimir Reporte</title><link rel="stylesheet" href="style.css"><style>body{padding:20px;background-color:#fff;font-size:10pt;}.reporte-box{box-shadow:none;border:1px solid #ccc;border-left:5px solid #007bff;margin:0;max-width:100%;}.reporte-contenido ul{padding-left:20px;list-style:disc;} table.material-table{font-size:9pt;width:100%;border:1px solid #eee;} table.material-table td{padding:4px 6px;} button,.btn-link,.btn-volver,.modal-overlay,.toast-notification,.credit,header,.form-group,.text-center,#loading-indicator,#retry-save-btn, .btn-seleccionar-item{display:none!important;} @page { size: A4; margin: 20mm; } @media print{body{padding:0;}.reporte-box{border:none;border-left:5px solid #007bff;} .reporte-contenido img{max-height:50px!important;}}</style></head><body>');
    ventanaImpresion.document.body.appendChild(contenidoParaImprimir);
    ventanaImpresion.document.write('</body></html>');
    ventanaImpresion.document.close(); 
    ventanaImpresion.onload = function() {
        setTimeout(() => { // Dar tiempo a renderizar
             ventanaImpresion.focus(); ventanaImpresion.print(); setTimeout(() => { ventanaImpresion.close(); }, 500);
        }, 250);
    };
}

async function generarImagen() {
    const { jsPDF } = window.jspdf; 
    const html2canvas = window.html2canvas;
    if (typeof html2canvas === 'undefined' || typeof jsPDF === 'undefined') {
        mostrarToast('❌ Error: Librerías jsPDF o html2canvas no cargadas.', 'error'); return;
    }
    const reporteElement = document.getElementById('resultado-container')?.querySelector('.reporte-contenido');
    if (!reporteElement || document.getElementById('resultado-container').style.display === 'none') {
        mostrarToast('Genere reporte primero.', 'warning'); return;
    }
    mostrarToast('🖼️ Generando imagen...', 'info');
    try {
        // Asegurar que las imágenes externas se carguen antes de renderizar
        const images = reporteElement.querySelectorAll('img');
        const promises = [];
        images.forEach(img => {
            if (!img.complete) { // Si la imagen no está cargada
                promises.push(new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                }));
            }
        });
        await Promise.all(promises); // Esperar a que todas las imágenes se carguen

        const canvas = await html2canvas(reporteElement, { 
            scale: 2, 
            useCORS: true, // Necesario para imágenes de imgur
            allowTaint: true, // Puede ayudar con CORS en algunos casos
            backgroundColor: '#ffffff' 
        });
        const link = document.createElement('a');
        link.download = `reporte_cirugia_${obtenerDatos().paciente||'paciente'}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png'); 
        link.click(); 
        mostrarToast('✅ Imagen PNG descargada.', 'success');
    } catch (error) {
        console.error("Error generando imagen:", error);
        mostrarToast('❌ Error al generar imagen.', 'error');
    }
}

// --- Funciones para Modales (Materiales, TipoCx, Cliente) ---
// Modal Materiales
async function abrirModalMateriales() { 
    const modal = document.getElementById('modalMateriales');
    const listaContainer = document.getElementById('modalMaterialesLista');
    const searchInput = document.getElementById('modalMaterialesSearchInput');
    if (!modal || !listaContainer || !searchInput) return;
    if (listaMaterialesCargada === null) { mostrarToast("Cargando materiales...", "info"); await fetchMateriales(); }
    if (listaMaterialesCargada === null || Object.keys(listaMaterialesCargada).length === 0) {
         mostrarToast("No hay materiales disponibles.", "warning"); return;
    }
    searchInput.value = ''; listaContainer.innerHTML = 'Cargando...'; 
    setTimeout(() => {
        listaContainer.innerHTML = ''; 
        for (const categoria in listaMaterialesCargada) {
            const categoriaDiv = document.createElement('div'); categoriaDiv.classList.add('modal-categoria');
            const titulo = document.createElement('div'); titulo.classList.add('modal-categoria-titulo'); titulo.textContent = categoria;
            categoriaDiv.appendChild(titulo);
            listaMaterialesCargada[categoria].forEach(item => {
                const itemDiv = document.createElement('div'); itemDiv.classList.add('modal-item');
                itemDiv.dataset.code = item.code; itemDiv.dataset.description = item.description;
                const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.id = `mat-${item.code}`; checkbox.value = item.code; checkbox.classList.add('modal-item-checkbox');
                const label = document.createElement('label'); label.htmlFor = `mat-${item.code}`;
                label.innerHTML = `<span class="item-code">${item.code}</span> - <span class="item-desc">${item.description}</span>`;
                itemDiv.appendChild(checkbox); itemDiv.appendChild(label); categoriaDiv.appendChild(itemDiv);
            });
            listaContainer.appendChild(categoriaDiv);
        }
        modal.classList.add('visible'); modal.style.display = 'flex'; searchInput.focus(); 
    }, 10); 
}
function cerrarModalMateriales() {
    const modal = document.getElementById('modalMateriales');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.querySelectorAll('.modal-item-checkbox').forEach(cb => cb.checked = false);
        }, 300); 
    }
}
function anadirMaterialesSeleccionados() {
    const modal = document.getElementById('modalMateriales');
    const textarea = document.getElementById('material');
    if (!modal || !textarea) return;
    let textoParaAnadir = Array.from(modal.querySelectorAll('.modal-item-checkbox:checked'))
        .map(cb => {
            const itemDiv = cb.closest('.modal-item');
            return itemDiv && itemDiv.dataset.code && itemDiv.dataset.description ? `${itemDiv.dataset.code} - ${itemDiv.dataset.description}` : '';
        })
        .filter(Boolean) 
        .join('\n');

    if (textoParaAnadir) {
        const valorActual = textarea.value.trim();
        textarea.value = valorActual + (valorActual ? '\n' : '') + textoParaAnadir;
        textarea.dispatchEvent(new Event('input'));
    }
    cerrarModalMateriales();
}
function filtrarModalMateriales() {
    const filter = document.getElementById('modalMaterialesSearchInput').value.toUpperCase().trim();
    const categorias = document.getElementById('modalMaterialesLista').getElementsByClassName('modal-categoria');
    for (let cat of categorias) {
        let categoriaVisible = false;
        const items = cat.getElementsByClassName('modal-item');
        for (let item of items) {
            const label = item.getElementsByTagName('label')[0];
            if (label) {
                const display = (filter === "" || (label.textContent || label.innerText).toUpperCase().indexOf(filter) > -1) ? "" : "none";
                item.style.display = display;
                if (display === "") categoriaVisible = true;
            }
        }
        cat.querySelector('.modal-categoria-titulo').style.display = categoriaVisible ? "" : "none";
    }
}
const debouncedFilterMateriales = debounce(filtrarModalMateriales, DEBOUNCE_DELAY);

// Modal Tipo Cirugía
async function abrirModalTipoCx() { 
    const modal = document.getElementById('modalTipoCx');
    const listaContainer = document.getElementById('modalTipoCxLista');
    const searchInput = document.getElementById('modalTipoCxSearchInput');
    if (!modal || !listaContainer || !searchInput) return;
    if (listaTiposCxCargada === null) { mostrarToast("Cargando tipos de cirugía...", "info"); await fetchTiposCirugia(); }
    if (!listaTiposCxCargada || listaTiposCxCargada.length === 0) {
        mostrarToast("No hay tipos de cirugía disponibles.", "warning"); return; 
    }
    searchInput.value = ''; listaContainer.innerHTML = ''; 
    listaTiposCxCargada.forEach(tipo => {
        const itemDiv = document.createElement('div'); itemDiv.classList.add('modal-item', 'tipo-cx-item'); 
        itemDiv.dataset.value = tipo; itemDiv.textContent = tipo;
        itemDiv.onclick = () => anadirTipoCxSeleccionado(tipo);
        listaContainer.appendChild(itemDiv);
    });
    modal.classList.add('visible'); modal.style.display = 'flex'; searchInput.focus(); 
}
function cerrarModalTipoCx() {
    const modal = document.getElementById('modalTipoCx');
    if (modal) { modal.classList.remove('visible'); setTimeout(() => { modal.style.display = 'none'; }, 300); }
}
function anadirTipoCxSeleccionado(tipoSeleccionado) {
    const inputTipoCx = document.getElementById('tipoCirugia');
    if (inputTipoCx) {
        inputTipoCx.value = tipoSeleccionado;
        inputTipoCx.dispatchEvent(new Event('input')); inputTipoCx.dispatchEvent(new Event('change')); 
        validarCampo(inputTipoCx);
    }
    cerrarModalTipoCx(); 
}
function filtrarModalTipoCx() {
    const filter = document.getElementById('modalTipoCxSearchInput').value.toUpperCase().trim();
    const items = document.getElementById('modalTipoCxLista').getElementsByClassName('tipo-cx-item'); 
    for (let item of items) {
        item.style.display = (filter === "" || (item.textContent || item.innerText).toUpperCase().indexOf(filter) > -1) ? "" : "none";
    }
}
const debouncedFilterTipoCx = debounce(filtrarModalTipoCx, DEBOUNCE_DELAY);

// Modal Cliente
async function abrirModalCliente() { 
    const modal = document.getElementById('modalCliente');
    const listaContainer = document.getElementById('modalClienteLista');
    const searchInput = document.getElementById('modalClienteSearchInput');
    if (!modal || !listaContainer || !searchInput) return;
    if (listaClientesCargada === null) { mostrarToast("Cargando clientes...", "info"); await fetchClientes(); }
    if (!listaClientesCargada || listaClientesCargada.length === 0) {
        mostrarToast("No hay clientes disponibles.", "warning"); return; 
    }
    searchInput.value = ''; listaContainer.innerHTML = ''; 
    listaClientesCargada.forEach(cliente => {
        const itemDiv = document.createElement('div'); itemDiv.classList.add('modal-item', 'cliente-item');
        itemDiv.dataset.value = cliente; itemDiv.textContent = cliente;
        itemDiv.onclick = () => anadirClienteSeleccionado(cliente);
        listaContainer.appendChild(itemDiv);
    });
    modal.classList.add('visible'); modal.style.display = 'flex'; searchInput.focus(); 
}
function cerrarModalCliente() {
    const modal = document.getElementById('modalCliente');
    if (modal) { modal.classList.remove('visible'); setTimeout(() => { modal.style.display = 'none'; }, 300); }
}
function anadirClienteSeleccionado(clienteSeleccionado) {
    const inputCliente = document.getElementById('cliente');
    if (inputCliente) {
        inputCliente.value = clienteSeleccionado;
        inputCliente.dispatchEvent(new Event('input')); inputCliente.dispatchEvent(new Event('change'));
        validarCampo(inputCliente);
    }
    cerrarModalCliente(); 
}
function filtrarModalCliente() {
    const filter = document.getElementById('modalClienteSearchInput').value.toUpperCase().trim();
    const items = document.getElementById('modalClienteLista').getElementsByClassName('cliente-item');
    for (let item of items) {
        item.style.display = (filter === "" || (item.textContent || item.innerText).toUpperCase().indexOf(filter) > -1) ? "" : "none";
    }
}
const debouncedFilterCliente = debounce(filtrarModalCliente, DEBOUNCE_DELAY);

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Cargado");
    Promise.all([ fetchClientes(), fetchTiposCirugia(), fetchMateriales() ])
    .then(() => {
        console.log("Datos maestros cargados.");
        cargarSugerenciasIniciales('cliente', 'clientesList'); 
        cargarSugerenciasIniciales('medico', 'medicosList');
        cargarSugerenciasIniciales('instrumentador', 'instrumentadoresList');
        cargarSugerenciasIniciales('lugarCirugia', 'lugaresList');
        cargarSugerenciasIniciales('tipoCirugia', 'tiposCirugiaList');
    });

    setupValidacion();

    try { // Setear fecha default
        const hoy = new Date(); const offset = hoy.getTimezoneOffset();
        const hoyLocal = new Date(hoy.getTime() - (offset*60*1000));
        const fechaISO = hoyLocal.toISOString().split('T')[0];
        const fechaInput = document.getElementById('fechaCirugia');
        if(fechaInput) { fechaInput.value = fechaISO; validarCampo(fechaInput); }
    } catch (e) { console.error("Error fecha default:", e); }

    if (retrySaveBtn) retrySaveBtn.addEventListener('click', reintentarGuardado);

    // Listeners para cerrar modales al hacer click fuera
    ['modalMateriales', 'modalTipoCx', 'modalCliente'].forEach(modalId => {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            modalElement.addEventListener('click', function(event) {
                if (event.target === this) { 
                    if (modalId === 'modalMateriales') cerrarModalMateriales();
                    else if (modalId === 'modalTipoCx') cerrarModalTipoCx();
                    else if (modalId === 'modalCliente') cerrarModalCliente();
                }
            });
        }
    });
    
    // Validar campos requeridos inicialmente
    ['paciente', 'cliente', 'medico'].forEach(id => {
        const input = document.getElementById(id);
        if (input && input.hasAttribute('required')) { validarCampo(input); }
    });
    console.log("App Districorr inicializada.");
});

// --- END OF FILE script.js ---
