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

// Actualiza sugerencias en localStorage y Firebase
function actualizarSugerencias(idInput, idList) {
  const input = document.getElementById(idInput);
  const list = document.getElementById(idList);
  const key = `sugerencias_${idInput}`;
  const valores = JSON.parse(localStorage.getItem(key) || "[]");

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

// Obtiene datos del formulario
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
    timestamp: firebase.firestore.Timestamp.now()
  };
}

// Genera texto de reporte
function generarTexto() {
  const datos = obtenerDatos();
  const fecha = datos.fechaCirugia ? new Date(`${datos.fechaCirugia}T00:00:00`) : new Date();
  const fechaFormateada = fecha.toLocaleDateString('es-AR');

  let contenidoMaterial = datos.material ? `<pre>${datos.material}</pre>` : 'No especificado';

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
function copiarTexto() {
  const resultado = document.getElementById('resultado-container');
  if (!resultado || resultado.style.display === 'none') {
    alert('Primero genere un reporte');
    return;
  }
  navigator.clipboard.writeText(resultado.innerText).then(() => {
    guardarEnFirebase(obtenerDatos());
    alert('Texto copiado y guardado correctamente');
  }).catch(err => {
    console.error('Error al copiar:', err);
    alert('Error al copiar texto');
  });
}

// Guardar reporte en Firestore
function guardarEnFirebase(data) {
  db.collection('reportes').add(data)
    .then(() => console.log('Reporte guardado en Firestore'))
    .catch(error => console.error('Error guardando reporte:', error));
}

// Compartir WhatsApp
function compartirWhatsApp() {
  const resultado = document.getElementById('resultado-container');
  if (!resultado || resultado.style.display === 'none') {
    alert('Primero genere un reporte');
    return;
  }
  const mensaje = encodeURIComponent(resultado.innerText);
  window.open(`https://wa.me/?text=${mensaje}`, '_blank');
}

// Enviar por Email
function enviarPorEmail() {
  const resultado = document.getElementById('resultado-container');
  if (!resultado || resultado.style.display === 'none') {
    alert('Primero genere un reporte');
    return;
  }
  const asunto = encodeURIComponent('Reporte de Cirugía');
  const cuerpo = encodeURIComponent(resultado.innerText);
  window.location.href = `mailto:?subject=${asunto}&body=${cuerpo}`;
}

// Generar imagen
function generarImagen() {
  const elemento = document.getElementById('resultado-container');
  if (!elemento || elemento.style.display === 'none') {
    alert('Primero genere un reporte');
    return;
  }
  html2canvas(elemento).then(canvas => {
    const link = document.createElement('a');
    link.download = 'reporte-cirugia.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

// Imprimir reporte
function imprimirReporte() {
  const resultado = document.getElementById('resultado-container');
  if (!resultado || resultado.style.display === 'none') {
    alert('Primero genere un reporte');
    return;
  }
  const ventana = window.open('', '', 'width=800,height=600');
  ventana.document.write(`
    <html>
    <head><title>Imprimir Reporte</title></head>
    <body>${resultado.innerHTML}</body>
    </html>
  `);
  ventana.document.close();
  ventana.print();
}

// Ver estadísticas
function verEstadisticas() {
  window.location.href = 'admin.html';
}

// Inicialización de autocompletados
document.addEventListener('DOMContentLoaded', () => {
  actualizarSugerencias('medico', 'medicosList');
  actualizarSugerencias('instrumentador', 'instrumentadoresList');
  actualizarSugerencias('lugarCirugia', 'lugaresList');
});
