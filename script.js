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
const COLECCION_CLIENTES = 'clientes';
const COLECCION_TIPOS_CX = 'tiposCirugia';
const COLECCION_MATERIALES = 'materiales';
const LOCALSTORAGE_USER_ID = 'usuarioId';
const LOCALSTORAGE_ULTIMO_REPORTE = 'ultimoReporteDistricorr'; // NUEVA CONSTANTE
const DEBOUNCE_DELAY = 250; // Reducido para respuesta más rápida en modales

// --- Variables Globales para Datos Cargados ---
let listaClientesCargada = null; 
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

// --- Referencias a Elementos DOM ---
const reporteForm = document.getElementById('reporteForm'); // Para limpiar/cargar
const loadingIndicator = document.getElementById('loading-indicator');
const retrySaveBtn = document.getElementById('retry-save-btn');
const actionButtons = document.querySelectorAll('.text-center button, .text-center a');
const btnCargarUltimo = document.getElementById('btnCargarUltimo');

function setActionButtonsDisabled(disabled) {
    actionButtons.forEach(btn => {
        if (btn.id !== 'retry-save-btn') {
            btn.disabled = disabled;
        }
    });
}

// --- Limpiar Formulario y Cargar Último Reporte ---
function limpiarFormulario(confirmar = true) {
    if (confirmar && !confirm("¿Está seguro de que desea limpiar todos los campos del formulario?")) {
        return;
    }
    if (reporteForm) {
        reporteForm.reset(); // Resetea el form a sus valores iniciales (incluidos selects)
        // Los campos de fecha y los que tienen validación visual podrían necesitar limpieza manual de clases
        const camposConError = reporteForm.querySelectorAll('.campo-invalido');
        camposConError.forEach(campo => campo.classList.remove('campo-invalido'));
        const mensajesError = reporteForm.querySelectorAll('.mensaje-error');
        mensajesError.forEach(msg => msg.style.display = 'none');
        
        // Resetear fecha a hoy (si es la lógica deseada)
        try {
            const hoy = new Date();
            const offset = hoy.getTimezoneOffset();
            const hoyLocal = new Date(hoy.getTime() - (offset*60*1000));
            const fechaISO = hoyLocal.toISOString().split('T')[0];
            const fechaInput = document.getElementById('fechaCirugia');
            if(fechaInput) fechaInput.value = fechaISO;
        } catch (e) { console.error("Error reseteando fecha:", e); }

        document.getElementById('resultado-container').style.display = 'none';
        document.getElementById('resultado-container').innerHTML = '';
        mostrarToast('Formulario limpiado.', 'info');
    }
}

function guardarUltimoReporteStorage(data) {
    try {
        // No guardar campos vacíos o por defecto innecesariamente
        const reporteParaGuardar = { ...data };
        // Omitir campos que no queremos persistir o que son demasiado largos/variables
        delete reporteParaGuardar.material; 
        delete reporteParaGuardar.observaciones;
        delete reporteParaGuardar.infoAdicional;
        
        localStorage.setItem(LOCALSTORAGE_ULTIMO_REPORTE, JSON.stringify(reporteParaGuardar));
        if (btnCargarUltimo) btnCargarUltimo.disabled = false;
        console.log("Último reporte guardado en localStorage.");
    } catch (e) {
        console.warn("Error guardando último reporte en localStorage:", e);
    }
}

function cargarUltimoReporteStorage() {
    try {
        const ultimoReporteJSON = localStorage.getItem(LOCALSTORAGE_ULTIMO_REPORTE);
        if (ultimoReporteJSON) {
            const ultimoReporte = JSON.parse(ultimoReporteJSON);
            if (confirm("¿Desea cargar los datos del último reporte guardado? Se sobrescribirán los campos actuales.")) {
                Object.keys(ultimoReporte).forEach(key => {
                    const input = document.getElementById(key);
                    if (input) {
                        input.value = ultimoReporte[key] || ''; // Asignar valor o vacío
                        validarCampo(input); // Re-validar por si acaso
                    }
                });
                // Campos especiales que no están en el form directo o necesitan trato especial:
                // Por ej. Fecha (ya está en el objeto)
                // Material, observaciones, etc., no se guardan para no sobrecargar.
                mostrarToast('Datos del último reporte cargados.', 'success');
            }
        } else {
            mostrarToast('No hay datos de último reporte para cargar.', 'info');
            if (btnCargarUltimo) btnCargarUltimo.disabled = true;
        }
    } catch (e) {
        console.error("Error cargando último reporte desde localStorage:", e);
        mostrarToast('Error al cargar datos del último reporte.', 'error');
    }
}


