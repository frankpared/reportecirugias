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
const LOCALSTORAGE_ULTIMO_REPORTE = 'ultimoReporteDistricorr';
const DEBOUNCE_DELAY = 250;

// --- Fondos y Saludos Dinámicos (Temáticos Quirófano/Medicina) ---
const fondosPorDia = {
    0: { // Domingo
        img: 'https://images.pexels.com/photos/7583373/pexels-photo-7583373.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // Quirófano bien iluminado, tranquilo
        msg: 'Domingo: ¡Preparando el terreno para la semana que viene! ¡A laburar como leñador con hacha nueva! '
    },
    1: { // Lunes
        img: 'https://unsplash.com/es/fotos/una-habitacion-de-hospital-llena-de-muchos-equipos-medicos-tELCeRE6X9U', // Quirofano instrumental
        msg: 'Lunes: ¡Arrancamos la semana con el cuchillo entre los dientes! '
    },
    2: { // Martes
        img: 'https://images.unsplash.com/photo-1624716472114-a7c5f18ac832?q=80&w=2072&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', //Rodilla
        msg: 'Martes: ¡Hoy se labura como perro con hueso! ¡A no soltar la tarea hasta terminarla! '
    },
    3: { // Miércoles
        img: 'https://images.unsplash.com/photo-1504813184591-01572f98c85f?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D, // Instrumental quirúrgico ordenado
        msg: 'Miércoles:¡Hoy se labura con la precisión de un cirujano! ¡Cada detalle cuenta para el éxito!.'
    },
    4: { // Jueves
        img: 'https://plus.unsplash.com/premium_photo-1664304383260-71d002c722ee?q=80&w=2079&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Vista interior de un hospital moderno
        msg: '¡Ya casi estamos en la meta semanal, ¡pero se sigue laburando como bombero en incendio! ¡Con urgencia y dedicación!'
    },
    5: { // Viernes
        img: 'https://plus.unsplash.com/premium_photo-1661889752049-44bb9f857e67?q=80&w=1973&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Estetoscopio sobre escritorio, planificación
        msg: 'Viernes: ¡Semana terminada como partido ganado en el último minuto! ¡Con la alegría del deber cumplido! '
    },
    6: { // Sábado
        img: 'https://plus.unsplash.com/premium_photo-1661855359165-99c68161d7dd?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Radiografía o imagen médica abstracta
        msg: 'Sábado:¡Tiempo para desenchufar un poco, pero la ambición sigue latente como volcán dormido para la semana que viene!'
    }
};

function aplicarFondoYSaludoDinamico() {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const body = document.body;
    const headerMsgContainer = document.querySelector('.container header h4');

    if (fondosPorDia[diaSemana]) {
        const { img, msg } = fondosPorDia[diaSemana];
        if (img) {
            body.classList.add('fondo-dinamico');
            body.style.backgroundImage = `url('${img}')`;
        } else {
            body.classList.remove('fondo-dinamico');
            body.style.backgroundImage = 'none';
            body.style.backgroundColor = '#e9f0f5';
        }
        if (headerMsgContainer && msg) {
            let saludoElement = document.getElementById('saludoDinamico');
            if (!saludoElement && headerMsgContainer.parentNode) {
                saludoElement = document.createElement('p');
                saludoElement.id = 'saludoDinamico';
                saludoElement.style.textAlign = 'center';
                saludoElement.style.fontSize = '1.1em';
                saludoElement.style.color = '#004085'; // Azul más oscuro para mejor contraste
                saludoElement.style.fontWeight = '600';
                saludoElement.style.marginBottom = '10px';
                headerMsgContainer.parentNode.insertBefore(saludoElement, headerMsgContainer);
            }
            if (saludoElement) {
                saludoElement.textContent = msg;
            }
        }
    } else {
        body.style.backgroundColor = '#e9f0f5';
        if (headerMsgContainer && headerMsgContainer.parentNode) {
            const saludoExistente = document.getElementById('saludoDinamico');
            if (saludoExistente) saludoExistente.remove();
        }
    }
}


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
const reporteForm = document.getElementById('reporteForm');
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
        reporteForm.reset();
        const camposConError = reporteForm.querySelectorAll('.campo-invalido');
        camposConError.forEach(campo => campo.classList.remove('campo-invalido'));
        const mensajesError = reporteForm.querySelectorAll('.mensaje-error');
        mensajesError.forEach(msg => msg.style.display = 'none');
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
        const reporteParaGuardar = { ...data };
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
                        input.value = ultimoReporte[key] || '';
                        validarCampo(input);
                    }
                });
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
    if (!input) return true;
    if (input.required && input.value.trim() === '') esValido = false;
    if (input.type === 'date' && input.required && !input.value) esValido = false;
    else if (input.type === 'date' && input.value && !/^\d{4}-\d{2}-\d{2}$/.test(input.value)) esValido = false;
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
        if (input && !validarCampo(input)) esFormularioValido = false;
    });
    if (!esFormularioValido) mostrarToast('Por favor, complete todos los campos requeridos (*).', 'warning');
    return esFormularioValido;
}

