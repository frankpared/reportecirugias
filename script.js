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

// Habilitar persistencia de datos para funcionamiento offline
db.enablePersistence()
  .catch((err) => {
    console.error("Error al habilitar persistencia:", err);
  });

// Validación en tiempo real
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

    input.addEventListener('input', () => {
      if (input.value.trim() === '') {
        input.classList.add('campo-invalido');
        error.style.display = 'block';
      } else {
        input.classList.remove('campo-invalido');
        error.style.display = 'none';
      }
    });
  });
}

// Validar formulario antes de enviar
function validarFormulario() {
  let valido = true;
  const camposRequeridos = ['paciente', 'medico', 'lugarCirugia', 'fechaCirugia', 'tipoCirugia', 'material'];

  camposRequeridos.forEach(id => {
    const input = document.getElementById(id);
    const error = document.getElementById(`error-${id}`);
    
    if (input.value.trim() === '') {
      input.classList.add('campo-invalido');
      error.style.display = 'block';
      valido = false;
    }
  });

  return valido;
}

// Cargar sugerencias iniciales desde Firestore
async function cargarSugerenciasIniciales(idInput, idList) {
  const key = `sugerencias_${idInput}`;
  try {
    const snapshot = await db.collection('sugerencias')
      .where('campo', '==', idInput)
      .get();
    
    const valores = [];
    snapshot.forEach(doc => {
      valores.push(doc.data().valor);
    });
    
    // Eliminar duplicados
    const valoresUnicos = [...new Set(valores)];
    localStorage.setItem(key, JSON.stringify(valoresUnicos));
    
    // Actualizar datalist
    const list = document.getElementById(idList);
    list.innerHTML = '';
    valoresUnicos.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      list.appendChild(opt);
    });
  } catch (error) {
    console.error("Error cargando sugerencias:", error);
  }
}

// Actualiza sugerencias en localStorage y Firebase
function actualizarSugerencias(idInput, idList) {
  const input = document.getElementById(idInput);
  const list = document.getElementById(idList);
  const key = `sugerencias_${idInput}`;
  const valores = JSON.parse(localStorage.getItem(key) || "[]");

  // Cargar sugerencias iniciales
  cargarSugerenciasIniciales(idInput, idList);

  input.addEventListener('change', async () => {
    const nuevo = input.value.trim();
    if (nuevo && !valores.includes(nuevo)) {
      valores.push(nuevo);
      localStorage.setItem(key, JSON.stringify(valores));
      actualizarLista();
      try {
        await db.collection('sugerencias').add({ campo: idInput, valor: nuevo });
      } catch (error) {
        console.error("Error guardando sugerencia en Firestore:", error);
      }
    }
  });

  function actualizarLista() {
    list.innerHTML = '';
    valores.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      list.appendChild(opt);
    });
  }

  actualizarLista();
}

// Obtener datos del formulario
function obtenerDatos() {
  return {
    paciente: document.getElementById('paciente')?.value || '',
    medico: document.getElementById('medico')?.value || '',
    instrumentador: document.getElementById('instrumentador')?.value || '',
    lugarCirugia: document.getElementById('lugarCirugia')?.value || '',
    fechaCirugia: document.getElementById('fechaCirugia')?.value || '',
    tipoCirugia: document.getElementById('tipoCirugia')?.value || '',
    material: document.getElementById('material')?.value || '',
    observaciones: document.getElementById('observaciones')?.value || '',
    mensajeInicio: document.getElementById('mensajeInicio')?.value || '',
    infoAdicional: document.getElementById('infoAdicional')?.value || '',
    formato: document.getElementById('formato')?.value || 'formal',
    timestamp: firebase.firestore.Timestamp.now(),
    usuario: localStorage.getItem('usuarioId') || 'anonimo'
  };
}

// Formatear material en tabla
function formatearMaterial(material) {
  if (!material) return 'No especificado';
  
  const lineas = material.split('\n').filter(l => l.trim());
  if (lineas.length === 0) return 'No especificado';
  
  let html = '<table class="material-table"><tbody>';
  lineas.forEach(linea => {
    html += `<tr><td>${linea}</td></tr>`;
  });
  html += '</tbody></table>';
  
  return html;
}

// Generar texto de reporte
function generarTexto() {
  if (!validarFormulario()) {
    alert('Por favor complete todos los campos requeridos');
    return;
  }

  const datos = obtenerDatos();
  const fecha = datos.fechaCirugia ? new Date(`${datos.fechaCirugia}T00:00:00`) : new Date();
  const fechaFormateada = fecha.toLocaleDateString('es-AR');

  let contenidoMaterial = formatearMaterial(datos.material);

  const reporte = `
    <div class="reporte-contenido">
      <img src="https://i.imgur.com/aA7RzTN.png" alt="Logo Districorr" style="max-height: 70px; margin-bottom: 12px; display: block; margin: 0 auto;">
      <h3>📝 Reporte de Cirugía</h3>
      <p>${datos.mensajeInicio}</p>
      <ul>
        <li><strong>Paciente:</strong> ${datos.paciente}</li>
        <li><strong>Tipo de Cirugía:</strong> ${datos.tipoCirugia}</li>
        <li><strong>Médico Responsable:</strong> ${datos.medico}</li>
        <li><strong>Instrumentador:</strong> ${datos.instrumentador}</li>
        <li><strong>Fecha de Cirugía:</strong> ${fechaFormateada}</li>
        <li><strong>Lugar:</strong> ${datos.lugarCirugia}</li>
      </ul>
      <h4>Material Requerido:</h4>
      ${contenidoMaterial}
      <h4>Observaciones:</h4>
      <p>${datos.observaciones || 'Ninguna'}</p>
      <h4>Información Adicional:</h4>
      <p>${datos.infoAdicional || 'Ninguna'}</p>
    </div>`;

  const resultado = document.getElementById('resultado-container');
  resultado.innerHTML = reporte;
  resultado.style.display = 'block';

  const toast = document.getElementById('toast');
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// Copiar texto generado y guardar en Firestore
async function copiarTexto() {
  if (!validarFormulario()) {
    alert('Por favor complete todos los campos requeridos');
    return;
  }

  const resultado = document.getElementById('resultado-container');
  if (!resultado || resultado.style.display === 'none') {
    alert('Primero genere un reporte');
    return;
  }

  try {
    await navigator.clipboard.writeText(resultado.innerText);
    await guardarEnFirebase(obtenerDatos());
    alert('Texto copiado y guardado correctamente');
  } catch (err) {
    console.error('Error al copiar:', err);
    alert('Error al copiar texto');
  }
}

// Guardar reporte en Firestore
async function guardarEnFirebase(data) {
  try {
    // Generar ID de usuario si no existe
    if (!localStorage.getItem('usuarioId')) {
      localStorage.setItem('usuarioId', Math.random().toString(36).substring(2, 15));
    }
    
    data.usuario = localStorage.getItem('usuarioId');
    
    await db.collection('reportes').add(data);
    console.log('Reporte guardado en Firestore');
  } catch (error) {
    console.error('Error guardando reporte:', error);
    throw error;
  }
}

// Otras funciones permanecen igual (compartirWhatsApp, enviarPorEmail, generarImagen, imprimirReporte, verEstadisticas)

// Inicialización de autocompletados y validación
document.addEventListener('DOMContentLoaded', () => {
  actualizarSugerencias('medico', 'medicosList');
  actualizarSugerencias('instrumentador', 'instrumentadoresList');
  actualizarSugerencias('lugarCirugia', 'lugaresList');
  actualizarSugerencias('tipoCirugia', 'tiposCirugiaList');
  setupValidacion();
});