// --- Validación ---
function setupValidacion() {
    const camposRequeridos = ['cliente', 'paciente', 'medico', 'fechaCirugia'];
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
    if (!input) return true; // Si el input no existe, no validar

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
    const camposRequeridos = ['cliente', 'paciente', 'medico', 'fechaCirugia']; 
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
async function fetchClientes() { 
    if (listaClientesCargada !== null) return;
    listaClientesCargada = [];
    try {
        const snapshot = await db.collection(COLECCION_CLIENTES).orderBy('nombre').get();
        listaClientesCargada = snapshot.docs.map(doc => doc.data().nombre);
    } catch (error) {
        console.error("Error fetching clientes:", error);
        listaClientesCargada = [];
    }
}

async function fetchTiposCirugia() {
    if (listaTiposCxCargada !== null) return;
    listaTiposCxCargada = [];
    try {
        const snapshot = await db.collection(COLECCION_TIPOS_CX).orderBy('nombre').get();
        listaTiposCxCargada = snapshot.docs.map(doc => doc.data().nombre);
    } catch (error) {
        console.error("Error fetching tipos cx:", error);
        listaTiposCxCargada = [];
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
            if (!materialesAgrupados[categoria]) materialesAgrupados[categoria] = [];
            const cleanDescription = (data.description || '').replace(/^-+|-+$/g, '').trim();
            materialesAgrupados[categoria].push({ code: data.code, description: cleanDescription });
        });
        listaMaterialesCargada = materialesAgrupados;
    } catch (error) {
        console.error("Error fetching materiales:", error);
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
            let valores = (doc.exists && doc.data().valores) ? doc.data().valores : [];
            if (!valores.includes(valorLimpio)) {
                valores.push(valorLimpio);
                transaction.set(docRef, { valores: valores }, { merge: true });
                const datalistElement = document.getElementById(`${campo}List`);
                if (datalistElement) actualizarListaDatalist(datalistElement, [...new Set(valores)].sort());
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
function obtenerDatos(paraReporte = false) { // Añadido flag para diferenciar
    const datos = {
        formato: document.getElementById('formato')?.value || 'formal',
        mensajeInicio: document.getElementById('mensajeInicio')?.value || '',
        cliente: document.getElementById('cliente')?.value.trim() || '',
        paciente: document.getElementById('paciente')?.value.trim() || '',
        medico: document.getElementById('medico')?.value.trim() || '',
        instrumentador: document.getElementById('instrumentador')?.value.trim() || '',
        lugarCirugia: document.getElementById('lugarCirugia')?.value.trim() || '',
        fechaCirugia: document.getElementById('fechaCirugia')?.value || '',
        tipoCirugia: document.getElementById('tipoCirugia')?.value.trim() || '',
        material: document.getElementById('material')?.value.trim() || '',
        observaciones: document.getElementById('observaciones')?.value.trim() || '',
        infoAdicional: document.getElementById('infoAdicional')?.value.trim() || '',
    };
    if (paraReporte) { // Datos específicos para el reporte visual
        datos.fechaCirugiaFormateada = formatearFechaUsuario(datos.fechaCirugia);
        datos.contenidoMaterialHTML = formatearMaterialParaHTML(datos.material);
    }
    return datos;
}


function formatearMaterialParaHTML(materialTexto) {
    if (!materialTexto) return '<p>No especificado.</p>';
    const lineas = materialTexto.split('\n').filter(linea => linea.trim() !== '');
    if (lineas.length === 0) return '<p>No especificado.</p>';
    let tablaHTML = '<table class="material-table">';
    lineas.forEach(linea => { tablaHTML += `<tr><td>${linea.trim()}</td></tr>`; });
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

// --- HTML del Reporte (reutilizable) ---
function generarHTMLReporte(datos) {
    // datos ya debe venir con fechaCirugiaFormateada y contenidoMaterialHTML
    const fraseFinal = "\n\nSaludos, quedo al pendiente.";
    return `
      <div class="reporte-contenido reporte-box">
        <img src="https://i.imgur.com/aA7RzTN.png" alt="Logo Districorr" style="max-height: 70px; margin-bottom: 12px; display: block; margin: 0 auto;">
        <h3>📝 Reporte de Cirugía</h3>
        <p>${datos.mensajeInicio || 'Detalles de la cirugía programada:'}</p>
        <ul>
          <li><strong>Cliente:</strong> ${datos.cliente || 'No especificado'}</li>
          <li><strong>Paciente:</strong> ${datos.paciente || 'No especificado'}</li>
          <li><strong>Tipo de Cirugía:</strong> ${datos.tipoCirugia || 'No especificado'}</li>
          <li><strong>Médico Responsable:</strong> ${datos.medico || 'No especificado'}</li>
          <li><strong>Instrumentador:</strong> ${datos.instrumentador || 'No especificado'}</li>
          <li><strong>Fecha de Cirugía:</strong> ${datos.fechaCirugiaFormateada}</li>
          <li><strong>Lugar:</strong> ${datos.lugarCirugia || 'No especificado'}</li>
        </ul>
        <h4>Material Requerido:</h4>
        ${datos.contenidoMaterialHTML}
        ${datos.observaciones ? `<h4>Observaciones:</h4><p>${datos.observaciones.replace(/\n/g, '<br>')}</p>` : ''}
        ${datos.infoAdicional ? `<h4>Información Adicional:</h4><p>${datos.infoAdicional.replace(/\n/g, '<br>')}</p>` : ''}
        <p style="margin-top: 20px;">${fraseFinal.trim().replace(/\n/g, '<br>')}</p>
      </div>`;
}

// --- Acciones Principales ---
function generarTexto() {
    if (!validarFormulario()) return;
    const datosParaReporte = obtenerDatos(true); // Obtener con datos formateados para HTML
    const reporteHTML = generarHTMLReporte(datosParaReporte);
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
    if (guardandoReporte) {
        mostrarToast("Espere, guardado anterior en proceso...", "info"); return;
    }
    ocultarBotonReintento();
    const resultadoContainer = document.getElementById('resultado-container');
    let reporteContenidoElement = resultadoContainer.querySelector('.reporte-contenido');
    if (!reporteContenidoElement || resultadoContainer.style.display === 'none') {
        generarTexto(); // Genera el HTML del reporte
        reporteContenidoElement = document.getElementById('resultado-container').querySelector('.reporte-contenido');
        if (!reporteContenidoElement) {
             mostrarToast('Primero debe generar un reporte.', 'warning'); return;
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

    const datosParaGuardar = obtenerDatos(); // Datos crudos para Firebase
    const textoPlanoParaCopiar = reporteElement.innerText;
    let copiadoExitoso = false;
    let guardadoExitoso = false;

    try {
        await navigator.clipboard.writeText(textoPlanoParaCopiar);
        copiadoExitoso = true;
    } catch (err) { console.error('Error al copiar texto:', err); }

    try {
        await guardarEnFirebase(datosParaGuardar);
        guardadoExitoso = true;
        reportePendiente = null;
        ocultarBotonReintento();
        guardarUltimoReporteStorage(datosParaGuardar); // Guardar en localStorage al tener éxito
    } catch (err) { console.error('Fallo guardado por copiarTexto:', err); }

    if (copiadoExitoso && guardadoExitoso) mostrarToast('✅ Texto copiado y reporte guardado!', 'success');
    else if (copiadoExitoso && !guardadoExitoso) mostrarToast('⚠️ Texto copiado, pero falló el guardado.', 'warning');
    else if (!copiadoExitoso && guardadoExitoso) mostrarToast('⚠️ Reporte guardado, pero falló la copia.', 'warning');
    else mostrarToast('❌ Falló la copia y el guardado.', 'error');

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
        try { localStorage.setItem(LOCALSTORAGE_USER_ID, userId); } 
        catch (e) { console.warn("No se pudo guardar el ID de usuario en localStorage:", e); }
    }
    return userId;
}

async function guardarEnFirebase(data) {
    guardandoReporte = true;
    loadingIndicator.style.display = 'block';
    setActionButtonsDisabled(true);
    ocultarBotonReintento();
    if (!data || !data.cliente || !data.paciente || !data.medico || !data.fechaCirugia) {
        mostrarToast('Faltan datos requeridos (Cliente, Paciente, Médico, Fecha).', 'error');
        loadingIndicator.style.display = 'none'; setActionButtonsDisabled(false); guardandoReporte = false;
        throw new Error("Datos insuficientes para guardar el reporte.");
    }
    const reporte = { ...data, timestamp: firebase.firestore.FieldValue.serverTimestamp(), usuario: obtenerUsuarioId() };
    try {
        const docRef = await db.collection(COLECCION_REPORTES).add(reporte);
        await guardarSugerencia('cliente', data.cliente);
        await guardarSugerencia('medico', data.medico);
        await guardarSugerencia('instrumentador', data.instrumentador);
        await guardarSugerencia('lugarCirugia', data.lugarCirugia);
        await guardarSugerencia('tipoCirugia', data.tipoCirugia);
        reportePendiente = null; ocultarBotonReintento();
        return docRef.id;
    } catch (error) {
        console.error("Error al guardar reporte en Firebase: ", error);
        if (error.code === 'unavailable' || error.code === 'cancelled' || error.message.includes('offline')) {
            reportePendiente = data; mostrarToast('⚠️ Falló el guardado (posible red). Puede reintentar.', 'warning'); mostrarBotonReintento();
        } else {
            mostrarToast(`❌ Error al guardar: ${error.message}`, 'error'); reportePendiente = null; ocultarBotonReintento();
        }
        throw error;
    } finally {
        if (!reportePendiente) { loadingIndicator.style.display = 'none'; setActionButtonsDisabled(false); }
        guardandoReporte = false;
    }
}

function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = mensaje; toast.className = 'toast-notification'; toast.classList.add(tipo);
    toast.style.display = 'block'; void toast.offsetWidth;
    toast.style.opacity = '1'; toast.style.transform = 'translateY(0)';
    setTimeout(() => {
        toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 3000); // Reducido a 3 segundos
}

function mostrarBotonReintento() {
    if (retrySaveBtn) {
        retrySaveBtn.style.display = 'inline-block';
        loadingIndicator.style.display = 'none'; setActionButtonsDisabled(false);
    }
}
function ocultarBotonReintento() { if (retrySaveBtn) retrySaveBtn.style.display = 'none'; }

function reintentarGuardado() {
    if (reportePendiente) {
        guardarEnFirebase(reportePendiente)
            .then(() => {
                mostrarToast("✅ Reporte guardado exitosamente tras reintento.", "success");
                reportePendiente = null; ocultarBotonReintento();
                guardarUltimoReporteStorage(reportePendiente); // También guardar en localStorage
            })
            .catch(err => { console.error("Reintento de guardado falló:", err); });
    } else { ocultarBotonReintento(); }
}

function compartirWhatsApp() {
    if (!validarFormulario()) return;
    let reporteContenidoElement = document.getElementById('resultado-container').querySelector('.reporte-contenido');
    if (!reporteContenidoElement || document.getElementById('resultado-container').style.display === 'none') {
        generarTexto();
        reporteContenidoElement = document.getElementById('resultado-container').querySelector('.reporte-contenido');
        if (!reporteContenidoElement) { mostrarToast('Primero genere un reporte.', 'warning'); return; }
    }
    const textoPlano = `*Reporte de Cirugía Districorr*\n\n${reporteContenidoElement.innerText}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textoPlano)}`, '_blank');
}

function enviarPorEmail() {
    if (!validarFormulario()) return;
    let reporteContenidoElement = document.getElementById('resultado-container').querySelector('.reporte-contenido');
    if (!reporteContenidoElement || document.getElementById('resultado-container').style.display === 'none') {
        generarTexto();
        reporteContenidoElement = document.getElementById('resultado-container').querySelector('.reporte-contenido');
        if (!reporteContenidoElement) { mostrarToast('Primero genere un reporte.', 'warning'); return; }
    }
    const datos = obtenerDatos();
    const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia);
    const subject = `Reporte Cirugía: ${datos.cliente} - ${datos.paciente} (${fechaFormateada})`;
    let body = reporteContenidoElement.innerText + `\n\n--\nGenerado con App Districorr`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function imprimirReporte() {
    const resultadoContainer = document.getElementById('resultado-container');
    if (!resultadoContainer.querySelector('.reporte-contenido') || resultadoContainer.style.display === 'none') {
        mostrarToast('Primero genere un reporte para imprimir.', 'warning'); return;
    }
    const contenidoParaImprimir = resultadoContainer.querySelector('.reporte-contenido').cloneNode(true);
    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`<html><head><title>Imprimir Reporte</title><link rel="stylesheet" href="style.css"><style>body{padding:20px;background-color:#fff;}.reporte-box{box-shadow:none;border:1px solid #ccc;border-left:5px solid #007bff;margin:0;max-width:100%;}button,.btn-link,.btn-volver,.modal-overlay,.toast-notification,.credit,header,.form-group,.text-center,#loading-indicator,#retry-save-btn,.form-actions-inline{display:none!important;}@media print{body{padding:0;}.reporte-box{border:none;border-left:5px solid #007bff;}}</style></head><body>`);
    ventanaImpresion.document.body.appendChild(contenidoParaImprimir);
    ventanaImpresion.document.write('</body></html>');
    ventanaImpresion.document.close();
    ventanaImpresion.onload = function() {
        ventanaImpresion.focus(); ventanaImpresion.print();
        setTimeout(() => { ventanaImpresion.close(); }, 500);
    };
}

async function generarImagen() {
    const { jsPDF } = window.jspdf; const html2canvas = window.html2canvas;
    if (typeof html2canvas === 'undefined' || typeof jsPDF === 'undefined') {
        mostrarToast('❌ Error: Librerías jsPDF o html2canvas no cargadas.', 'error'); return;
    }
    const reporteElement = document.getElementById('resultado-container')?.querySelector('.reporte-contenido');
    if (!reporteElement || document.getElementById('resultado-container').style.display === 'none') {
        mostrarToast('Primero genere un reporte.', 'warning'); return;
    }
    mostrarToast('🖼️ Generando imagen...', 'info');
    try {
        const canvas = await html2canvas(reporteElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = `reporte_cirugia_${obtenerDatos().cliente||'c'}_${obtenerDatos().paciente||'p'}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png'); link.click();
        mostrarToast('✅ Imagen PNG descargada.', 'success');
    } catch (error) {
        console.error('Error generando imagen:', error);
        mostrarToast('❌ Error al generar imagen.', 'error');
    }
}

// --- Funciones para Modales ---
// Modal Clientes
async function abrirModalClientes() {
    const modal = document.getElementById('modalClientes');
    const listaContainer = document.getElementById('modalClientesLista');
    const searchInput = document.getElementById('modalClientesSearchInput');
    if (!modal || !listaContainer || !searchInput) return;
    if (listaClientesCargada === null) { mostrarToast("Cargando clientes...", "info"); await fetchClientes(); }
    if (!listaClientesCargada || listaClientesCargada.length === 0) { mostrarToast("No hay clientes disponibles.", "warning"); return; }
    searchInput.value = ''; listaContainer.innerHTML = '';
    listaClientesCargada.forEach(cliente => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('modal-item', 'cliente-item'); itemDiv.dataset.value = cliente;
        itemDiv.textContent = cliente; itemDiv.onclick = function() { anadirClienteSeleccionado(cliente); };
        listaContainer.appendChild(itemDiv);
    });
    modal.classList.add('visible'); modal.style.display = 'flex'; searchInput.focus();
}
function cerrarModalClientes() {
    const modal = document.getElementById('modalClientes');
    if (modal) { modal.classList.remove('visible'); setTimeout(() => { modal.style.display = 'none'; }, 300); }
}
function anadirClienteSeleccionado(clienteSel) {
    const inputCliente = document.getElementById('cliente');
    if (inputCliente) { inputCliente.value = clienteSel; inputCliente.dispatchEvent(new Event('input')); inputCliente.dispatchEvent(new Event('change')); }
    cerrarModalClientes();
}
function filtrarModalClientes() {
    const input = document.getElementById('modalClientesSearchInput');
    const filter = input.value.toUpperCase().trim();
    const items = document.getElementById('modalClientesLista').getElementsByClassName('cliente-item');
    for (let i = 0; i < items.length; i++) {
        items[i].style.display = (filter === "" || (items[i].textContent||items[i].innerText).toUpperCase().indexOf(filter) > -1) ? "" : "none";
    }
}
const debouncedFilterClientes = debounce(filtrarModalClientes, DEBOUNCE_DELAY);

// Modal Materiales
async function abrirModalMateriales() {
    const modal = document.getElementById('modalMateriales');
    const listaContainer = document.getElementById('modalMaterialesLista');
    const searchInput = document.getElementById('modalMaterialesSearchInput');
    if (!modal || !listaContainer || !searchInput) return;
    if (listaMaterialesCargada === null) { mostrarToast("Cargando materiales...", "info"); await fetchMateriales(); }
    if (listaMaterialesCargada === null || Object.keys(listaMaterialesCargada).length === 0) { mostrarToast("No hay materiales disponibles.", "warning"); return; }
    searchInput.value = ''; listaContainer.innerHTML = 'Cargando...';
    setTimeout(() => {
        listaContainer.innerHTML = '';
        for (const categoria in listaMaterialesCargada) {
            const catDiv = document.createElement('div'); catDiv.classList.add('modal-categoria');
            const titulo = document.createElement('div'); titulo.classList.add('modal-categoria-titulo'); titulo.textContent = categoria; catDiv.appendChild(titulo);
            listaMaterialesCargada[categoria].forEach(item => {
                const itemDiv = document.createElement('div'); itemDiv.classList.add('modal-item'); itemDiv.dataset.code = item.code; itemDiv.dataset.description = item.description;
                const chk = document.createElement('input'); chk.type = 'checkbox'; chk.id = `mat-${item.code}`; chk.value = item.code; chk.classList.add('modal-item-checkbox');
                const lbl = document.createElement('label'); lbl.htmlFor = `mat-${item.code}`; lbl.innerHTML = `<span class="item-code">${item.code}</span> - <span class="item-desc">${item.description}</span>`;
                itemDiv.appendChild(chk); itemDiv.appendChild(lbl); catDiv.appendChild(itemDiv);
            });
            listaContainer.appendChild(catDiv);
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
    const textarea = document.getElementById('material'); if (!textarea) return;
    const checkboxes = document.getElementById('modalMateriales').querySelectorAll('.modal-item-checkbox:checked');
    let texto = '';
    checkboxes.forEach(cb => {
        const itemDiv = cb.closest('.modal-item');
        if (itemDiv?.dataset.code && itemDiv?.dataset.description) texto += `${itemDiv.dataset.code} - ${itemDiv.dataset.description}\n`;
    });
    if (texto) {
        const actual = textarea.value.trim();
        textarea.value = actual + (actual ? '\n' : '') + texto.trim();
        textarea.dispatchEvent(new Event('input'));
    }
    cerrarModalMateriales();
}
function filtrarModalMateriales() {
    const input = document.getElementById('modalMaterialesSearchInput');
    const filter = input.value.toUpperCase().trim();
    const categorias = document.getElementById('modalMaterialesLista').getElementsByClassName('modal-categoria');
    for (let i = 0; i < categorias.length; i++) {
        const items = categorias[i].getElementsByClassName('modal-item'); let catVisible = false;
        for (let j = 0; j < items.length; j++) {
            const lbl = items[j].getElementsByTagName('label')[0];
            if (lbl) {
                if (filter === "" || (lbl.textContent||lbl.innerText).toUpperCase().indexOf(filter) > -1) { items[j].style.display = ""; catVisible = true; } 
                else { items[j].style.display = "none"; }
            }
        }
        const titulo = categorias[i].querySelector('.modal-categoria-titulo');
        if (titulo) titulo.style.display = catVisible ? "" : "none";
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
    if (!listaTiposCxCargada || listaTiposCxCargada.length === 0) { mostrarToast("No hay tipos de cirugía disponibles.", "warning"); return; }
    searchInput.value = ''; listaContainer.innerHTML = '';
    listaTiposCxCargada.forEach(tipo => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('modal-item', 'tipo-cx-item'); itemDiv.dataset.value = tipo;
        itemDiv.textContent = tipo; itemDiv.onclick = function() { anadirTipoCxSeleccionado(tipo); };
        listaContainer.appendChild(itemDiv);
    });
    modal.classList.add('visible'); modal.style.display = 'flex'; searchInput.focus();
}
function cerrarModalTipoCx() {
    const modal = document.getElementById('modalTipoCx');
    if (modal) { modal.classList.remove('visible'); setTimeout(() => { modal.style.display = 'none'; }, 300); }
}
function anadirTipoCxSeleccionado(tipoSel) {
    const inputTipoCx = document.getElementById('tipoCirugia');
    if (inputTipoCx) { inputTipoCx.value = tipoSel; inputTipoCx.dispatchEvent(new Event('input')); inputTipoCx.dispatchEvent(new Event('change')); }
    cerrarModalTipoCx();
}
function filtrarModalTipoCx() {
    const input = document.getElementById('modalTipoCxSearchInput');
    const filter = input.value.toUpperCase().trim();
    const items = document.getElementById('modalTipoCxLista').getElementsByClassName('tipo-cx-item');
    for (let i = 0; i < items.length; i++) {
        items[i].style.display = (filter === "" || (items[i].textContent||items[i].innerText).toUpperCase().indexOf(filter) > -1) ? "" : "none";
    }
}
const debouncedFilterTipoCx = debounce(filtrarModalTipoCx, DEBOUNCE_DELAY);

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    Promise.all([fetchClientes(), fetchTiposCirugia(), fetchMateriales()])
        .then(() => {
            console.log("Datos maestros iniciales cargados o en proceso.");
            // Habilitar botón de cargar último si hay datos
            if (localStorage.getItem(LOCALSTORAGE_ULTIMO_REPORTE) && btnCargarUltimo) {
                btnCargarUltimo.disabled = false;
            } else if (btnCargarUltimo) {
                btnCargarUltimo.disabled = true;
            }
        });

    cargarSugerenciasIniciales('cliente', 'clientesList');
    cargarSugerenciasIniciales('medico', 'medicosList');
    cargarSugerenciasIniciales('instrumentador', 'instrumentadoresList');
    cargarSugerenciasIniciales('lugarCirugia', 'lugaresList');
    cargarSugerenciasIniciales('tipoCirugia', 'tiposCirugiaList');
    setupValidacion();

    try { // Fecha por defecto
        const hoy = new Date(); const offset = hoy.getTimezoneOffset();
        const hoyLocal = new Date(hoy.getTime() - (offset*60*1000));
        const fechaISO = hoyLocal.toISOString().split('T')[0];
        const fechaInput = document.getElementById('fechaCirugia');
        if(fechaInput) { fechaInput.value = fechaISO; validarCampo(fechaInput); }
    } catch (e) { console.error("Error estableciendo fecha:", e); }

    if (retrySaveBtn) retrySaveBtn.addEventListener('click', reintentarGuardado);
    
    const modalsToSetup = [
        { id: 'modalClientes', closeFn: cerrarModalClientes },
        { id: 'modalMateriales', closeFn: cerrarModalMateriales },
        { id: 'modalTipoCx', closeFn: cerrarModalTipoCx }
    ];
    modalsToSetup.forEach(m => {
        const el = document.getElementById(m.id);
        if (el) el.addEventListener('click', function(e) { if (e.target === this) m.closeFn(); });
    });
    console.log("App Districorr inicializada.");
});
// --- END OF FILE script.js ---
