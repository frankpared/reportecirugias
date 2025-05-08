// --- START OF FILE script.js ---

// Inicialización de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCFtuuSPCcQIkgDN_F1WRS4U-71pRNCf_E", // ¡ASEGÚRATE DE QUE ESTA SEA TU API KEY REAL!
  authDomain: "cirugia-reporte.firebaseapp.com",
  projectId: "cirugia-reporte",
  storageBucket: "cirugia-reporte.appspot.com",
  messagingSenderId: "698831567840",
  appId: "1:698831567840:web:fc6d6197f22beba4d88985",
  measurementId: "G-HD7ZLL1GLZ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

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
const DEBOUNCE_DELAY = 300; // ms
const COLECCION_CLIENTES = 'clientes'; // Nueva constante
const COLECCION_TIPOS_CX = 'tiposCirugia'; 
const COLECCION_MATERIALES = 'materiales'; 

// --- Variables Globales para Datos Cargados ---
let listaClientesCargada = null; // Nueva variable para clientes
let listaTiposCxCargada = null; 
let listaMaterialesCargada = null; 
let reportePendiente = null; 
let guardandoReporte = false; 

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

function setActionButtonsDisabled(disabled) {
    actionButtons.forEach(btn => {
        if (btn.id !== 'retry-save-btn') { 
            btn.disabled = disabled;
        }
    });
}

// --- Validación ---
function setupValidacion() {
    const camposRequeridos = ['paciente', 'cliente', 'medico', 'fechaCirugia']; // 'cliente' añadido
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
        console.warn("Formato de fecha inválido detectado:", input.value);
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
    const camposRequeridos = ['paciente', 'cliente', 'medico', 'fechaCirugia']; // 'cliente' añadido

    camposRequeridos.forEach(id => {
        const input = document.getElementById(id);
        if (input && !validarCampo(input)) { 
            esFormularioValido = false;
        }
    });

    if (!esFormularioValido) {
        mostrarToast('Por favor, complete todos los campos requeridos (*).', 'warning');
    }

    return esFormularioValido;
}

// --- Carga de Datos Maestros desde Firestore ---
async function fetchClientes() { // NUEVA FUNCIÓN
    if (listaClientesCargada !== null) return; 
    console.log("Fetching clientes...");
    listaClientesCargada = []; 
    try {
        const snapshot = await db.collection(COLECCION_CLIENTES).orderBy('nombre').get();
        listaClientesCargada = snapshot.docs.map(doc => doc.data().nombre);
        console.log(`Clientes cargados: ${listaClientesCargada.length}`);
    } catch (error) {
        console.error("Error fetching clientes:", error);
        mostrarToast("Error al cargar clientes desde DB.", "error");
        listaClientesCargada = []; 
    }
}

async function fetchTiposCirugia() {
    if (listaTiposCxCargada !== null) return; 
    console.log("Fetching tipos de cirugía...");
    listaTiposCxCargada = []; 
    try {
        const snapshot = await db.collection(COLECCION_TIPOS_CX).orderBy('nombre').get();
        listaTiposCxCargada = snapshot.docs.map(doc => doc.data().nombre);
        console.log(`Tipos de cirugía cargados: ${listaTiposCxCargada.length}`);
    } catch (error) {
        console.error("Error fetching tipos de cirugía:", error);
        mostrarToast("Error al cargar tipos de cirugía desde DB.", "error");
        listaTiposCxCargada = []; 
    }
}

async function fetchMateriales() {
    if (listaMaterialesCargada !== null) return; 
    console.log("Fetching materiales...");
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
        console.log(`Materiales cargados: ${Object.keys(listaMaterialesCargada).length} categorías.`);
    } catch (error) {
        console.error("Error fetching materiales:", error);
        mostrarToast("Error al cargar materiales desde DB.", "error");
        listaMaterialesCargada = {}; 
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
            actualizarListaDatalist(datalistElement, valoresUnicos.sort());
        } else {
            console.log(`No hay sugerencias iniciales para ${campo} o el documento no existe.`);
            datalistElement.innerHTML = ''; 
        }
    } catch (error) {
        console.error(`Error cargando sugerencias para ${campo}:`, error);
    }
}