// --- Carga de Datos Maestros ---
async function fetchClientes() {
    if (listaClientesCargada !== null) return;
    listaClientesCargada = [];
    try {
        const snapshot = await db.collection(COLECCION_CLIENTES).orderBy('nombre').get();
        listaClientesCargada = snapshot.docs.map(doc => doc.data().nombre);
    } catch (error) { console.error("Error fetching clientes:", error); listaClientesCargada = []; }
}
async function fetchTiposCirugia() {
    if (listaTiposCxCargada !== null) return;
    listaTiposCxCargada = [];
    try {
        const snapshot = await db.collection(COLECCION_TIPOS_CX).orderBy('nombre').get();
        listaTiposCxCargada = snapshot.docs.map(doc => doc.data().nombre);
    } catch (error) { console.error("Error fetching tipos cx:", error); listaTiposCxCargada = []; }
}
async function fetchMateriales() {
    if (listaMaterialesCargada !== null) return;
    listaMaterialesCargada = {};
    try {
        const snapshot = await db.collection(COLECCION_MATERIALES).orderBy('categoria').orderBy('code').get();
        const matAgrupados = {};
        snapshot.forEach(doc => {
            const data = doc.data(); const cat = data.categoria || "SIN CATEGORIA";
            if (!matAgrupados[cat]) matAgrupados[cat] = [];
            const cleanDesc = (data.description || '').replace(/^-+|-+$/g, '').trim();
            matAgrupados[cat].push({ code: data.code, description: cleanDesc });
        });
        listaMaterialesCargada = matAgrupados;
    } catch (error) { console.error("Error fetching materiales:", error); listaMaterialesCargada = {}; }
}

// --- Sugerencias (Autocompletado) ---
async function cargarSugerenciasIniciales(idInput, idList) {
    const datalistEl = document.getElementById(idList); if (!datalistEl) return;
    const campo = idInput;
    try {
        const snapshot = await db.collection(COLECCION_SUGERENCIAS).doc(campo).get();
        if (snapshot.exists && snapshot.data().valores) {
            actualizarListaDatalist(datalistEl, [...new Set(snapshot.data().valores)].sort());
        } else { datalistEl.innerHTML = ''; }
    } catch (error) { console.error(`Error cargando sugerencias ${campo}:`, error); }
}
async function guardarSugerencia(campo, valor) {
    if (!valor || valor.trim().length < 3) return;
    const valorLimpio = valor.trim(); const docRef = db.collection(COLECCION_SUGERENCIAS).doc(campo);
    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            let valores = (doc.exists && doc.data().valores) ? doc.data().valores : [];
            if (!valores.includes(valorLimpio)) {
                valores.push(valorLimpio); t.set(docRef, { valores }, { merge: true });
                const datalistEl = document.getElementById(`${campo}List`);
                if (datalistEl) actualizarListaDatalist(datalistEl, [...new Set(valores)].sort());
            }
        });
    } catch (error) { console.error(`Error guardando sugerencia ${campo}:`, error); }
}
function actualizarListaDatalist(datalistEl, valores) {
    datalistEl.innerHTML = '';
    valores.forEach(val => { const opt = document.createElement('option'); opt.value = val; datalistEl.appendChild(opt); });
}

