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
const COLECCION_TIPOS_CX = 'tiposCirugia'; // Nombre de la colección en Firestore
const COLECCION_MATERIALES = 'materiales'; // Nombre de la colección en Firestore

// --- Variables Globales para Datos Cargados ---
let listaTiposCxCargada = null; // Se cargará desde Firestore
let listaMaterialesCargada = null; // Se cargará desde Firestore y se agrupará por categoría
let reportePendiente = null; // Para guardar datos si falla el envío
let guardandoReporte = false; // Flag para evitar doble envío

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
const actionButtons = document.querySelectorAll('.text-center button, .text-center a'); // Todos los botones de acción

function setActionButtonsDisabled(disabled) {
    actionButtons.forEach(btn => {
        if (btn.id !== 'retry-save-btn') { // No deshabilitar el botón de reintento
            btn.disabled = disabled;
        }
    });
}

// --- Validación ---
function setupValidacion() {
    const camposRequeridos = ['paciente', 'medico', 'fechaCirugia']; // Campos ahora requeridos
    camposRequeridos.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => validarCampo(input));
            // También validar en blur para capturar cuando se sale del campo
            input.addEventListener('blur', () => validarCampo(input));
        }
    });
}

function validarCampo(input) {
    const errorDiv = document.getElementById(`error-${input.id}`);
    let esValido = true;

    // Validación básica: no vacío para campos requeridos
    if (input.required && input.value.trim() === '') {
        esValido = false;
    }

    // Validación específica para fecha (asegurar que sea una fecha válida, aunque el type="date" ayuda)
    if (input.type === 'date' && input.required && !input.value) {
       esValido = false;
    } else if (input.type === 'date' && input.value && !/^\d{4}-\d{2}-\d{2}$/.test(input.value)) {
        // Formato básico YYYY-MM-DD (el navegador suele forzar esto)
        // Podrías añadir validación de fecha real si es necesario, pero type=date lo maneja bien
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
    const camposRequeridos = ['paciente', 'medico', 'fechaCirugia']; // Campos ahora requeridos

    camposRequeridos.forEach(id => {
        const input = document.getElementById(id);
        if (input && !validarCampo(input)) { // Usa validarCampo para mostrar/ocultar errores
            esFormularioValido = false;
        }
    });

    if (!esFormularioValido) {
        mostrarToast('Por favor, complete todos los campos requeridos (*).', 'warning');
    }

    return esFormularioValido;
}

// --- Carga de Datos Maestros desde Firestore ---
async function fetchTiposCirugia() {
    if (listaTiposCxCargada !== null) return; // Ya cargado o en proceso
    console.log("Fetching tipos de cirugía...");
    listaTiposCxCargada = []; // Marcar como en proceso
    try {
        const snapshot = await db.collection(COLECCION_TIPOS_CX).orderBy('nombre').get();
        listaTiposCxCargada = snapshot.docs.map(doc => doc.data().nombre);
        console.log(`Tipos de cirugía cargados: ${listaTiposCxCargada.length}`);
    } catch (error) {
        console.error("Error fetching tipos de cirugía:", error);
        mostrarToast("Error al cargar tipos de cirugía desde DB.", "error");
        listaTiposCxCargada = []; // Marcar como vacío en caso de error para no reintentar indefinidamente
    }
}

async function fetchMateriales() {
    if (listaMaterialesCargada !== null) return; // Ya cargado o en proceso
    console.log("Fetching materiales...");
    listaMaterialesCargada = {}; // Marcar como en proceso
    try {
        const snapshot = await db.collection(COLECCION_MATERIALES).orderBy('categoria').orderBy('code').get();
        const materialesAgrupados = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            const categoria = data.categoria || "SIN CATEGORIA"; // Agrupar sin categoría si falta
            if (!materialesAgrupados[categoria]) {
                materialesAgrupados[categoria] = [];
            }
            // Limpiar descripción (puede venir con guiones extra)
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
        listaMaterialesCargada = {}; // Marcar como vacío en caso de error
    }
}


// --- Sugerencias (Autocompletado) ---
async function cargarSugerenciasIniciales(idInput, idList) {
    const datalistElement = document.getElementById(idList);
    if (!datalistElement) return;
    const campo = idInput; // El id del input es el nombre del campo en Firestore
    try {
        const snapshot = await db.collection(COLECCION_SUGERENCIAS).doc(campo).get();
        if (snapshot.exists && snapshot.data().valores) {
            const valoresUnicos = [...new Set(snapshot.data().valores)]; // Asegurar unicidad
            actualizarListaDatalist(datalistElement, valoresUnicos.sort());
        } else {
            console.log(`No hay sugerencias iniciales para ${campo} o el documento no existe.`);
            datalistElement.innerHTML = ''; // Limpiar por si acaso
        }
    } catch (error) {
        console.error(`Error cargando sugerencias para ${campo}:`, error);
    }
}

// Función para actualizar sugerencias en Firestore (llamada al cambiar campos relevantes)
// Se podría llamar en 'blur' o con un botón de 'guardar borrador',
// pero aquí la llamaremos al guardar el reporte completo para simplicidad.
async function guardarSugerencia(campo, valor) {
    if (!valor || valor.trim().length < 3) return; // No guardar valores vacíos o muy cortos
    const valorLimpio = valor.trim();
    const docRef = db.collection(COLECCION_SUGERENCIAS).doc(campo);

    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            let valores = [];
            if (doc.exists && doc.data().valores) {
                valores = doc.data().valores;
            }
            // Añadir solo si no existe (case-insensitive check podría ser mejor)
            if (!valores.includes(valorLimpio)) {
                valores.push(valorLimpio);
                // Opcional: Limitar el número de sugerencias guardadas
                // if (valores.length > 50) { valores = valores.slice(-50); }
                transaction.set(docRef, { valores: valores }, { merge: true }); // Usar set con merge o update
                console.log(`Sugerencia '${valorLimpio}' añadida/actualizada para ${campo}.`);

                // Actualizar el datalist en la UI inmediatamente
                const datalistElement = document.getElementById(`${campo}List`); // Asume convención de nombre
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
    datalistElement.innerHTML = ''; // Limpiar opciones existentes
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
        medico: document.getElementById('medico')?.value.trim() || '',
        instrumentador: document.getElementById('instrumentador')?.value.trim() || '',
        lugarCirugia: document.getElementById('lugarCirugia')?.value.trim() || '',
        fechaCirugia: document.getElementById('fechaCirugia')?.value || '', // Mantener formato YYYY-MM-DD
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

    // Crear tabla
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
        // Interpretar la fecha ISO como local añadiendo una hora neutra (mediodía)
        const partes = fechaISO.split('-');
        if (partes.length !== 3) return fechaISO; // Devolver original si no es YYYY-MM-DD
        // Año, Mes (0-indexado), Día, Hora, Min, Seg
        const fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]), 12, 0, 0);
        // Formato DD/MM/YYYY para Argentina
        return fecha.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        console.error("Error formateando fecha:", e);
        return fechaISO; // Devolver el valor original si hay error
    }
}