async function guardarSugerencia(campo, valor) {
    if (!valor || valor.trim().length < 3) return; 
    const valorLimpio = valor.trim();
    const docRef = db.collection(COLECCION_SUGERENCIAS).doc(campo);

    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            let valores = [];
            if (doc.exists && doc.data().valores) {
                valores = doc.data().valores;
            }
            if (!valores.includes(valorLimpio)) {
                valores.push(valorLimpio);
                transaction.set(docRef, { valores: valores }, { merge: true }); 
                console.log(`Sugerencia '${valorLimpio}' añadida/actualizada para ${campo}.`);

                const datalistElement = document.getElementById(`${campo}List`); 
                if (datalistElement) {
                     actualizarListaDatalist(datalistElement, [...new Set(valores)].sort());
                }
            }
        });
    } catch (error) {
        console.error(`Error guardando sugerencia para ${campo}:`, error);
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
// --- START OF FILE script.js ---

// Inicialización de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCFtuuSPCcQIkgDN_F1WRS4U-71pRNCf_E", // ¡ASEGÚRATE DE QUE ESTA SEA TU API KEY REAL!
  authDomain: "cirugia-reporte.firebaseapp.com",
  projectId: "cirugia-reporte",
  storageBucket: "cirugia-reporte.appspot.com",
  messagingSenderId: "698831567840",
  appId: "1:698831567840:web:fc6d6197f22beba4d88985",
  measurementId: "G-HD7ZLL1GLZ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

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
const DEBOUNCE_DELAY = 300; // ms
const COLECCION_CLIENTES = 'clientes'; // Nueva constante
const COLECCION_TIPOS_CX = 'tiposCirugia'; 
const COLECCION_MATERIALES = 'materiales'; 

// --- Variables Globales para Datos Cargados ---
let listaClientesCargada = null; // Nueva variable para clientes
let listaTiposCxCargada = null; 
let listaMaterialesCargada = null; 
let reportePendiente = null; 
let guardandoReporte = false; 

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

function setActionButtonsDisabled(disabled) {
    actionButtons.forEach(btn => {
        if (btn.id !== 'retry-save-btn') { 
            btn.disabled = disabled;
        }
    });
}

// --- Validación ---
function setupValidacion() {
    const camposRequeridos = ['paciente', 'cliente', 'medico', 'fechaCirugia']; // 'cliente' añadido
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
        console.warn("Formato de fecha inválido detectado:", input.value);
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
    const camposRequeridos = ['paciente', 'cliente', 'medico', 'fechaCirugia']; // 'cliente' añadido

    camposRequeridos.forEach(id => {
        const input = document.getElementById(id);
        if (input && !validarCampo(input)) { 
            esFormularioValido = false;
        }
    });

    if (!esFormularioValido) {
        mostrarToast('Por favor, complete todos los campos requeridos (*).', 'warning');
    }

    return esFormularioValido;
}

// --- Carga de Datos Maestros desde Firestore ---
async function fetchClientes() { // NUEVA FUNCIÓN
    if (listaClientesCargada !== null) return; 
    console.log("Fetching clientes...");
    listaClientesCargada = []; 
    try {
        const snapshot = await db.collection(COLECCION_CLIENTES).orderBy('nombre').get();
        listaClientesCargada = snapshot.docs.map(doc => doc.data().nombre);
        console.log(`Clientes cargados: ${listaClientesCargada.length}`);
    } catch (error) {
        console.error("Error fetching clientes:", error);
        mostrarToast("Error al cargar clientes desde DB.", "error");
        listaClientesCargada = []; 
    }
}

async function fetchTiposCirugia() {
    if (listaTiposCxCargada !== null) return; 
    console.log("Fetching tipos de cirugía...");
    listaTiposCxCargada = []; 
    try {
        const snapshot = await db.collection(COLECCION_TIPOS_CX).orderBy('nombre').get();
        listaTiposCxCargada = snapshot.docs.map(doc => doc.data().nombre);
        console.log(`Tipos de cirugía cargados: ${listaTiposCxCargada.length}`);
    } catch (error) {
        console.error("Error fetching tipos de cirugía:", error);
        mostrarToast("Error al cargar tipos de cirugía desde DB.", "error");
        listaTiposCxCargada = []; 
    }
}

async function fetchMateriales() {
    if (listaMaterialesCargada !== null) return; 
    console.log("Fetching materiales...");
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
        console.log(`Materiales cargados: ${Object.keys(listaMaterialesCargada).length} categorías.`);
    } catch (error) {
        console.error("Error fetching materiales:", error);
        mostrarToast("Error al cargar materiales desde DB.", "error");
        listaMaterialesCargada = {}; 
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
            actualizarListaDatalist(datalistElement, valoresUnicos.sort());
        } else {
            console.log(`No hay sugerencias iniciales para ${campo} o el documento no existe.`);
            datalistElement.innerHTML = ''; 
        }
    } catch (error) {
        console.error(`Error cargando sugerencias para ${campo}:`, error);
    }
}

