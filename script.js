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

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Habilitar persistencia de datos para funcionamiento offline
db.enablePersistence()
  .then(() => {
    console.log("Persistencia habilitada.");
  })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn("Persistencia falló: Múltiples pestañas abiertas?");
    } else if (err.code == 'unimplemented') {
      console.warn("Persistencia no soportada en este navegador.");
    } else {
      console.error("Error al habilitar persistencia:", err);
    }
  });

// --- Constantes ---
const COLECCION_REPORTES = 'reportes';
const COLECCION_SUGERENCIAS = 'sugerencias';
const LOCALSTORAGE_USER_ID = 'usuarioId';

// --- Validación ---

// Configura la validación en tiempo real para campos requeridos
function setupValidacion() {
  const camposRequeridos = [
    { id: 'paciente', errorId: 'error-paciente' },
    { id: 'medico', errorId: 'error-medico' },
    { id: 'lugarCirugia', errorId: 'error-lugar' },
    { id: 'fechaCirugia', errorId: 'error-fecha' },
    { id: 'tipoCirugia', errorId: 'error-tipo' },
    { id: 'material', errorId: 'error-material' }
  ];

  camposRequeridos.forEach(campo => {
    const input = document.getElementById(campo.id);
    const error = document.getElementById(campo.errorId);

    if (!input || !error) {
      console.warn(`Elemento no encontrado para validación: ${campo.id} o ${campo.errorId}`);
      return; // Saltar si falta el input o el div de error
    }

    input.addEventListener('input', () => {
      if (input.value.trim() === '') {
        input.classList.add('campo-invalido');
        error.style.display = 'block';
      } else {
        input.classList.remove('campo-invalido');
        error.style.display = 'none';
      }
    });
    // Ocultar error inicialmente
    error.style.display = 'none';
  });
}

// Valida todo el formulario antes de una acción (generar, copiar, etc.)
function validarFormulario() {
  let valido = true;
  const camposRequeridos = ['paciente', 'medico', 'lugarCirugia', 'fechaCirugia', 'tipoCirugia', 'material'];

  camposRequeridos.forEach(id => {
    const input = document.getElementById(id);
    const error = document.getElementById(`error-${id}`);

    if (!input) {
      console.error(`Elemento input no encontrado para validación: ${id}`);
      valido = false;
      return;
    }
    if (!error) {
      console.warn(`Elemento de error no encontrado para: error-${id}`);
    }

    if (input.value.trim() === '') {
      input.classList.add('campo-invalido');
      if (error) error.style.display = 'block';
      valido = false;
    } else {
      input.classList.remove('campo-invalido');
      if (error) error.style.display = 'none';
    }
  });

  if (!valido) {
      alert('Por favor complete todos los campos requeridos marcados con borde rojo.');
  }
  return valido;
}

// --- Sugerencias (Autocompletado) ---

// Carga sugerencias desde Firestore y actualiza localStorage y datalist
async function cargarSugerenciasIniciales(idInput, idList) {
  const key = `sugerencias_${idInput}`;
  const list = document.getElementById(idList);
  if (!list) {
    console.error(`Datalist no encontrada: ${idList}`);
    return;
  }

  try {
    const snapshot = await db.collection(COLECCION_SUGERENCIAS)
      .where('campo', '==', idInput)
      .orderBy('valor') // Ordenar alfabéticamente desde Firestore
      .get();

    const valores = [];
    snapshot.forEach(doc => {
      valores.push(doc.data().valor);
    });

    const valoresUnicos = [...new Set(valores)]; // Firestore ya devuelve ordenado
    localStorage.setItem(key, JSON.stringify(valoresUnicos));
    actualizarListaDatalist(list, valoresUnicos); // Actualizar la UI
    console.log(`Sugerencias para '${idInput}' cargadas desde Firestore.`);

  } catch (error) {
    console.error(`Error cargando sugerencias para '${idInput}' desde Firestore:`, error);
    // Intentar cargar desde localStorage como fallback
    const valoresLocalStorage = JSON.parse(localStorage.getItem(key) || "[]");
    actualizarListaDatalist(list, valoresLocalStorage);
    console.log(`Sugerencias para '${idInput}' cargadas desde localStorage (fallback).`);
  }
}