// --- Acciones Principales ---
function generarTexto() {
    console.log("Intentando generar texto..."); // Log para depuración
    if (!validarFormulario()) {
        console.log("Validación fallida.");
        return;
    }
    console.log("Validación pasada.");

    const datos = obtenerDatos();
    const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia);
    const contenidoMaterialHTML = formatearMaterialParaHTML(datos.material);

    // Frase final estándar
    const fraseFinal = "\n\nSaludos, quedo al pendiente.";

    // *** CORRECCIÓN AQUÍ: Se eliminó el comentario HTML inválido ***
    const reporteHTML = `
      <div class="reporte-contenido reporte-box">
        <img src="https://i.imgur.com/aA7RzTN.png" alt="Logo Districorr" style="max-height: 70px; margin-bottom: 12px; display: block; margin: 0 auto;">
        <h3>📝 Reporte de Cirugía</h3>
        <p>${datos.mensajeInicio || 'Detalles de la cirugía programada:'}</p>
        <ul>
          <li><strong>Paciente:</strong> ${datos.paciente || 'No especificado'}</li>
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
        // Scroll suave hacia el resultado
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

    ocultarBotonReintento(); // Ocultar si estaba visible

    const resultadoContainer = document.getElementById('resultado-container');
    const reporteContenidoElement = resultadoContainer.querySelector('.reporte-contenido');

    if (!reporteContenidoElement || resultadoContainer.style.display === 'none') {
        // Generar el texto si aún no existe antes de intentar copiar/guardar
        generarTexto();
        // Re-seleccionar después de generar
        const nuevoReporteElement = document.getElementById('resultado-container').querySelector('.reporte-contenido');
        if (!nuevoReporteElement) {
             mostrarToast('Primero debe generar un reporte. Click en "📝 Generar Texto".', 'warning');
             return;
        }
        // Usar el elemento recién generado
        await copiarYGuardarInterno(nuevoReporteElement);

    } else {
         await copiarYGuardarInterno(reporteContenidoElement);
    }


}

// Función interna para evitar duplicar lógica de copia y guardado
async function copiarYGuardarInterno(reporteElement) {
    if (guardandoReporte) return; // Evitar doble click
    guardandoReporte = true;
    loadingIndicator.style.display = 'block';
    setActionButtonsDisabled(true);
    ocultarBotonReintento();

    const datosParaGuardar = obtenerDatos(); // Obtener datos actuales para guardar

    // Obtener texto plano del HTML renderizado para copiar
    // innerText suele dar mejor formato que textContent para copiar/pegar
    const textoPlanoParaCopiar = reporteElement.innerText;

    let copiadoExitoso = false;
    let guardadoExitoso = false;

    // Intentar copiar al portapapeles
    try {
        await navigator.clipboard.writeText(textoPlanoParaCopiar);
        copiadoExitoso = true;
        console.log('Texto del reporte copiado al portapapeles.');
    } catch (err) {
        console.error('Error al copiar texto al portapapeles:', err);
        // No mostrar error al usuario aún, puede que el guardado funcione
    }

    // Intentar guardar en Firebase
    try {
        await guardarEnFirebase(datosParaGuardar);
        guardadoExitoso = true;
        console.log('Reporte guardado en Firestore.');
        reportePendiente = null; // Limpiar reporte pendiente si el guardado fue exitoso
        ocultarBotonReintento();
    } catch (err) {
        console.error('Fallo en la operación de guardado iniciada por copiarTexto:', err);
    }

    // Mostrar feedback combinado
    if (copiadoExitoso && guardadoExitoso) {
        mostrarToast('✅ Texto copiado y reporte guardado!', 'success');
    } else if (copiadoExitoso && !guardadoExitoso) {
        mostrarToast('⚠️ Texto copiado, pero falló el guardado. Revise la consola.', 'warning');
    } else if (!copiadoExitoso && guardadoExitoso) {
        mostrarToast('⚠️ Reporte guardado, pero falló la copia. Revise la consola.', 'warning');
    } else {
        mostrarToast('❌ Falló la copia y el guardado. Revise la consola.', 'error');
    }

    // No ocultar loading/botones si se muestra el botón de reintento
    if (!reportePendiente) {
        loadingIndicator.style.display = 'none';
        setActionButtonsDisabled(false);
    }
    guardandoReporte = false;
}


// Genera un ID de usuario simple o lo recupera del localStorage
function obtenerUsuarioId() {
    let userId = localStorage.getItem(LOCALSTORAGE_USER_ID);
    if (!userId) {
        // Generar un ID simple basado en timestamp y aleatorio
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        try {
            localStorage.setItem(LOCALSTORAGE_USER_ID, userId);
        } catch (e) {
            console.warn("No se pudo guardar el ID de usuario en localStorage:", e);
            // Continuar con el ID generado para esta sesión
        }
    }
    return userId;
}


// Modificada para manejar estados de carga y reintentos
async function guardarEnFirebase(data) {
    guardandoReporte = true; // Marcar inicio
    loadingIndicator.style.display = 'block';
    setActionButtonsDisabled(true);
    ocultarBotonReintento();
    if (!data || !data.paciente || !data.medico || !data.fechaCirugia) { // Validación actualizada
        mostrarToast('Faltan datos requeridos (Paciente, Médico, Fecha).', 'error');
        loadingIndicator.style.display = 'none';
        setActionButtonsDisabled(false);
        guardandoReporte = false;
        throw new Error("Datos insuficientes para guardar el reporte.");
    }
    const reporte = {
        ...data, // Copiar todos los datos del formulario
        timestamp: firebase.firestore.FieldValue.serverTimestamp(), // Fecha/hora del servidor
        usuario: obtenerUsuarioId() // Identificador simple del navegador/usuario
    };

    try {
        const docRef = await db.collection(COLECCION_REPORTES).add(reporte);
        console.log("Reporte guardado con ID: ", docRef.id);

        // Guardar sugerencias para campos relevantes después de guardar el reporte
        await guardarSugerencia('medico', data.medico);
        await guardarSugerencia('instrumentador', data.instrumentador);
        await guardarSugerencia('lugarCirugia', data.lugarCirugia);
        await guardarSugerencia('tipoCirugia', data.tipoCirugia);
        // No guardamos sugerencias para paciente o material por su variabilidad

        reportePendiente = null; // Limpiar datos pendientes al guardar con éxito
        ocultarBotonReintento();
        return docRef.id; // Devolver el ID por si se necesita

    } catch (error) {
        console.error("Error al guardar reporte en Firebase: ", error);

        // Lógica de Reintento
        // Códigos comunes de error de red/offline: 'unavailable', 'cancelled'
        if (error.code === 'unavailable' || error.code === 'cancelled' || error.message.includes('offline')) {
            reportePendiente = data; // Guardar los datos para reintentar
            mostrarToast('⚠️ Falló el guardado (posible red). Puede reintentar.', 'warning');
            mostrarBotonReintento();
        } else {
            // Otro tipo de error (ej. permisos)
            mostrarToast(`❌ Error al guardar: ${error.message}`, 'error');
            reportePendiente = null; // No reintentar otros errores automáticamente
            ocultarBotonReintento();
        }
        throw error; // Re-lanzar el error para que la función llamante sepa que falló
    } finally {
        // Asegurarse de limpiar el estado de carga, excepto si se muestra el botón de reintento
        if (!reportePendiente) {
            loadingIndicator.style.display = 'none';
            setActionButtonsDisabled(false);
        }
        guardandoReporte = false; // Marcar fin
    }
}

// --- Funciones Auxiliares y de Interfaz ---
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = mensaje;
    toast.className = 'toast-notification'; // Resetear clases
    toast.classList.add(tipo); // Añadir clase del tipo (success, error, warning, info)

    toast.style.display = 'block';
    // Forzar reflow para que la transición funcione al re-mostrar
    void toast.offsetWidth;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    // Ocultar después de unos segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        // Esperar que termine la transición para ocultar con display:none
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300); // Debe coincidir con la duración de la transición CSS
    }, 4000); // Duración visible del toast (4 segundos)
}

// --- Funciones para Botón de Reintento ---
function mostrarBotonReintento() {
    if (retrySaveBtn) {
        retrySaveBtn.style.display = 'inline-block';
        // También asegurarse de que los botones estén habilitados para poder clickear reintento
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
        // Usar copiarYGuardarInterno para reintentar, ya que maneja UI y lógica
        // Necesitamos generar un elemento temporal o usar los datos directamente
        // Para simplificar, llamaremos a guardarEnFirebase directamente
        guardarEnFirebase(reportePendiente)
            .then(() => {
                mostrarToast("✅ Reporte guardado exitosamente tras reintento.", "success");
                reportePendiente = null; // Limpiar al tener éxito
                ocultarBotonReintento();
            })
            .catch(err => {
                // El error ya se maneja dentro de guardarEnFirebase (mostrará toast/botón de nuevo si falla)
                console.error("Reintento de guardado falló:", err);
            });
    } else {
        console.warn("Se intentó reintentar sin un reporte pendiente.");
        ocultarBotonReintento(); // Ocultar por si acaso
    }
}

// --- Otras Acciones ---
function compartirWhatsApp() {
    if (!validarFormulario()) return;
    const resultadoContainer = document.getElementById('resultado-container');
    const reporteContenidoElement = resultadoContainer.querySelector('.reporte-contenido');

    if (!reporteContenidoElement || resultadoContainer.style.display === 'none') {
         // Intentar generar primero si no existe
        generarTexto();
        const nuevoReporteElement = document.getElementById('resultado-container').querySelector('.reporte-contenido');
        if (!nuevoReporteElement) {
            mostrarToast('Primero genere un reporte para compartir.', 'warning');
            return;
        }
        // Usar el texto recién generado
        const textoPlano = `*Reporte de Cirugía Districorr*\n\n${nuevoReporteElement.innerText}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoPlano)}`;
        window.open(whatsappUrl, '_blank');

    } else {
        // Usar el texto existente
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
        // Intentar generar primero si no existe
        generarTexto();
        reporteContenidoElement = document.getElementById('resultado-container').querySelector('.reporte-contenido');
        if (!reporteContenidoElement) {
            mostrarToast('Primero genere un reporte para enviar.', 'warning');
            return;
        }
    }

    const datos = obtenerDatos();
    const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia);
    const subject = `Reporte Cirugía: ${datos.paciente} - ${datos.tipoCirugia || 'N/E'} (${fechaFormateada})`;

    // Usar innerText para el cuerpo, es más simple y suele dar mejor formato
    let body = reporteContenidoElement.innerText;
    body += `\n\n--\nGenerado con App Districorr`;

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink; // Usar location.href para mejor compatibilidad
}

function imprimirReporte() {
    const resultadoContainer = document.getElementById('resultado-container');
    if (!resultadoContainer.querySelector('.reporte-contenido') || resultadoContainer.style.display === 'none') {
        mostrarToast('Primero genere un reporte para imprimir.', 'warning');
        return;
    }

    // Clonar el contenido para no afectar la vista original
    const contenidoParaImprimir = resultadoContainer.querySelector('.reporte-contenido').cloneNode(true);

    // Crear una ventana temporal para la impresión
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
                    border-left: 5px solid #007bff; /* Mantener borde izquierdo */
                    margin: 0; /* Sin margen extra en la página de impresión */
                    max-width: 100%;
                }
                /* Ocultar botones y elementos no deseados en la impresión */
                button, .btn-link, .btn-volver, .modal-overlay, .toast-notification, .credit, header, .form-group, .text-center, #loading-indicator, #retry-save-btn {
                    display: none !important;
                }
                @media print {
                    body { padding: 0; } /* Ajustar padding para impresión */
                    .reporte-box { border: none; border-left: 5px solid #007bff;}
                }
            </style>
        </head>
        <body>
    `);
    ventanaImpresion.document.body.appendChild(contenidoParaImprimir);
    ventanaImpresion.document.write('</body></html>');
    ventanaImpresion.document.close(); // Necesario para algunos navegadores

    // Esperar a que el contenido cargue y luego imprimir
    ventanaImpresion.onload = function() {
        ventanaImpresion.focus(); // Necesario en algunos navegadores
        ventanaImpresion.print();
        // Cerrar la ventana después de imprimir (o si el usuario cancela)
        // Usar un pequeño delay por si la impresión tarda
        setTimeout(() => { ventanaImpresion.close(); }, 500);
    };
}