async function guardarSugerencia(campo, valor) {
    if (!valor || valor.trim().length < 3) return; 
    const valorLimpio = valor.trim();
    const docRef = db.collection(COLECCION_SUGERENCIAS).doc(campo);

    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            let valores = [];
            if (doc.exists && doc.data().valores) {
                valores = doc.data().valores;
            }
            if (!valores.includes(valorLimpio)) {
                valores.push(valorLimpio);
                transaction.set(docRef, { valores: valores }, { merge: true }); 
                console.log(`Sugerencia '${valorLimpio}' añadida/actualizada para ${campo}.`);

                const datalistElement = document.getElementById(`${campo}List`); 
                if (datalistElement) {
                     actualizarListaDatalist(datalistElement, [...new Set(valores)].sort());
                }
            }
        });
    } catch (error) {
        console.error(`Error guardando sugerencia para ${campo}:`, error);
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
function obtenerDatos() {
    return {
        formato: document.getElementById('formato')?.value || 'formal',
        mensajeInicio: document.getElementById('mensajeInicio')?.value || '',
        paciente: document.getElementById('paciente')?.value.trim() || '',
        cliente: document.getElementById('cliente')?.value.trim() || '', // NUEVO: Obtener cliente
        medico: document.getElementById('medico')?.value.trim() || '',
        instrumentador: document.getElementById('instrumentador')?.value.trim() || '',
        lugarCirugia: document.getElementById('lugarCirugia')?.value.trim() || '',
        fechaCirugia: document.getElementById('fechaCirugia')?.value || '',
        tipoCirugia: document.getElementById('tipoCirugia')?.value.trim() || '',
        material: document.getElementById('material')?.value.trim() || '',
        observaciones: document.getElementById('observaciones')?.value.trim() || '',
        infoAdicional: document.getElementById('infoAdicional')?.value.trim() || '',
    };
}

function formatearMaterialParaHTML(materialTexto) {
    if (!materialTexto) return '<p>No especificado.</p>';

    const lineas = materialTexto.split('\n').filter(linea => linea.trim() !== '');
    if (lineas.length === 0) return '<p>No especificado.</p>';

    let tablaHTML = '<table class="material-table">';
    lineas.forEach(linea => {
        tablaHTML += `<tr><td>${linea.trim()}</td></tr>`;
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
        return fecha.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        console.error("Error formateando fecha:", e);
        return fechaISO; 
    }
}

// --- Acciones Principales ---
function generarTexto() {
    console.log("Intentando generar texto..."); 
    if (!validarFormulario()) {
        console.log("Validación fallida.");
        // El toast de error de validación se muestra dentro de validarFormulario()
        return;
    }
    console.log("Validación pasada.");

    const datos = obtenerDatos();
    const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia);
    const contenidoMaterialHTML = formatearMaterialParaHTML(datos.material);
    const fraseFinal = "\n\nSaludos, quedo al pendiente.";

    const reporteHTML = `
      <div class="reporte-contenido reporte-box">
        <img src="https://i.imgur.com/aA7RzTN.png" alt="Logo Districorr" style="max-height: 70px; margin-bottom: 12px; display: block; margin: 0 auto;">
        <h3>📝 Reporte de Cirugía</h3>
        <p>${datos.mensajeInicio || 'Detalles de la cirugía programada:'}</p>
        <ul>
          <li><strong>Paciente:</strong> ${datos.paciente || 'No especificado'}</li>
          <li><strong>Cliente:</strong> ${datos.cliente || 'No especificado'}</li> <!-- NUEVO: Mostrar cliente -->
          <li><strong>Tipo de Cirugía:</strong> ${datos.tipoCirugia || 'No especificado'}</li>
          <li><strong>Médico Responsable:</strong> ${datos.medico || 'No especificado'}</li>
          <li><strong>Instrumentador:</strong> ${datos.instrumentador || 'No especificado'}</li>
          <li><strong>Fecha de Cirugía:</strong> ${fechaFormateada}</li>
          <li><strong>Lugar:</strong> ${datos.lugarCirugia || 'No especificado'}</li>
        </ul>
        <h4>Material Requerido:</h4>
        ${contenidoMaterialHTML}
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
        console.log("Reporte HTML generado y mostrado.");
    } else {
        console.error("Elemento 'resultado-container' no encontrado.");
        mostrarToast('❌ Error interno: No se pudo mostrar el reporte.', 'error');
    }
}

async function copiarTexto() {
    if (!validarFormulario()) return;
    if (guardandoReporte) {
        mostrarToast("Espere, guardado anterior en proceso...", "info");
        return;
    }

    ocultarBotonReintento(); 

    const resultadoContainer = document.getElementById('resultado-container');
    const reporteContenidoElement = resultadoContainer.querySelector('.reporte-contenido');

    if (!reporteContenidoElement || resultadoContainer.style.display === 'none') {
        generarTexto();
        const nuevoReporteElement = document.getElementById('resultado-container').querySelector('.reporte-contenido');
        if (!nuevoReporteElement) {
             mostrarToast('Primero debe generar un reporte. Click en "📝 Generar Texto".', 'warning');
             return;
        }
        await copiarYGuardarInterno(nuevoReporteElement);
    } else {
         await copiarYGuardarInterno(reporteContenidoElement);
    }
}

async function copiarYGuardarInterno(reporteElement) {
    if (guardandoReporte) return; 
    guardandoReporte = true;
    loadingIndicator.style.display = 'block';
    setActionButtonsDisabled(true);
    ocultarBotonReintento();

    const datosParaGuardar = obtenerDatos(); 
    const textoPlanoParaCopiar = reporteElement.innerText;

    let copiadoExitoso = false;
    let guardadoExitoso = false;

    try {
        await navigator.clipboard.writeText(textoPlanoParaCopiar);
        copiadoExitoso = true;
        console.log('Texto del reporte copiado al portapapeles.');
    } catch (err) {
        console.error('Error al copiar texto al portapapeles:', err);
    }

    try {
        await guardarEnFirebase(datosParaGuardar);
        guardadoExitoso = true;
        console.log('Reporte guardado en Firestore.');
        reportePendiente = null; 
        ocultarBotonReintento();
    } catch (err) {
        console.error('Fallo en la operación de guardado iniciada por copiarTexto:', err);
    }

    if (copiadoExitoso && guardadoExitoso) {
        mostrarToast('✅ Texto copiado y reporte guardado!', 'success');
    } else if (copiadoExitoso && !guardadoExitoso) {
        mostrarToast('⚠️ Texto copiado, pero falló el guardado. Revise la consola.', 'warning');
    } else if (!copiadoExitoso && guardadoExitoso) {
        mostrarToast('⚠️ Reporte guardado, pero falló la copia. Revise la consola.', 'warning');
    } else {
        mostrarToast('❌ Falló la copia y el guardado. Revise la consola.', 'error');
    }

    if (!reportePendiente) {
        loadingIndicator.style.display = 'none';
        setActionButtonsDisabled(false);
    }
    guardandoReporte = false;
}


function obtenerUsuarioId() {
    let userId = localStorage.getItem(LOCALSTORAGE_USER_ID);
    if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        try {
            localStorage.setItem(LOCALSTORAGE_USER_ID, userId);
        } catch (e) {
            console.warn("No se pudo guardar el ID de usuario en localStorage:", e);
        }
    }
    return userId;
}

async function guardarEnFirebase(data) {
    guardandoReporte = true; 
    loadingIndicator.style.display = 'block';
    setActionButtonsDisabled(true);
    ocultarBotonReintento();
    
    // Validación actualizada para incluir cliente
    if (!data || !data.paciente || !data.cliente || !data.medico || !data.fechaCirugia) { 
        mostrarToast('Faltan datos requeridos (Paciente, Cliente, Médico, Fecha).', 'error');
        loadingIndicator.style.display = 'none';
        setActionButtonsDisabled(false);
        guardandoReporte = false;
        throw new Error("Datos insuficientes para guardar el reporte.");
    }
    const reporte = {
        ...data, 
        timestamp: firebase.firestore.FieldValue.serverTimestamp(), 
        usuario: obtenerUsuarioId() 
    };

    try {
        const docRef = await db.collection(COLECCION_REPORTES).add(reporte);
        console.log("Reporte guardado con ID: ", docRef.id);

        // Guardar sugerencias
        await guardarSugerencia('cliente', data.cliente); // NUEVO: Guardar sugerencia para cliente
        await guardarSugerencia('medico', data.medico);
        await guardarSugerencia('instrumentador', data.instrumentador);
        await guardarSugerencia('lugarCirugia', data.lugarCirugia);
        await guardarSugerencia('tipoCirugia', data.tipoCirugia);
        
        reportePendiente = null; 
        ocultarBotonReintento();
        return docRef.id; 

    } catch (error) {
        console.error("Error al guardar reporte en Firebase: ", error);
        if (error.code === 'unavailable' || error.code === 'cancelled' || error.message.includes('offline')) {
            reportePendiente = data; 
            mostrarToast('⚠️ Falló el guardado (posible red). Puede reintentar.', 'warning');
            mostrarBotonReintento();
        } else {
            mostrarToast(`❌ Error al guardar: ${error.message}`, 'error');
            reportePendiente = null; 
            ocultarBotonReintento();
        }
        throw error; 
    } finally {
        if (!reportePendiente) {
            loadingIndicator.style.display = 'none';
            setActionButtonsDisabled(false);
        }
        guardandoReporte = false; 
    }
}
// --- Funciones Auxiliares y de Interfaz ---
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = mensaje;
    toast.className = 'toast-notification'; 
    toast.classList.add(tipo); 

    toast.style.display = 'block';
    void toast.offsetWidth;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300); 
    }, 4000); 
}

function mostrarBotonReintento() {
    if (retrySaveBtn) {
        retrySaveBtn.style.display = 'inline-block';
        loadingIndicator.style.display = 'none';
        setActionButtonsDisabled(false);
    }
}

function ocultarBotonReintento() {
    if (retrySaveBtn) {
        retrySaveBtn.style.display = 'none';
    }
}

function reintentarGuardado() {
    if (reportePendiente) {
        console.log("Reintentando guardar reporte pendiente...");
        guardarEnFirebase(reportePendiente)
            .then(() => {
                mostrarToast("✅ Reporte guardado exitosamente tras reintento.", "success");
                reportePendiente = null; 
                ocultarBotonReintento();
            })
            .catch(err => {
                console.error("Reintento de guardado falló:", err);
            });
    } else {
        console.warn("Se intentó reintentar sin un reporte pendiente.");
        ocultarBotonReintento(); 
    }
}

// --- Otras Acciones ---
function compartirWhatsApp() {
    if (!validarFormulario()) return;
    const resultadoContainer = document.getElementById('resultado-container');
    const reporteContenidoElement = resultadoContainer.querySelector('.reporte-contenido');

    if (!reporteContenidoElement || resultadoContainer.style.display === 'none') {
        generarTexto();
        const nuevoReporteElement = document.getElementById('resultado-container').querySelector('.reporte-contenido');
        if (!nuevoReporteElement) {
            mostrarToast('Primero genere un reporte para compartir.', 'warning');
            return;
        }
        const textoPlano = `*Reporte de Cirugía Districorr*\n\n${nuevoReporteElement.innerText}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoPlano)}`;
        window.open(whatsappUrl, '_blank');

    } else {
        const textoPlano = `*Reporte de Cirugía Districorr*\n\n${reporteContenidoElement.innerText}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoPlano)}`;
        window.open(whatsappUrl, '_blank');
    }
}

function enviarPorEmail() {
     if (!validarFormulario()) return;
    const resultadoContainer = document.getElementById('resultado-container');
    let reporteContenidoElement = resultadoContainer.querySelector('.reporte-contenido');

    if (!reporteContenidoElement || resultadoContainer.style.display === 'none') {
        generarTexto();
        reporteContenidoElement = document.getElementById('resultado-container').querySelector('.reporte-contenido');
        if (!reporteContenidoElement) {
            mostrarToast('Primero genere un reporte para enviar.', 'warning');
            return;
        }
    }

    const datos = obtenerDatos();
    const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia);
    const subject = `Reporte Cirugía: ${datos.paciente} - Cliente: ${datos.cliente} (${fechaFormateada})`; // Asunto incluye cliente

    let body = reporteContenidoElement.innerText;
    body += `\n\n--\nGenerado con App Districorr`;

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink; 
}

function imprimirReporte() {
    const resultadoContainer = document.getElementById('resultado-container');
    if (!resultadoContainer.querySelector('.reporte-contenido') || resultadoContainer.style.display === 'none') {
        mostrarToast('Primero genere un reporte para imprimir.', 'warning');
        return;
    }
    const contenidoParaImprimir = resultadoContainer.querySelector('.reporte-contenido').cloneNode(true);
    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
        <html>
        <head>
            <title>Imprimir Reporte</title>
            <link rel="stylesheet" href="style.css">
            <style>
                body { padding: 20px; background-color: #fff; }
                .reporte-box {
                    box-shadow: none;
                    border: 1px solid #ccc;
                    border-left: 5px solid #007bff; 
                    margin: 0; 
                    max-width: 100%;
                }
                button, .btn-link, .btn-volver, .modal-overlay, .toast-notification, .credit, header, .form-group, .text-center, #loading-indicator, #retry-save-btn {
                    display: none !important;
                }
                @media print {
                    body { padding: 0; } 
                    .reporte-box { border: none; border-left: 5px solid #007bff;}
                }
            </style>
        </head>
        <body>
    `);
    ventanaImpresion.document.body.appendChild(contenidoParaImprimir);
    ventanaImpresion.document.write('</body></html>');
    ventanaImpresion.document.close(); 
    ventanaImpresion.onload = function() {
        ventanaImpresion.focus(); 
        ventanaImpresion.print();
        setTimeout(() => { ventanaImpresion.close(); }, 500);
    };
}