// --- Obtención y Formateo de Datos ---
function obtenerDatos(paraReporte = false) {
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
    if (paraReporte) {
        datos.fechaCirugiaFormateada = formatearFechaUsuario(datos.fechaCirugia);
        datos.contenidoMaterialHTML = formatearMaterialParaHTML(datos.material);
    }
    return datos;
}
function formatearMaterialParaHTML(materialTexto) {
    if (!materialTexto) return '<p>No especificado.</p>';
    const lineas = materialTexto.split('\n').filter(l => l.trim() !== '');
    if (lineas.length === 0) return '<p>No especificado.</p>';
    let html = '<table class="material-table">';
    lineas.forEach(l => { html += `<tr><td>${l.trim()}</td></tr>`; });
    return html + '</table>';
}
function formatearFechaUsuario(fechaISO) {
    if (!fechaISO) return 'No especificada';
    try {
        const p = fechaISO.split('-'); if (p.length !== 3) return fechaISO;
        const f = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]), 12);
        return f.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return fechaISO; }
}

// --- HTML del Reporte (reutilizable) ---
function generarHTMLReporte(datos) {
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
    const datosHTML = obtenerDatos(true);
    const reporteHTML = generarHTMLReporte(datosHTML);
    const resCont = document.getElementById('resultado-container');
    if (resCont) {
        resCont.innerHTML = reporteHTML; resCont.style.display = 'block';
        resCont.scrollIntoView({ behavior: 'smooth', block: 'start' });
        mostrarToast('✅ Reporte generado. Listo para copiar o enviar.', 'success');
    } else { mostrarToast('❌ Error interno: No se pudo mostrar el reporte.', 'error'); }
}
async function copiarTexto() {
    if (!validarFormulario()) return;
    if (guardandoReporte) { mostrarToast("Espere, guardado en proceso...", "info"); return; }
    ocultarBotonReintento();
    let repContEl = document.getElementById('resultado-container').querySelector('.reporte-contenido');
    if (!repContEl || document.getElementById('resultado-container').style.display === 'none') {
        generarTexto();
        repContEl = document.getElementById('resultado-container').querySelector('.reporte-contenido');
        if (!repContEl) { mostrarToast('Primero genere un reporte.', 'warning'); return; }
    }
    await copiarYGuardarInterno(repContEl);
}
async function copiarYGuardarInterno(repEl) {
    if (guardandoReporte) return;
    guardandoReporte = true; loadingIndicator.style.display = 'block'; setActionButtonsDisabled(true); ocultarBotonReintento();
    const datosGuardar = obtenerDatos(); const txtCopiar = repEl.innerText;
    let copiadoOK = false, guardadoOK = false;
    try { await navigator.clipboard.writeText(txtCopiar); copiadoOK = true; } catch (err) { console.error('Error al copiar:', err); }
    try {
        await guardarEnFirebase(datosGuardar); guardadoOK = true; reportePendiente = null; ocultarBotonReintento();
        guardarUltimoReporteStorage(datosGuardar);
    } catch (err) { console.error('Fallo guardado por copiarTexto:', err); }
    if (copiadoOK && guardadoOK) mostrarToast('✅ Texto copiado y reporte guardado!', 'success');
    else if (copiadoOK && !guardadoOK) mostrarToast('⚠️ Texto copiado, pero falló el guardado.', 'warning');
    else if (!copiadoOK && guardadoOK) mostrarToast('⚠️ Reporte guardado, pero falló la copia.', 'warning');
    else mostrarToast('❌ Falló la copia y el guardado.', 'error');
    if (!reportePendiente) { loadingIndicator.style.display = 'none'; setActionButtonsDisabled(false); }
    guardandoReporte = false;
}
function obtenerUsuarioId() {
    let uId = localStorage.getItem(LOCALSTORAGE_USER_ID);
    if (!uId) {
        uId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        try { localStorage.setItem(LOCALSTORAGE_USER_ID, uId); } catch (e) { console.warn("No se pudo guardar ID usuario:", e); }
    } return uId;
}
async function guardarEnFirebase(data) {
    guardandoReporte = true; loadingIndicator.style.display = 'block'; setActionButtonsDisabled(true); ocultarBotonReintento();
    if (!data || !data.cliente || !data.paciente || !data.medico || !data.fechaCirugia) {
        mostrarToast('Faltan datos requeridos (Cliente, Paciente, Médico, Fecha).', 'error');
        loadingIndicator.style.display = 'none'; setActionButtonsDisabled(false); guardandoReporte = false;
        throw new Error("Datos insuficientes para guardar.");
    }
    const reporte = { ...data, timestamp: firebase.firestore.FieldValue.serverTimestamp(), usuario: obtenerUsuarioId() };
    try {
        const docRef = await db.collection(COLECCION_REPORTES).add(reporte);
        await Promise.all([ guardarSugerencia('cliente', data.cliente), guardarSugerencia('medico', data.medico), guardarSugerencia('instrumentador', data.instrumentador), guardarSugerencia('lugarCirugia', data.lugarCirugia), guardarSugerencia('tipoCirugia', data.tipoCirugia) ]);
        reportePendiente = null; ocultarBotonReintento(); return docRef.id;
    } catch (error) {
        console.error("Error guardando en Firebase: ", error);
        if (error.code === 'unavailable' || error.code === 'cancelled' || error.message.includes('offline')) {
            reportePendiente = data; mostrarToast('⚠️ Falló guardado (red?). Reintentar.', 'warning'); mostrarBotonReintento();
        } else { mostrarToast(`❌ Error al guardar: ${error.message}`, 'error'); reportePendiente = null; ocultarBotonReintento(); }
        throw error;
    } finally {
        if (!reportePendiente) { loadingIndicator.style.display = 'none'; setActionButtonsDisabled(false); }
        guardandoReporte = false;
    }
}
function mostrarToast(mensaje, tipo = 'info') {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = mensaje; t.className = 'toast-notification'; t.classList.add(tipo);
    t.style.display = 'block'; void t.offsetWidth; t.style.opacity = '1'; t.style.transform = 'translateY(0)';
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(20px)'; setTimeout(() => { t.style.display = 'none'; }, 300); }, 3000);
}
function mostrarBotonReintento() { if (retrySaveBtn) { retrySaveBtn.style.display = 'inline-block'; loadingIndicator.style.display = 'none'; setActionButtonsDisabled(false); } }
function ocultarBotonReintento() { if (retrySaveBtn) retrySaveBtn.style.display = 'none'; }
function reintentarGuardado() {
    if (reportePendiente) {
        guardarEnFirebase(reportePendiente)
            .then(() => { mostrarToast("✅ Reporte guardado tras reintento.", "success"); reportePendiente = null; ocultarBotonReintento(); guardarUltimoReporteStorage(reportePendiente); })
            .catch(err => { console.error("Reintento falló:", err); });
    } else { ocultarBotonReintento(); }
}
function compartirWhatsApp() {
    if (!validarFormulario()) return;
    let repContEl = document.getElementById('resultado-container').querySelector('.reporte-contenido');
    if (!repContEl || document.getElementById('resultado-container').style.display === 'none') {
        generarTexto(); repContEl = document.getElementById('resultado-container').querySelector('.reporte-contenido');
        if (!repContEl) { mostrarToast('Primero genere reporte.', 'warning'); return; }
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`*Reporte Cirugía Districorr*\n\n${repContEl.innerText}`)}`, '_blank');
}
function enviarPorEmail() {
    if (!validarFormulario()) return;
    let repContEl = document.getElementById('resultado-container').querySelector('.reporte-contenido');
    if (!repContEl || document.getElementById('resultado-container').style.display === 'none') {
        generarTexto(); repContEl = document.getElementById('resultado-container').querySelector('.reporte-contenido');
        if (!repContEl) { mostrarToast('Primero genere reporte.', 'warning'); return; }
    }
    const d = obtenerDatos(); const fechaF = formatearFechaUsuario(d.fechaCirugia);
    const subj = `Reporte Cirugía: ${d.cliente} - ${d.paciente} (${fechaF})`;
    const body = repContEl.innerText + `\n\n--\nGenerado con App Districorr`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
}
function imprimirReporte() {
    const resCont = document.getElementById('resultado-container');
    if (!resCont.querySelector('.reporte-contenido') || resCont.style.display === 'none') { mostrarToast('Primero genere reporte.', 'warning'); return; }
    const contImprimir = resCont.querySelector('.reporte-contenido').cloneNode(true);
    const vImpresion = window.open('', '_blank');
    vImpresion.document.write(`<html><head><title>Imprimir Reporte</title><link rel="stylesheet" href="style.css"><style>body{padding:20px;background-color:#fff;}.reporte-box{box-shadow:none;border:1px solid #ccc;border-left:5px solid #007bff;margin:0;max-width:100%;}button,.btn-link,.btn-volver,.modal-overlay,.toast-notification,.credit,header,.form-group,.text-center,#loading-indicator,#retry-save-btn,.form-actions-inline{display:none!important;}@media print{body{padding:0;}.reporte-box{border:none;border-left:5px solid #007bff;}}</style></head><body>`);
    vImpresion.document.body.appendChild(contImprimir); vImpresion.document.write('</body></html>'); vImpresion.document.close();
    vImpresion.onload = function() { vImpresion.focus(); vImpresion.print(); setTimeout(() => { vImpresion.close(); }, 500); };
}
async function generarImagen() {
    const { jsPDF } = window.jspdf; const html2canvas = window.html2canvas;
    if (typeof html2canvas === 'undefined' || typeof jsPDF === 'undefined') { mostrarToast('❌ Error: Librerías no cargadas.', 'error'); return; }
    const repEl = document.getElementById('resultado-container')?.querySelector('.reporte-contenido');
    if (!repEl || document.getElementById('resultado-container').style.display === 'none') { mostrarToast('Primero genere reporte.', 'warning'); return; }
    mostrarToast('🖼️ Generando imagen...', 'info');
    try {
        const canvas = await html2canvas(repEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = `reporte_${obtenerDatos().cliente||'c'}_${obtenerDatos().paciente||'p'}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png'); link.click();
        mostrarToast('✅ Imagen PNG descargada.', 'success');
    } catch (error) { console.error('Error generando imagen:', error); mostrarToast('❌ Error al generar imagen.', 'error'); }
}

// --- Funciones para Modales ---
// (Clientes, Materiales, TipoCx - Las funciones son similares, refactorizadas para ser más concisas)
async function _abrirModalGenerico(modalId, listaContainerId, searchInputId, dataArray, itemClassName, seleccionarFn, fetchFn, placeholderTexto, tituloModal) {
    const modal = document.getElementById(modalId);
    const listaCont = document.getElementById(listaContainerId);
    const searchIn = document.getElementById(searchInputId);
    if (!modal || !listaCont || !searchIn) return;

    if (dataArray === null) { mostrarToast(`Cargando ${placeholderTexto}...`, "info"); await fetchFn(); dataArray = window[`lista${placeholderTexto.replace(/\s+/g, '')}Cargada`]; } // Asume variable global
    if (!dataArray || (Array.isArray(dataArray) && dataArray.length === 0) || (typeof dataArray === 'object' && Object.keys(dataArray).length === 0) ) {
        mostrarToast(`No hay ${placeholderTexto} disponibles.`, "warning"); return;
    }
    
    searchIn.value = ''; listaCont.innerHTML = ''; // Limpiar antes de llenar

    if (modalId === 'modalMateriales') { // Lógica especial para materiales por categoría
        listaCont.innerHTML = 'Cargando...';
        setTimeout(() => { // Delay para UI
            listaCont.innerHTML = '';
            for (const categoria in dataArray) {
                const catDiv = document.createElement('div'); catDiv.classList.add('modal-categoria');
                const titulo = document.createElement('div'); titulo.classList.add('modal-categoria-titulo'); titulo.textContent = categoria; catDiv.appendChild(titulo);
                dataArray[categoria].forEach(item => {
                    const itemDiv = document.createElement('div'); itemDiv.classList.add('modal-item'); itemDiv.dataset.code = item.code; itemDiv.dataset.description = item.description;
                    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.id = `mat-${item.code}`; chk.value = item.code; chk.classList.add('modal-item-checkbox');
                    const lbl = document.createElement('label'); lbl.htmlFor = `mat-${item.code}`; lbl.innerHTML = `<span class="item-code">${item.code}</span> - <span class="item-desc">${item.description}</span>`;
                    itemDiv.appendChild(chk); itemDiv.appendChild(lbl); catDiv.appendChild(itemDiv);
                });
                listaCont.appendChild(catDiv);
            }
        },10);
    } else { // Lógica para listas simples (Clientes, TiposCx)
        dataArray.forEach(item => {
            const itemDiv = document.createElement('div'); itemDiv.classList.add('modal-item', itemClassName);
            itemDiv.dataset.value = item; itemDiv.textContent = item;
            itemDiv.onclick = function() { seleccionarFn(item); };
            listaCont.appendChild(itemDiv);
        });
    }
    modal.classList.add('visible'); modal.style.display = 'flex'; searchIn.focus();
}
function _cerrarModalGenerico(modalId) { const m = document.getElementById(modalId); if (m) { m.classList.remove('visible'); setTimeout(() => { m.style.display = 'none'; }, 300); } }
function _filtrarModalGenerico(searchInputId, listaContainerId, itemClassName) {
    const input = document.getElementById(searchInputId); const filter = input.value.toUpperCase().trim();
    const items = document.getElementById(listaContainerId).getElementsByClassName(itemClassName);
    for (let i = 0; i < items.length; i++) { items[i].style.display = (filter === "" || (items[i].textContent||items[i].innerText).toUpperCase().indexOf(filter) > -1) ? "" : "none"; }
}
// Instancias para cada modal
async function abrirModalClientes() { await _abrirModalGenerico('modalClientes', 'modalClientesLista', 'modalClientesSearchInput', listaClientesCargada, 'cliente-item', anadirClienteSeleccionado, fetchClientes, 'Clientes'); }
function cerrarModalClientes() { _cerrarModalGenerico('modalClientes'); }
function anadirClienteSeleccionado(sel) { const i = document.getElementById('cliente'); if (i) { i.value = sel; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); } cerrarModalClientes(); }
const debouncedFilterClientes = debounce(() => _filtrarModalGenerico('modalClientesSearchInput', 'modalClientesLista', 'cliente-item'), DEBOUNCE_DELAY);

async function abrirModalTipoCx() { await _abrirModalGenerico('modalTipoCx', 'modalTipoCxLista', 'modalTipoCxSearchInput', listaTiposCxCargada, 'tipo-cx-item', anadirTipoCxSeleccionado, fetchTiposCirugia, 'Tipos Cirugía'); }
function cerrarModalTipoCx() { _cerrarModalGenerico('modalTipoCx'); }
function anadirTipoCxSeleccionado(sel) { const i = document.getElementById('tipoCirugia'); if (i) { i.value = sel; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); } cerrarModalTipoCx(); }
const debouncedFilterTipoCx = debounce(() => _filtrarModalGenerico('modalTipoCxSearchInput', 'modalTipoCxLista', 'tipo-cx-item'), DEBOUNCE_DELAY);

async function abrirModalMateriales() { await _abrirModalGenerico('modalMateriales', 'modalMaterialesLista', 'modalMaterialesSearchInput', listaMaterialesCargada, 'modal-item', null, fetchMateriales, 'Materiales'); } // No tiene seleccionarFn directa
function cerrarModalMateriales() { _cerrarModalGenerico('modalMateriales'); if(document.getElementById('modalMateriales')) document.getElementById('modalMateriales').querySelectorAll('.modal-item-checkbox').forEach(cb => cb.checked = false); }
function anadirMaterialesSeleccionados() { /* Misma lógica que antes, ya está bien */
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
const debouncedFilterMateriales = debounce(() => { // Adaptada para materiales
    const input = document.getElementById('modalMaterialesSearchInput'); const filter = input.value.toUpperCase().trim();
    const categorias = document.getElementById('modalMaterialesLista').getElementsByClassName('modal-categoria');
    for (let i = 0; i < categorias.length; i++) {
        const items = categorias[i].getElementsByClassName('modal-item'); let catVisible = false;
        for (let j = 0; j < items.length; j++) {
            const lbl = items[j].getElementsByTagName('label')[0];
            if (lbl) { if (filter === "" || (lbl.textContent||lbl.innerText).toUpperCase().indexOf(filter) > -1) { items[j].style.display = ""; catVisible = true; } else { items[j].style.display = "none"; } }
        }
        const titulo = categorias[i].querySelector('.modal-categoria-titulo'); if (titulo) titulo.style.display = catVisible ? "" : "none";
    }
}, DEBOUNCE_DELAY);

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('reporteForm')) { // Solo en index.html
        aplicarFondoYSaludoDinamico();
    }
    Promise.all([fetchClientes(), fetchTiposCirugia(), fetchMateriales()])
        .then(() => {
            console.log("Datos maestros iniciales cargados o en proceso.");
            if (localStorage.getItem(LOCALSTORAGE_ULTIMO_REPORTE) && btnCargarUltimo) btnCargarUltimo.disabled = false;
            else if (btnCargarUltimo) btnCargarUltimo.disabled = true;
            // Actualizar las variables globales explicitamente después del fetch para la función genérica
            window.listaClientesCargada = listaClientesCargada;
            window.listaTiposCirugíaCargada = listaTiposCxCargada; // Ojo con el nombre aquí, debe coincidir
            window.listaMaterialesCargada = listaMaterialesCargada;
        });
    cargarSugerenciasIniciales('cliente', 'clientesList');
    cargarSugerenciasIniciales('medico', 'medicosList');
    cargarSugerenciasIniciales('instrumentador', 'instrumentadoresList');
    cargarSugerenciasIniciales('lugarCirugia', 'lugaresList');
    cargarSugerenciasIniciales('tipoCirugia', 'tiposCirugiaList');
    setupValidacion();
    try {
        const hoy = new Date(); const offset = hoy.getTimezoneOffset();
        const hoyLocal = new Date(hoy.getTime() - (offset*60*1000));
        const fechaISO = hoyLocal.toISOString().split('T')[0];
        const fechaInput = document.getElementById('fechaCirugia');
        if(fechaInput) { fechaInput.value = fechaISO; validarCampo(fechaInput); }
    } catch (e) { console.error("Error estableciendo fecha:", e); }
    if (retrySaveBtn) retrySaveBtn.addEventListener('click', reintentarGuardado);
    const modalsToSetup = [ { id: 'modalClientes', closeFn: cerrarModalClientes }, { id: 'modalMateriales', closeFn: cerrarModalMateriales }, { id: 'modalTipoCx', closeFn: cerrarModalTipoCx } ];
    modalsToSetup.forEach(m => { const el = document.getElementById(m.id); if (el) el.addEventListener('click', function(e) { if (e.target === this) m.closeFn(); }); });
    console.log("App Districorr inicializada.");
});
// --- END OF FILE script.js ---