async function generarImagen() {
    const { jsPDF } = window.jspdf; // Acceder a jsPDF desde el objeto global
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
        // Usar html2canvas para capturar el elemento
        const canvas = await html2canvas(reporteElement, {
            scale: 2, // Aumentar la escala para mejor resolución
            useCORS: true, // Si usas imágenes de otros dominios (como imgur)
            backgroundColor: '#ffffff' // Fondo blanco explícito
        });

        // Crear un enlace temporal para descargar la imagen PNG
        const link = document.createElement('a');
        link.download = `reporte_cirugia_${obtenerDatos().paciente || 'paciente'}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png'); // Convertir canvas a Data URL PNG
        link.click(); // Simular clic para iniciar la descarga

        mostrarToast('✅ Imagen PNG descargada.', 'success');

    } catch (error) {
        console.error('Error generando la imagen:', error);
        mostrarToast('❌ Error al generar la imagen. Ver consola.', 'error');
    }
}


// --- Funciones para Modales ---
// Asegurarse de que los datos se carguen antes de abrir
// Modal Materiales
async function abrirModalMateriales() { // Convertida a async
    const modal = document.getElementById('modalMateriales');
    const listaContainer = document.getElementById('modalMaterialesLista');
    const searchInput = document.getElementById('modalMaterialesSearchInput');

    if (!modal || !listaContainer || !searchInput) {
        console.error("Elementos del modal de materiales no encontrados.");
        return;
    }

    // Verificar si los materiales están cargados, si no, intentar cargarlos
    if (listaMaterialesCargada === null) {
        mostrarToast("Cargando lista de materiales...", "info");
        await fetchMateriales(); // Esperar carga
    }
    if (listaMaterialesCargada === null || Object.keys(listaMaterialesCargada).length === 0) {
         mostrarToast("No hay materiales disponibles o hubo un error al cargarlos.", "warning");
         return;
    }

    searchInput.value = ''; // Limpiar búsqueda anterior
    listaContainer.innerHTML = 'Cargando...'; // Mostrar carga mientras se genera el HTML

    // Usar setTimeout para permitir que UI se actualice antes de generar lista larga
    setTimeout(() => {
        listaContainer.innerHTML = ''; // Limpiar lista anterior
        // Cargar y mostrar materiales por categoría desde la variable global
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
                    itemDiv.dataset.code = item.code; // Guardar datos en dataset
                    itemDiv.dataset.description = item.description;

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `mat-${item.code}`; // ID único para el label
                    checkbox.value = item.code;
                    checkbox.classList.add('modal-item-checkbox');

                    const label = document.createElement('label');
                    label.htmlFor = `mat-${item.code}`;
                    // Usar innerHTML para formatear código y descripción
                    label.innerHTML = `<span class="item-code">${item.code}</span> - <span class="item-desc">${item.description}</span>`;

                    itemDiv.appendChild(checkbox);
                    itemDiv.appendChild(label);
                    categoriaDiv.appendChild(itemDiv);
                });
                listaContainer.appendChild(categoriaDiv);
        }
        // Mostrar el modal
        modal.classList.add('visible');
        modal.style.display = 'flex'; // Asegurar display flex
        searchInput.focus(); // Poner foco en la búsqueda
    }, 10); // Pequeño delay

}

function cerrarModalMateriales() {
    const modal = document.getElementById('modalMateriales');
    if (modal) {
        modal.classList.remove('visible');
        // Usar setTimeout para permitir que la transición de opacidad termine antes de ocultar
        setTimeout(() => {
            modal.style.display = 'none';
            // Desmarcar checkboxes al cerrar (opcional)
            const checkboxes = modal.querySelectorAll('.modal-item-checkbox');
            checkboxes.forEach(cb => cb.checked = false);
        }, 300); // Coincidir con duración de transición CSS (0.3s)
    }
}

function anadirMaterialesSeleccionados() {
    const modal = document.getElementById('modalMateriales');
    const textarea = document.getElementById('material');
    if (!modal || !textarea) return;

    const checkboxesSeleccionados = modal.querySelectorAll('.modal-item-checkbox:checked');
    let textoParaAnadir = '';

    checkboxesSeleccionados.forEach(cb => {
        const itemDiv = cb.closest('.modal-item'); // Encontrar el div contenedor del item
        if (itemDiv && itemDiv.dataset.code && itemDiv.dataset.description) {
            // Formato: CODIGO - DESCRIPCION
            textoParaAnadir += `${itemDiv.dataset.code} - ${itemDiv.dataset.description}\n`;
        }
    });

    if (textoParaAnadir) {
        const valorActual = textarea.value.trim();
        // Añadir al final, con un salto de línea si ya había texto
        textarea.value = valorActual + (valorActual ? '\n' : '') + textoParaAnadir.trim();
        // Disparar evento input para que la validación (si existe) se actualice
        textarea.dispatchEvent(new Event('input'));
    }

    cerrarModalMateriales();
}

function filtrarModalMateriales() {
    const input = document.getElementById('modalMaterialesSearchInput');
    const filter = input.value.toUpperCase().trim(); // Convertir a mayúsculas y quitar espacios
    const listaContainer = document.getElementById('modalMaterialesLista');
    const categorias = listaContainer.getElementsByClassName('modal-categoria');

    for (let i = 0; i < categorias.length; i++) {
        const items = categorias[i].getElementsByClassName('modal-item');
        let categoriaVisible = false; // Para saber si mostrar el título de la categoría

        for (let j = 0; j < items.length; j++) {
            const label = items[j].getElementsByTagName('label')[0];
            if (label) {
                const txtValue = label.textContent || label.innerText;
                // Mostrar si el filtro está vacío o si coincide el texto
                if (filter === "" || txtValue.toUpperCase().indexOf(filter) > -1) {
                    items[j].style.display = ""; // Mostrar item
                    categoriaVisible = true; // La categoría tiene al menos un item visible
                } else {
                    items[j].style.display = "none"; // Ocultar item
                }
            }
        }

        // Mostrar u ocultar el título de la categoría basado en si tiene items visibles
        const titulo = categorias[i].querySelector('.modal-categoria-titulo');
        if (titulo) {
            titulo.style.display = categoriaVisible ? "" : "none";
        }
    }
}
// Crear versión debounced para no filtrar en cada tecla
const debouncedFilterMateriales = debounce(filtrarModalMateriales, DEBOUNCE_DELAY);

// Modal Tipo Cirugía
async function abrirModalTipoCx() { // Convertida a async para esperar carga
    const modal = document.getElementById('modalTipoCx');
    const listaContainer = document.getElementById('modalTipoCxLista');
    const searchInput = document.getElementById('modalTipoCxSearchInput');

    if (!modal || !listaContainer || !searchInput) {
        console.error("Elementos del modal de Tipo Cx no encontrados.");
        return;
    }

    // Verificar si los tipos están cargados, si no, intentar cargarlos
    if (listaTiposCxCargada === null) {
        mostrarToast("Cargando tipos de cirugía...", "info");
        await fetchTiposCirugia(); // Esperar a que termine la carga
    }
    if (!listaTiposCxCargada || listaTiposCxCargada.length === 0) {
        mostrarToast("No hay tipos de cirugía disponibles o hubo un error al cargarlos.", "warning");
        return; // No abrir el modal si no hay datos
    }

    searchInput.value = ''; // Limpiar búsqueda
    listaContainer.innerHTML = ''; // Limpiar lista

    listaTiposCxCargada.forEach(tipo => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('modal-item', 'tipo-cx-item'); // Clase específica para filtrar
            itemDiv.dataset.value = tipo; // Guardar valor en dataset
            itemDiv.textContent = tipo;

            // Añadir evento click para seleccionar y cerrar el modal
            itemDiv.onclick = function() {
                anadirTipoCxSeleccionado(tipo);
            };

            listaContainer.appendChild(itemDiv);
        });


    // Mostrar el modal
    modal.classList.add('visible');
    modal.style.display = 'flex';
    searchInput.focus(); // Poner foco en la búsqueda
}

function cerrarModalTipoCx() {
    const modal = document.getElementById('modalTipoCx');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Coincidir con transición CSS
    }
}

function anadirTipoCxSeleccionado(tipoSeleccionado) {
    const inputTipoCx = document.getElementById('tipoCirugia');
    if (inputTipoCx) {
        inputTipoCx.value = tipoSeleccionado;
        // Disparar eventos para validación y posible guardado de sugerencia
        inputTipoCx.dispatchEvent(new Event('input'));
        inputTipoCx.dispatchEvent(new Event('change')); // Importante si se usa para guardar sugerencia
    }
    cerrarModalTipoCx(); // Cerrar modal después de seleccionar
}

function filtrarModalTipoCx() {
    const input = document.getElementById('modalTipoCxSearchInput');
    const filter = input.value.toUpperCase().trim();
    const listaContainer = document.getElementById('modalTipoCxLista');
    const items = listaContainer.getElementsByClassName('tipo-cx-item'); // Usar clase específica

    let found = false;
    for (let i = 0; i < items.length; i++) {
        const txtValue = items[i].textContent || items[i].innerText;
        if (filter === "" || txtValue.toUpperCase().indexOf(filter) > -1) {
            items[i].style.display = "";
            found = true;
        } else {
            items[i].style.display = "none";
        }
    }
    // Opcional: Mostrar mensaje si no se encuentran resultados
    // const noResultsMsg = listaContainer.querySelector('.no-results');
    // if (!found && filter !== "") {
    //     if (!noResultsMsg) {
    //         const msg = document.createElement('p');
    //         msg.textContent = 'No se encontraron coincidencias.';
    //         msg.className = 'no-results';
    //         msg.style.textAlign = 'center';
    //         msg.style.color = '#777';
    //         listaContainer.appendChild(msg);
    //     }
    // } else if (noResultsMsg) {
    //     noResultsMsg.remove();
    // }
}
// Crear versión debounced
const debouncedFilterTipoCx = debounce(filtrarModalTipoCx, DEBOUNCE_DELAY);


// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM completamente cargado y parseado.");

    // Iniciar carga de datos maestros en segundo plano
    fetchTiposCirugia();
    fetchMateriales();

    // Cargar sugerencias iniciales para los datalists
    cargarSugerenciasIniciales('medico', 'medicosList');
    cargarSugerenciasIniciales('instrumentador', 'instrumentadoresList');
    cargarSugerenciasIniciales('lugarCirugia', 'lugaresList');
    cargarSugerenciasIniciales('tipoCirugia', 'tiposCirugiaList');

    // Configurar validación en vivo
    setupValidacion();

    // Establecer fecha actual por defecto
    try {
        const hoy = new Date();
        // Asegurar que la zona horaria no cause problemas al obtener YYYY-MM-DD
        const offset = hoy.getTimezoneOffset();
        const hoyLocal = new Date(hoy.getTime() - (offset*60*1000));
        const fechaISO = hoyLocal.toISOString().split('T')[0];
        const fechaInput = document.getElementById('fechaCirugia');
        if(fechaInput) {
            fechaInput.value = fechaISO;
             // Validar la fecha inicial por si acaso
             validarCampo(fechaInput);
        }
    } catch (e) {
        console.error("Error estableciendo fecha por defecto:", e);
    }

    // Añadir listener para el botón de reintento
    if (retrySaveBtn) {
        retrySaveBtn.addEventListener('click', reintentarGuardado);
    }

    // Añadir listeners para cerrar modales al hacer clic fuera del contenido
    const modalMateriales = document.getElementById('modalMateriales');
    if (modalMateriales) {
        modalMateriales.addEventListener('click', function(event) {
            // Si el clic fue directamente en el overlay (no en el content)
            if (event.target === this) {
                cerrarModalMateriales();
            }
        });
    }

    const modalTipoCx = document.getElementById('modalTipoCx');
    if (modalTipoCx) {
         modalTipoCx.addEventListener('click', function(event) {
            if (event.target === this) {
                cerrarModalTipoCx();
            }
        });
    }

    console.log("Aplicación de Reportes Districorr inicializada.");
});

// --- END OF FILE script.js ---