// Configura un campo de input para guardar nuevas sugerencias y actualizar su datalist
function actualizarSugerencias(idInput, idList) {
  const input = document.getElementById(idInput);
  const list = document.getElementById(idList);

  if (!input || !list) {
    console.warn(`Input (${idInput}) o Datalist (${idList}) no encontrado para sugerencias.`);
    return;
  }

  const key = `sugerencias_${idInput}`;

  // Cargar sugerencias iniciales al inicio
  cargarSugerenciasIniciales(idInput, idList);

  // Evento para guardar una nueva sugerencia cuando el usuario la ingresa
  input.addEventListener('change', async () => {
    const nuevoValor = input.value.trim();
    if (!nuevoValor) return; // No guardar valores vacíos

    let valoresActuales = JSON.parse(localStorage.getItem(key) || "[]");

    // Convertir a minúsculas para comparación insensible a mayúsculas/minúsculas
    const lowerCaseNuevoValor = nuevoValor.toLowerCase();
    const existe = valoresActuales.some(v => v.toLowerCase() === lowerCaseNuevoValor);

    if (!existe) {
      valoresActuales.push(nuevoValor);
      valoresActuales.sort((a, b) => a.localeCompare(b)); // Mantener ordenado alfabéticamente
      localStorage.setItem(key, JSON.stringify(valoresActuales));
      actualizarListaDatalist(list, valoresActuales);

      try {
        // Guardar en Firestore (las reglas ya permiten esto)
        await db.collection(COLECCION_SUGERENCIAS).add({
          campo: idInput,
          valor: nuevoValor,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Sugerencia '${nuevoValor}' para '${idInput}' guardada en Firestore.`);
      } catch (error) {
        console.error("Error guardando sugerencia en Firestore:", error);
        // Podríamos implementar una cola para reintentar más tarde si falla el guardado
      }
    }
  });

  // Cargar lista inicial desde localStorage (más rápido que esperar a Firestore siempre)
  const valoresIniciales = JSON.parse(localStorage.getItem(key) || "[]");
  actualizarListaDatalist(list, valoresIniciales);
}

// Helper para actualizar el contenido de un <datalist>
function actualizarListaDatalist(datalistElement, valores) {
  datalistElement.innerHTML = ''; // Limpiar opciones existentes
  valores.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    datalistElement.appendChild(opt);
  });
}

// --- Obtención y Formateo de Datos ---

// Obtiene todos los datos del formulario
function obtenerDatos() {
  const getValue = (id) => document.getElementById(id)?.value || '';

  return {
    paciente: getValue('paciente').trim(),
    medico: getValue('medico').trim(),
    instrumentador: getValue('instrumentador').trim(),
    lugarCirugia: getValue('lugarCirugia').trim(),
    fechaCirugia: getValue('fechaCirugia'), // Formato YYYY-MM-DD
    tipoCirugia: getValue('tipoCirugia').trim(),
    material: getValue('material').trim(), // Texto plano multilínea
    observaciones: getValue('observaciones').trim(),
    mensajeInicio: getValue('mensajeInicio'),
    infoAdicional: getValue('infoAdicional').trim(),
    formato: getValue('formato'), // 'formal', 'moderno', 'detallado'
    // Timestamp se añadirá al guardar en Firebase
    // Usuario se añadirá al guardar en Firebase
  };
}

// Formatea la lista de materiales como una tabla HTML
function formatearMaterialParaHTML(materialTexto) {
  if (!materialTexto || materialTexto.trim() === '') return '<p>No especificado</p>';

  const lineas = materialTexto.split('\n')
    .map(l => l.trim())
    .filter(l => l); // Limpiar y filtrar líneas vacías

  if (lineas.length === 0) return '<p>No especificado</p>';

  let html = '<table class="material-table"><tbody>';
  lineas.forEach(linea => {
    const lineaEscapada = linea.replace(/</g, "<").replace(/>/g, ">"); // Escapar HTML básico
    html += `<tr><td>${lineaEscapada}</td></tr>`;
  });
  html += '</tbody></table>';
  return html;
}

// Formatea la fecha para mostrarla al usuario
function formatearFechaUsuario(fechaISO) { // fechaISO es YYYY-MM-DD
    if (!fechaISO) return 'No especificada';
    try {
        // Crear fecha asegurando que se interprete como local, no UTC.
        // Añadir hora para evitar problemas de cambio de día por zona horaria.
        const partes = fechaISO.split('-');
        if (partes.length !== 3) return fechaISO; // Devolver original si no es formato esperado
        const fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]), 12, 0, 0); // Mes es 0-indexado, poner mediodía
        return fecha.toLocaleDateString('es-AR', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        });
    } catch (e) {
        console.error("Error formateando fecha:", e);
        return fechaISO; // Devolver como viene si falla
    }
}


// --- Acciones Principales ---

// Genera el HTML del reporte y lo muestra en la página
function generarTexto() {
  if (!validarFormulario()) return;

  const datos = obtenerDatos();
  const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia);
  const contenidoMaterialHTML = formatearMaterialParaHTML(datos.material);

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
    </div>`;

  const resultadoContainer = document.getElementById('resultado-container');
  resultadoContainer.innerHTML = reporteHTML;
  resultadoContainer.style.display = 'block';
  resultadoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

  mostrarToast('✅ Reporte generado. Listo para copiar o enviar.', 'success');
}

// Copia el texto plano del reporte al portapapeles y guarda los datos en Firebase
async function copiarTexto() {
  if (!validarFormulario()) return;

  const resultadoContainer = document.getElementById('resultado-container');
  if (!resultadoContainer.querySelector('.reporte-contenido') || resultadoContainer.style.display === 'none') {
    alert('Primero debe generar un reporte usando el botón "📝 Generar Texto".');
    return;
  }

  const datosParaGuardar = obtenerDatos();
  const fechaFormateada = formatearFechaUsuario(datosParaGuardar.fechaCirugia);

  // Generar texto plano para el portapapeles
  let textoPlano = `${datosParaGuardar.mensajeInicio || 'Detalles de la cirugía programada:'}\n\n` +
                   `Paciente: ${datosParaGuardar.paciente}\n` +
                   `Tipo de Cirugía: ${datosParaGuardar.tipoCirugia}\n` +
                   `Médico Responsable: ${datosParaGuardar.medico}\n` +
                   `Instrumentador: ${datosParaGuardar.instrumentador || 'No especificado'}\n` +
                   `Fecha de Cirugía: ${fechaFormateada}\n` +
                   `Lugar: ${datosParaGuardar.lugarCirugia}\n\n` +
                   `Material Requerido:\n${datosParaGuardar.material || 'No especificado'}\n\n`;
  if (datosParaGuardar.observaciones) textoPlano += `Observaciones:\n${datosParaGuardar.observaciones}\n\n`;
  if (datosParaGuardar.infoAdicional) textoPlano += `Información Adicional:\n${datosParaGuardar.infoAdicional}\n`;

  let copiadoExitoso = false;
  let guardadoExitoso = false;

  try {
    await navigator.clipboard.writeText(textoPlano);
    copiadoExitoso = true;
    console.log('Texto plano copiado al portapapeles.');
  } catch (err) {
    console.error('Error al copiar texto al portapapeles:', err);
  }

  try {
    await guardarEnFirebase(datosParaGuardar);
    guardadoExitoso = true;
    console.log('Reporte guardado en Firestore.');
  } catch (err) {
    // El error ya se loguea dentro de guardarEnFirebase
    console.error('Fallo en la operación de guardado iniciada por copiarTexto.');
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
}

// Guarda los datos del reporte en la colección 'reportes' de Firestore
async function guardarEnFirebase(data) {
  try {
    let usuarioId = localStorage.getItem(LOCALSTORAGE_USER_ID);
    if (!usuarioId) {
      usuarioId = Math.random().toString(36).substring(2, 10); // ID aleatorio simple
      localStorage.setItem(LOCALSTORAGE_USER_ID, usuarioId);
    }
    data.usuario = usuarioId;
    data.timestamp = firebase.firestore.FieldValue.serverTimestamp(); // Usar hora del servidor

    const docRef = await db.collection(COLECCION_REPORTES).add(data);
    console.log('Reporte guardado en Firestore con ID:', docRef.id);
    return docRef;
  } catch (error) {
    console.error('Error detallado guardando reporte en Firestore:', error);
    throw error; // Relanzar para que la función que llama sepa que falló
  }
}

// --- Funciones Auxiliares y de Interfaz ---

// Muestra una notificación toast
function mostrarToast(mensaje, tipo = 'info') { // tipos: info, success, warning, error
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = mensaje;
  toast.className = 'toast-notification'; // Clase base

  switch (tipo) {
    case 'success':
      toast.classList.add('success');
      break;
    case 'warning':
      toast.classList.add('warning');
      break;
    case 'error':
      toast.classList.add('error');
      break;
    case 'info':
    default:
      toast.classList.add('info');
      break;
  }

  toast.style.display = 'block';
  // Ocultar después de unos segundos
  setTimeout(() => {
      toast.style.display = 'none';
      toast.className = 'toast-notification'; // Resetear clases
    }, tipo === 'error' || tipo === 'warning' ? 6000 : 4000); // Más tiempo para errores/warnings
}

// --- Otras Acciones (Compartir, Imprimir, etc.) ---

function compartirWhatsApp() {
  if (!validarFormulario()) return;
  const resultadoContainer = document.getElementById('resultado-container');
   if (!resultadoContainer.querySelector('.reporte-contenido') || resultadoContainer.style.display === 'none') {
       mostrarToast('Primero genere un reporte para compartir.', 'warning');
       return;
   }

  const datos = obtenerDatos();
  const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia);
  let textoPlano = `*Reporte de Cirugía Districorr*\n\n` + // Añadir título
                 `${datos.mensajeInicio || 'Detalles:'}\n\n` +
                 `*Paciente:* ${datos.paciente}\n` +
                 `*Tipo Cirugía:* ${datos.tipoCirugia}\n` +
                 `*Médico:* ${datos.medico}\n` +
                 (datos.instrumentador ? `*Instrumentador:* ${datos.instrumentador}\n` : '') +
                 `*Fecha:* ${fechaFormateada}\n` +
                 `*Lugar:* ${datos.lugarCirugia}\n\n` +
                 `*Material Requerido:*\n${datos.material || '-'}\n\n` +
                 (datos.observaciones ? `*Observaciones:*\n${datos.observaciones}\n\n` : '') +
                 (datos.infoAdicional ? `*Info Adicional:*\n${datos.infoAdicional}\n` : '');

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoPlano)}`;
  window.open(whatsappUrl, '_blank');
}

function enviarPorEmail() {
  if (!validarFormulario()) return;
   const resultadoContainer = document.getElementById('resultado-container');
   if (!resultadoContainer.querySelector('.reporte-contenido') || resultadoContainer.style.display === 'none') {
       mostrarToast('Primero genere un reporte para enviar.', 'warning');
       return;
   }

  const datos = obtenerDatos();
  const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia);
  const subject = `Reporte Cirugía: ${datos.paciente} - ${datos.tipoCirugia} (${fechaFormateada})`;

  let body = `${datos.mensajeInicio || 'Detalles de la cirugía programada:'}\n\n` +
             `Paciente: ${datos.paciente}\n` +
             `Tipo de Cirugía: ${datos.tipoCirugia}\n` +
             `Médico Responsable: ${datos.medico}\n` +
             `Instrumentador: ${datos.instrumentador || 'No especificado'}\n` +
             `Fecha de Cirugía: ${fechaFormateada}\n` +
             `Lugar: ${datos.lugarCirugia}\n\n` +
             `Material Requerido:\n${datos.material || 'No especificado'}\n\n`;
  if (datos.observaciones) body += `Observaciones:\n${datos.observaciones}\n\n`;
  if (datos.infoAdicional) body += `Información Adicional:\n${datos.infoAdicional}\n\n`;
  body += `--\nGenerado con App Districorr`; // Firma simple

  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
}

function imprimirReporte() {
  if (!validarFormulario()) return;
  const resultadoContainer = document.getElementById('resultado-container');
   if (!resultadoContainer.querySelector('.reporte-contenido') || resultadoContainer.style.display === 'none') {
       mostrarToast('Primero genere un reporte para imprimir.', 'warning');
       return;
   }

  const ventanaImpresion = window.open('', '_blank', 'height=700,width=900');
  ventanaImpresion.document.write('<html><head><title>Reporte de Cirugía - Districorr</title>');
  ventanaImpresion.document.write('<link rel="stylesheet" href="style.css">'); // Linkear CSS existente
  // Estilos adicionales solo para impresión
  ventanaImpresion.document.write(`
    <style>
      body { margin: 25px; background: #fff; }
      .reporte-contenido { border: none; box-shadow: none; margin: 0; padding: 0; }
      .container { box-shadow: none; padding: 0; }
      button, .btn-link, .credit, .form-group, header h4, .text-center { display: none; } /* Ocultar elementos no deseados */
      .reporte-box { border-left: none !important; background-color: transparent !important; }
      ul { padding-left: 20px; }
      li { margin-bottom: 5px; }
      h3, h4 { margin-top: 15px; margin-bottom: 5px; }
      .material-table td { border: 1px solid #ccc; font-size: 10pt; }
      img { max-height: 60px !important; }
      @page { size: A4; margin: 20mm; } /* Configuración de página */
    </style>
  `);
  ventanaImpresion.document.write('</head><body>');
  // Solo copiar el contenido del reporte, no todo el container
  ventanaImpresion.document.write(resultadoContainer.querySelector('.reporte-contenido').outerHTML);
  ventanaImpresion.document.write('</body></html>');
  ventanaImpresion.document.close();
  ventanaImpresion.focus();

  // Dar tiempo para cargar estilos y contenido
  setTimeout(() => {
    ventanaImpresion.print();
    ventanaImpresion.close();
  }, 750);
}

async function generarImagen() {
  if (!validarFormulario()) return;
  const resultadoContainer = document.getElementById('resultado-container');
  const reporteContenido = resultadoContainer.querySelector('.reporte-contenido');

  if (!reporteContenido || resultadoContainer.style.display === 'none') {
     mostrarToast('Primero genere un reporte para guardar como imagen.', 'warning');
    return;
  }

  // Verificar si html2canvas está cargado
  if (typeof html2canvas === 'undefined') {
      mostrarToast('Error: Librería html2canvas no cargada.', 'error');
      console.error("html2canvas is not loaded");
      return;
  }

  mostrarToast('⏳ Generando imagen...', 'info');
  document.body.classList.add('loading'); // Opcional: mostrar spinner

  try {
    const canvas = await html2canvas(reporteContenido, {
      scale: 2, // Mejor resolución
      useCORS: true, // Para la imagen del logo si es de otro dominio
      backgroundColor: '#ffffff', // Fondo blanco explícito
      logging: false // Desactivar logs de html2canvas en consola
    });

    const imgData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const datos = obtenerDatos();
    const fechaStr = datos.fechaCirugia || 'sinfecha';
    const nombreArchivo = `Reporte_${datos.paciente}_${fechaStr}.png`.replace(/[^a-z0-9_\-\.]/gi, '_');
    link.download = nombreArchivo;
    link.href = imgData;
    link.click();

    mostrarToast('✅ Imagen generada y descargada.', 'success');

  } catch (error) {
    console.error('Error al generar la imagen con html2canvas:', error);
    mostrarToast('❌ Error al generar la imagen. Revise la consola.', 'error');
  } finally {
      document.body.classList.remove('loading'); // Ocultar spinner
  }
}

function verEstadisticas() {
  // Redirigir a admin.html que ya muestra los reportes
   window.location.href = 'admin.html';
   // Si quisieras una página dedicada a estadísticas, la crearías y enlazarías aquí.
   // mostrarToast('Funcionalidad de estadísticas detalladas no implementada.', 'info');
}

// --- Inicialización al Cargar la Página ---

document.addEventListener('DOMContentLoaded', () => {
  // Firebase ya está inicializado arriba

  // Configurar autocompletados y cargar sugerencias iniciales
  actualizarSugerencias('medico', 'medicosList');
  actualizarSugerencias('instrumentador', 'instrumentadoresList');
  actualizarSugerencias('lugarCirugia', 'lugaresList');
  actualizarSugerencias('tipoCirugia', 'tiposCirugiaList'); // <- Esta línea carga los tipos de cirugía

  // Configurar validación en tiempo real
  setupValidacion();

  // Establecer fecha actual por defecto en el campo de fecha
  try {
      const hoy = new Date();
      // Formatear a YYYY-MM-DD teniendo en cuenta la zona horaria local
      const anio = hoy.getFullYear();
      const mes = String(hoy.getMonth() + 1).padStart(2, '0'); // Meses son 0-11
      const dia = String(hoy.getDate()).padStart(2, '0');
      document.getElementById('fechaCirugia').value = `${anio}-${mes}-${dia}`;
  } catch (e) {
      console.error("Error estableciendo fecha por defecto:", e);
  }

  console.log("Aplicación de Reportes Districorr inicializada.");
});

// --- END OF FILE script.js ---