async function generarImagen() {
    const { jsPDF } = window.jspdf; 
    const html2canvas = window.html2canvas;

    if (typeof html2canvas === 'undefined' || typeof jsPDF === 'undefined') {
        mostrarToast('❌ Error: Librerías jsPDF o html2canvas no cargadas.', 'error');
        console.error("jsPDF o html2canvas no están definidos.");
        return;
    }

    const reporteElement = document.getElementById('resultado-container')?.querySelector('.reporte-contenido');
    if (!reporteElement || document.getElementById('resultado-container').style.display === 'none') {
        mostrarToast('Primero genere un reporte para guardar como imagen.', 'warning');
        return;
    }

    mostrarToast('🖼️ Generando imagen... por favor espere.', 'info');

    try {
        const canvas = await html2canvas(reporteElement, {
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff' 
        });
        const link = document.createElement('a');
        link.download = `reporte_cirugia_${obtenerDatos().paciente || 'paciente'}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png'); 
        link.click(); 
        mostrarToast('✅ Imagen PNG descargada.', 'success');
    } catch (error) {
        console.error('Error generando la imagen:', error);
        mostrarToast('❌ Error al generar la imagen. Ver consola.', 'error');
    }
}


// --- Funciones para Modales ---

// Modal Materiales
async function abrirModalMateriales() { 
    const modal = document.getElementById('modalMateriales');
    const listaContainer = document.getElementById('modalMaterialesLista');
    const searchInput = document.getElementById('modalMaterialesSearchInput');

    if (!modal || !listaContainer || !searchInput) {
        console.error("Elementos del modal de materiales no encontrados.");
        return;
    }

    if (listaMaterialesCargada === null) {
        mostrarToast("Cargando lista de materiales...", "info");
        await fetchMateriales(); 
    }
    if (listaMaterialesCargada === null || Object.keys(listaMaterialesCargada).length === 0) {
         mostrarToast("No hay materiales disponibles o hubo un error al cargarlos.", "warning");
         return;
    }

    searchInput.value = ''; 
    listaContainer.innerHTML = 'Cargando...'; 

    setTimeout(() => {
        listaContainer.innerHTML = ''; 
        for (const categoria in listaMaterialesCargada) {
                const categoriaDiv = document.createElement('div');
                categoriaDiv.classList.add('modal-categoria');
                const titulo = document.createElement('div');
                titulo.classList.add('modal-categoria-titulo');
                titulo.textContent = categoria;
                categoriaDiv.appendChild(titulo);
                listaMaterialesCargada[categoria].forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.classList.add('modal-item');
                    itemDiv.dataset.code = item.code; 
                    itemDiv.dataset.description = item.description;
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `mat-${item.code}`; 
                    checkbox.value = item.code;
                    checkbox.classList.add('modal-item-checkbox');
                    const label = document.createElement('label');
                    label.htmlFor = `mat-${item.code}`;
                    label.innerHTML = `<span class="item-code">${item.code}</span> - <span class="item-desc">${item.description}</span>`;
                    itemDiv.appendChild(checkbox);
                    itemDiv.appendChild(label);
                    categoriaDiv.appendChild(itemDiv);
                });
                listaContainer.appendChild(categoriaDiv);
        }
        modal.classList.add('visible');
        modal.style.display = 'flex'; 
        searchInput.focus(); 
    }, 10); 
}

function cerrarModalMateriales() {
    const modal = document.getElementById('modalMateriales');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
            const checkboxes = modal.querySelectorAll('.modal-item-checkbox');
            checkboxes.forEach(cb => cb.checked = false);
        }, 300); 
    }
}

function anadirMaterialesSeleccionados() {
    const modal = document.getElementById('modalMateriales');
    const textarea = document.getElementById('material');
    if (!modal || !textarea) return;

    const checkboxesSeleccionados = modal.querySelectorAll('.modal-item-checkbox:checked');
    let textoParaAnadir = '';

    checkboxesSeleccionados.forEach(cb => {
        const itemDiv = cb.closest('.modal-item'); 
        if (itemDiv && itemDiv.dataset.code && itemDiv.dataset.description) {
            textoParaAnadir += `${itemDiv.dataset.code} - ${itemDiv.dataset.description}\n`;
        }
    });

    if (textoParaAnadir) {
        const valorActual = textarea.value.trim();
        textarea.value = valorActual + (valorActual ? '\n' : '') + textoParaAnadir.trim();
        textarea.dispatchEvent(new Event('input'));
    }
    cerrarModalMateriales();
}

function filtrarModalMateriales() {
    const input = document.getElementById('modalMaterialesSearchInput');
    const filter = input.value.toUpperCase().trim(); 
    const listaContainer = document.getElementById('modalMaterialesLista');
    const categorias = listaContainer.getElementsByClassName('modal-categoria');

    for (let i = 0; i < categorias.length; i++) {
        const items = categorias[i].getElementsByClassName('modal-item');
        let categoriaVisible = false; 

        for (let j = 0; j < items.length; j++) {
            const label = items[j].getElementsByTagName('label')[0];
            if (label) {
                const txtValue = label.textContent || label.innerText;
                if (filter === "" || txtValue.toUpperCase().indexOf(filter) > -1) {
                    items[j].style.display = ""; 
                    categoriaVisible = true; 
                } else {
                    items[j].style.display = "none"; 
                }
            }
        }
        const titulo = categorias[i].querySelector('.modal-categoria-titulo');
        if (titulo) {
            titulo.style.display = categoriaVisible ? "" : "none";
        }
    }
}
const debouncedFilterMateriales = debounce(filtrarModalMateriales, DEBOUNCE_DELAY);

// Modal Tipo Cirugía
async function abrirModalTipoCx() { 
    const modal = document.getElementById('modalTipoCx');
    const listaContainer = document.getElementById('modalTipoCxLista');
    const searchInput = document.getElementById('modalTipoCxSearchInput');

    if (!modal || !listaContainer || !searchInput) {
        console.error("Elementos del modal de Tipo Cx no encontrados.");
        return;
    }
    if (listaTiposCxCargada === null) {
        mostrarToast("Cargando tipos de cirugía...", "info");
        await fetchTiposCirugia(); 
    }
    if (!listaTiposCxCargada || listaTiposCxCargada.length === 0) {
        mostrarToast("No hay tipos de cirugía disponibles o hubo un error al cargarlos.", "warning");
        return; 
    }
    searchInput.value = ''; 
    listaContainer.innerHTML = ''; 
    listaTiposCxCargada.forEach(tipo => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('modal-item', 'tipo-cx-item'); 
            itemDiv.dataset.value = tipo; 
            itemDiv.textContent = tipo;
            itemDiv.onclick = function() {
                anadirTipoCxSeleccionado(tipo);
            };
            listaContainer.appendChild(itemDiv);
        });
    modal.classList.add('visible');
    modal.style.display = 'flex';
    searchInput.focus(); 
}

function cerrarModalTipoCx() {
    const modal = document.getElementById('modalTipoCx');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); 
    }
}

function anadirTipoCxSeleccionado(tipoSeleccionado) {
    const inputTipoCx = document.getElementById('tipoCirugia');
    if (inputTipoCx) {
        inputTipoCx.value = tipoSeleccionado;
        inputTipoCx.dispatchEvent(new Event('input'));
        inputTipoCx.dispatchEvent(new Event('change')); 
        validarCampo(inputTipoCx); // Validar después de seleccionar
    }
    cerrarModalTipoCx(); 
}

function filtrarModalTipoCx() {
    const input = document.getElementById('modalTipoCxSearchInput');
    const filter = input.value.toUpperCase().trim();
    const listaContainer = document.getElementById('modalTipoCxLista');
    const items = listaContainer.getElementsByClassName('tipo-cx-item'); 
    for (let i = 0; i < items.length; i++) {
        const txtValue = items[i].textContent || items[i].innerText;
        if (filter === "" || txtValue.toUpperCase().indexOf(filter) > -1) {
            items[i].style.display = "";
        } else {
            items[i].style.display = "none";
        }
    }
}
const debouncedFilterTipoCx = debounce(filtrarModalTipoCx, DEBOUNCE_DELAY);


// --- Modal Cliente (NUEVAS FUNCIONES) ---
async function abrirModalCliente() { 
    const modal = document.getElementById('modalCliente');
    const listaContainer = document.getElementById('modalClienteLista');
    const searchInput = document.getElementById('modalClienteSearchInput');

    if (!modal || !listaContainer || !searchInput) {
        console.error("Elementos del modal de Cliente no encontrados.");
        return;
    }

    if (listaClientesCargada === null) {
        mostrarToast("Cargando lista de clientes...", "info");
        await fetchClientes(); 
    }
    if (!listaClientesCargada || listaClientesCargada.length === 0) {
        mostrarToast("No hay clientes disponibles o hubo un error al cargarlos.", "warning");
        return; 
    }

    searchInput.value = ''; 
    listaContainer.innerHTML = ''; 

    listaClientesCargada.forEach(cliente => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('modal-item', 'cliente-item'); // Clase específica
            itemDiv.dataset.value = cliente; 
            itemDiv.textContent = cliente;
            itemDiv.onclick = function() {
                anadirClienteSeleccionado(cliente);
            };
            listaContainer.appendChild(itemDiv);
        });

    modal.classList.add('visible');
    modal.style.display = 'flex';
    searchInput.focus(); 
}

function cerrarModalCliente() {
    const modal = document.getElementById('modalCliente');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); 
    }
}

function anadirClienteSeleccionado(clienteSeleccionado) {
    const inputCliente = document.getElementById('cliente');
    if (inputCliente) {
        inputCliente.value = clienteSeleccionado;
        inputCliente.dispatchEvent(new Event('input'));
        inputCliente.dispatchEvent(new Event('change'));
        validarCampo(inputCliente); // Validar el campo después de la selección
    }
    cerrarModalCliente(); 
}

function filtrarModalCliente() {
    const input = document.getElementById('modalClienteSearchInput');
    const filter = input.value.toUpperCase().trim();
    const listaContainer = document.getElementById('modalClienteLista');
    const items = listaContainer.getElementsByClassName('cliente-item'); // Usar clase específica

    for (let i = 0; i < items.length; i++) {
        const txtValue = items[i].textContent || items[i].innerText;
        if (filter === "" || txtValue.toUpperCase().indexOf(filter) > -1) {
            items[i].style.display = "";
        } else {
            items[i].style.display = "none";
        }
    }
}
const debouncedFilterCliente = debounce(filtrarModalCliente, DEBOUNCE_DELAY);
// --- FIN Modal Cliente ---

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM completamente cargado y parseado.");

    fetchClientes(); // Iniciar carga de clientes
    fetchTiposCirugia();
    fetchMateriales();

    cargarSugerenciasIniciales('cliente', 'clientesList'); // Cargar sugerencias para datalist de cliente
    cargarSugerenciasIniciales('medico', 'medicosList');
    cargarSugerenciasIniciales('instrumentador', 'instrumentadoresList');
    cargarSugerenciasIniciales('lugarCirugia', 'lugaresList');
    cargarSugerenciasIniciales('tipoCirugia', 'tiposCirugiaList'); // Este ya estaba, pero es bueno tenerlo cerca

    setupValidacion();

    try {
        const hoy = new Date();
        const offset = hoy.getTimezoneOffset();
        const hoyLocal = new Date(hoy.getTime() - (offset*60*1000));
        const fechaISO = hoyLocal.toISOString().split('T')[0];
        const fechaInput = document.getElementById('fechaCirugia');
        if(fechaInput) {
            fechaInput.value = fechaISO;
             validarCampo(fechaInput); // Validar la fecha inicial
        }
    } catch (e) {
        console.error("Error estableciendo fecha por defecto:", e);
    }

    if (retrySaveBtn) {
        retrySaveBtn.addEventListener('click', reintentarGuardado);
    }

    // Listeners para cerrar modales
    const modals = ['modalMateriales', 'modalTipoCx', 'modalCliente'];
    modals.forEach(modalId => {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            modalElement.addEventListener('click', function(event) {
                if (event.target === this) { // Si el clic fue en el overlay
                    if (modalId === 'modalMateriales') cerrarModalMateriales();
                    else if (modalId === 'modalTipoCx') cerrarModalTipoCx();
                    else if (modalId === 'modalCliente') cerrarModalCliente();
                }
            });
        }
    });
    
    // Validar todos los campos requeridos al cargar para mostrar mensajes si están vacíos inicialmente
    // (Excepto fecha, que ya se valida al setearse)
    ['paciente', 'cliente', 'medico'].forEach(id => {
        const input = document.getElementById(id);
        if (input && input.value.trim() === '') { // Si está vacío y es requerido
             validarCampo(input); // Ejecutar validación para mostrar el error
        }
    });


    console.log("Aplicación de Reportes Districorr inicializada.");
});

// --- END OF FILE script.js ---
