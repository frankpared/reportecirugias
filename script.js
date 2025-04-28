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

// --- Base de Datos de Materiales ---
const baseDeDatosMateriales = {
  "CIRUGIA MINIMAMENTE INVASIVA": [
    { code: "TR-T00TCU-001", description: "TORNILLO TITANIO 4,5/6,5 CANULADO SERIE 001" }, { code: "TR-T00TCU-002", description: "TORNILLO TITANIO 4,5/6,5 CANULADO SERIE 002" }, { code: "TR-T70TCU-001", description: "TORNILLO TITANIO 7,0 CANULADO SERIE 001" }, { code: "TR-T35TCU-001", description: "TORNILLO TITANIO 3,5 CANULADO SERIE 001" }, { code: "TR-T35TCU-002", description: "TORNILLO TITANIO 3,5 CANULADO SERIE 002" }, { code: "TR-T35TCU-003", description: "TORNILLO TITANIO 3,5 CANULADO SERIE 003" }, { code: "HE-T30CNU-001", description: "TORNILLO TITANIO 3,0 CANULADO HERBERT SERIE 001" }, { code: "HE-T00HMU-001", description: "TORNILLO TITANIO 2,0/2,5 CANULADO MICROHERBERT SERIE 001" }, { code: "HE-T00HMU-002", description: "TORNILLO TITANIO 2,0/2,5 CANULADO MICROHERBERT SERIE 002" }, { code: "OS-T15MCU-002", description: "TORNILLO TITANIO 1,5/2,0 MICRO SERIE 001" }, { code: "OS-T25MCU-002", description: "TORNILLO TITANIO 2,5 MICRO SERIE 002" }
  ],
  "CLAVOS ENDOMEDULARES": [
    { code: "CL-T00FRP-001", description: "CAJA FEMUR TITANIO 001 IMPLANTES" }, { code: "CL-T00FRI-001", description: "INSTRUMENTAL FEMUR TITANIO 001" }, { code: "CL-T00FRP-002", description: "CAJA FEMUR TITANIO 002 IMPLANTES" }, { code: "CL-T00FRI-002", description: "INSTRUMENTAL FEMUR TITANIO 002" }, { code: "CL-A00FRP-001", description: "CAJA FEMUR ACERO 001 IMPLANTES" }, { code: "CL-A00FRI-001", description: "INSTRUMENTAL FEMUR ACERO 001" }, { code: "CL-T00FXI-001", description: "CAJA INSTRUMENTAL EXPERT TITANIO 001" }, { code: "CL-TI1FXP-001", description: "IMPLANTE IZQUIERDA EXPERT TITANIO 001" }, { code: "CL-AD2FXP-001", description: "IMPLANTE DERECHA EXPERT TITANIO 002" }, { code: "CL-T00TBP-001", description: "CAJA TIBIA TITANIO 001 IMPLANTES" }, { code: "CL-T00TBI-001", description: "INSTRUMENTAL TIBIA TITANIO 001" }, { code: "CL-T00TBP-002", description: "CAJA TIBIA TITANIO 002 IMPLANTES" }, { code: "CL-T00TBI-002", description: "INSTRUMENTAL TIBIA TITANIO 002" }, { code: "CL-T00TXP-001", description: "CAJA TIBIA EXPERT TITANIO 001 IMPLANTES" }, { code: "CL-T00TXI-001", description: "INSTRUMENTAL TIBIA EXPERT 001" }, { code: "CL-A00TBP-001", description: "CAJA TIBIA ACERO 001 IMPLANTES" }, { code: "CL-A00TBI-001", description: "INSTRUMENTAL TIBIA ACERO" }, { code: "CL-T00TAP-001", description: "CAJA TIBIA C/ ANTIBIOTICO MULTIACERROJADO IMPLANTES" }, { code: "CL-T00TAI-001", description: "INSTRUMENTAL TIBIA C/ ANTIBIOTICO MULTIACERROJADO" }, { code: "CL-T00HGP-001", description: "CAJA HUMERO TIPO \"G\" 001 IMPLANTES" }, { code: "CL-T00HGI-001", description: "INSTRUMENTAL HUMERO TIPO \"G\" 001" }, { code: "CL-T00HRP-001", description: "CAJA HUMERO 001 IMPLANTES" }, { code: "CL-T00HRI-001", description: "INSTRUMENTAL HUMERO 001" }, { code: "RC-T00GMC-001", description: "CONTENEDOR GAMMA TITANIO 001 IMPLANTES" }, { code: "RC-T00GMI-001", description: "INSTRUMENTAL GAMMA TITANIO 001" }, { code: "RC-T00GMC-002", description: "CONTENEDOR GAMMA TITANIO 002 IMPLANTES" }, { code: "RC-T00GMI-002", description: "INSTRUMENTAL GAMMA TITANIO 002" }
  ],
  "EXTRACCION Y REVISION DE IMPLANTES": [
    { code: "EX-X00OCI-002", description: "SET DE EXTRACCION DE CLAVOS 3.5/4.5" }, { code: "EX-X00OCI-001", description: "SET EXTRACCION DE CLAVO 001" }, { code: "EX-X00MRI-001", description: "EXTRACCION MORELAN 001" }, { code: "ST-X00DSI-001", description: "SET DE DESCEMENTACION 001" }, { code: "RC-X00ECC-001", description: "ESPACIADOR CON GENTAMICINA CADERA 001" }
  ],
  "OSTEOSINTESIS": [
    { code: "RD-X00PLI-001", description: "CAJA DE REDUCCION INSTRUMENTAL PELVIS 001" }, { code: "PC-A00DHU-001", description: "CAJA TUTOR AO ACERO 001" }, { code: "OS-T35TPU-001", description: "CAJA OSTEOSINTESIS TIBIA DISTAL 3,5 SERIE 001" }, { code: "ST-T35TDP-001", description: "SET TIBIA DISTAL ANTERIOR 3,5 001 IMPLANTES" }, { code: "MT-SIMTLB-001", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 001" }, { code: "OS-T35CLU-002", description: "CAJA OSTEOSINTESIS CLAVICULA 3,5 SERIE 002" }, { code: "ST-T35CLP-002", description: "SET PLACA P/ CLAVICULA 3,5 TITANIO 002" }, { code: "MT-SIMTLB-002", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 002" }, { code: "OS-T35VLU-003", description: "CAJA OSTEOSINTESIS VOLAR 3,5 003" }, { code: "ST-T35VLP-003", description: "SET DE PLACA VOLAR TITANIO 003" }, { code: "MT-SIMTLB-003", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 003" }, { code: "OS-T35VLU-004", description: "CAJA OSTEOSINTESIS VOLAR 3,5 004" }, { code: "ST-T35VLP-004", description: "SET DE PLACA VOLAR TITANIO 004" }, { code: "MT-SIMTLB-004", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 004" }, { code: "OS-T35TDU-005", description: "OSTEOSINTESIS TIBIA PROXIMAL 3,5 SERIE 005" }, { code: "ST-T35TPP-005", description: "SET PLACA TIBIA PROXIMAL 3.5 TITANIO 005" }, { code: "MT-SIMTLB-005", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 005" }, { code: "OS-T35DCU-006", description: "OSTEOSINTESIS DCP/TERCIOTUBO 3,5 SERIE 006" }, { code: "ST-T35TDP-006", description: "SET PLACA DCP 013 / SET PLACA TERCIO TUBO 006" }, { code: "MT-SIMTLB-006", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 006" }, { code: "OS-T35DTU-007", description: "OSTEOSINTESIS DCP/TERCIOTUBO 3,5 SERIE 007" }, { code: "ST-T35TDP-007", description: "SET PLACA 1/3 TUBO / SET PLACA DCP 007" }, { code: "MT-SIMTLB-007", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 007" }, { code: "OS-T35DTU-008", description: "OSTEOSINTESIS DCP/TERCIOTUBO 3,5 SERIE 008" }, { code: "ST-T35TDP-008", description: "SET PLACA 1/3 TUBO / SET PLACA DCP 008" }, { code: "OS-T35VLU-009", description: "OSTEOSINTESIS VOLAR 3,5 SERIE 009" }, { code: "ST-T35VLP-009", description: "SET DE PLACA VOLAR TITANIO 009" }, { code: "MT-SIMTLB-009", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 009" }, { code: "OS-T35OLU-010", description: "OSTEOSINTESIS OLECRANO 3,5 SERIE 010" }, { code: "ST-T35OLP-010", description: "SET PLACA OLECRANON TITANIO 010" }, { code: "ST-T35PYP-010", description: "SET TITANIO 3.5 PLACA EN Y IMPLANTE 010" }, { code: "MT-SIMTLB-010", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 010" }, { code: "OS-T35CPU-011", description: "OSTEOSINTESIS CALCANEO/PHILO 3,5 SERIE 011" }, { code: "ST-T35OLP-011", description: "SET PLACA PHILO TIT 11" }, { code: "ST-T35CCP-011", description: "SET PLACAS CALCANEO TITANIO 011" }, { code: "MT-SIMTLB-011", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 011" }, { code: "OS-T35CLU-012", description: "OSTEOSINTESIS CLAVICULA 3,5 SERIE 012" }, { code: "ST-T35CLP-012", description: "SET PLACA P/ CLAVICULA 3,5 TITANIO 012" }, { code: "MT-SIMTLB-012", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 012" }, { code: "OS-T35DTU-013", description: "OSTEOSINTESIS DCP/TERCIOTUBO 3,5 SERIE 013" }, { code: "ST-T35TDP-013", description: "SET PLACA 1/3 TUBO / SET PLACA DCP 013" }, { code: "MT-SIMTLB-013", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 013" }, { code: "OS-A35XXU-001", description: "OSTEOSINTESIS 3,5 ACERO 001" }, { code: "OS-A35XXU-002", description: "OSTEOSINTESIS 3,5 ACERO 002" }, { code: "OS-A35XXU-003", description: "OSTEOSINTESIS 3,5 ACERO 003" }, { code: "OS-T45XXU-001", description: "OSTEOSINTESIS 4.5 TITANIO 001" }, { code: "OS-T45XXU-002", description: "OSTEOSINTESIS 4.5 TITANIO 002" }, { code: "OS-A45XXU-001", description: "OSTEOSINTESIS 4,5 ACERO 001" }, { code: "OS-A45XXU-002", description: "OSTEOSINTESIS 4,5 ACERO 002" }, { code: "PC-A00DHP-001", description: "PLACA CLAVO DHS - DCS EN ACERO 001" }
  ],
  "MEDICINA DEL DEPORTE": [
    { code: "AR-X00MCI-001", description: "CAJA ARTROSCOPIA MICROMED 001" }, { code: "AR-X00BTI-001", description: "CAJA ARTROSCOPIA BOTON 001" }, { code: "AR-X00API-001", description: "CAJA ARTROSCOPIA ARPON 001" }, { code: "AR-X00SMI-001", description: "CAJA ARTROSCOPIA SUTURA MENISCAL 001" }, { code: "AR-X00HMP-001", description: "CAJA ARTROSCOPIA HOMBRO 001" }, { code: "LG-T00PKI-001", description: "CAJA LIGAMENTO CRUZADO ANTERIOR TIT/PEEK SERIE 001" }, { code: "LG-T00PKI-002", description: "CAJA LIGAMENTO CRUZADO ANTERIOR TIT/PEEK SERIE 002" }, { code: "LG-T00PKI-003", description: "CAJA LIGAMENTO CRUZADO ANTERIOR TIT/PEEK SERIE 003" }
  ],
  "EQUIPOS DE FERRETERIA": [
    { code: "MT-CANDWB-001", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-002", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-003", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-005", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-006", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-007", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-008", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-009", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-010", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANMWB-001", description: "MOTOR CANULADO A BATERIA MILWAUKEE" }, { code: "MT-CANMWB-002", description: "MOTOR CANULADO A BATERIA MILWAUKEE" }, { code: "MT-CANMWB-003", description: "MOTOR CANULADO A BATERIA MILWAUKEE" }, { code: "MT-CANMWB-004", description: "MOTOR CANULADO A BATERIA MILWAUKEE" }, { code: "MT-TALMKE-001", description: "TALADRO ELECTRICO MAKITA" }, { code: "MT-TALMKE-002", description: "TALADRO ELECTRICO MAKITA" }, { code: "MT-TALMKE-003", description: "TALADRO ELECTRICO MAKITA" }, { code: "MT-CANMKB-001", description: "MOTOR CANULADO A BATERIA MAKITA" }, { code: "MT-CANMKB-002", description: "MOTOR CANULADO A BATERIA MAKITA" }, { code: "MT-CANMKB-003", description: "MOTOR CANULADO A BATERIA MAKITA" }, { code: "MT-SIMBSB-001", description: "MOTOR CANULADO A BATERIA BOSCH P/CIRUGIAS PEQUEÑO FRAGMENTO" }, { code: "MT-SIMTLB-001", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-002", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-005", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-009", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-010", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-003", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-004", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-006", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-007", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-008", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-011", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-012", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-013", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-014", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-015", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-016", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-CANEHB-001", description: "MOTOR CANULADO A BATERIA EINHELL" }, { code: "MT-CANEHB-002", description: "MOTOR CANULADO A BATERIA EINHELL" }, { code: "MT-CANEHB-003", description: "MOTOR CANULADO A BATERIA EINHELL" }, { code: "TL-MANDRE-001", description: "TALADRO DE MANO DREMEL 001" }, { code: "MS-UNIOFB-001", description: "MOTOR CANULADO/ MICRO SIERRA A BATERIA OVER FIX" }, { code: "MS-UNIOFB-002", description: "MOTOR CANULADO/ MICRO SIERRA A BATERIA OVER FIX" }, { code: "MS-UNIOFB-003", description: "MOTOR CANULADO/ MICRO SIERRA A BATERIA OVER FIX" }, { code: "MC-MOTBTM-001", description: "MICRO MOTOR BTR 2000 + MICRO SIERRA" }, { code: "MC-MOTBTM-002", description: "MICRO SIERRA BTR 20000" }, { code: "EQ-SHABTM-001", description: "EQUIPO SHAVER BTR 001" }, { code: "SR-UNIBTM-001", description: "SIERRA BTR 2000 1" }, { code: "SR-UNIBTM-002", description: "SIERRA BTR 2000 2" }, { code: "EQ-SHABTM-002", description: "EQUIPO SHAVER BTR 002" }, { code: "EQ-RDFCMM-001", description: "EQUIPO RADIO FRECUENCIA CONMED" }, { code: "EQ-BIRCMM-001", description: "EQUIPO SISTEMA DE GESTION DE IRRIGACION-CONMED (BOMBA)" }, { code: "SR-RECSWB-001", description: "SIERRA RECIPROCANTE SWIPRO 001" }
   ],
   "REEMPLAZO TOTAL DE CADERA CEMENTADA": [
    { code: "RC-X00CMC-001", description: "REEMPLAZO TOTAL DE CADERA CEMENTADA TIPO MULLER - 001" }, { code: "RC-X00CMC-002", description: "REEMPLAZO TOTAL DE CADERA CEMENTADA TIPO MULLER - 002" }
  ],
  "REEMPLAZO TOTAL DE CADERA NO CEMENTADA": [
    { code: "RC-X00CNC-001", description: "INSTRUMENTAL + IMPLANTES - 001" }, { code: "RC-X00CNC-002", description: "INSTRUMENTAL + IMPLANTES - 002" }
  ],
  "REEMPLAZO TOTAL CADERA CEMENTADA TALLO TRICONICO CONTENEDOR 001": [
    { code: "RC-X00TAC-001", description: "INSTRUMENTAL + IMPLANTES - 001" }
  ],
  "REEMPLAZO TOTAL DE CADERA CEMENTADA DOBLE MOVILIDAD CONTENEDOR 001": [
    { code: "RC-X00DMC-001", description: "INSTRUMENTAL PARA COTILO DOBLE MOVILIDAD CEMENTADO - 001" }
  ],
  "REEMPLAZO PARCIAL DE CADERA THOMPSON 001": [
    { code: "RP-X00THC-001", description: "INSTRUMENTAL PARA COTILO NO CEMENTADO - 001" }
  ],
  "REEMPLAZO TOTAL DE RODILLA FEMORAL JPX 001": [
    { code: "RR-X00JFI-001", description: "INSTRUMENTAL - 001" }, { code: "RR-X00JTI-002", description: "INSTRUMENTAL - 002" }, { code: "RR-X00JPI-003", description: "INSTRUMENTAL - 003" }, { code: "RR-X00JPM-004", description: "IMPLANTES - 004" }
  ],
  "CAJA REEMPLAZO DE CUPULA RADIAL 001": [
    { code: "RP-X00CRU-001", description: "INSTRUMENTAL + IMPLANTE - 1" }
  ]
};
// Limpiar descripciones
for (const categoria in baseDeDatosMateriales) {
  baseDeDatosMateriales[categoria].forEach(item => {
    item.description = item.description.replace(/^-+|-+$/g, '').trim();
  });
}

// --- Validación ---
function setupValidacion() {
  const camposRequeridos = [ { id: 'paciente', errorId: 'error-paciente' }, { id: 'medico', errorId: 'error-medico' }, { id: 'lugarCirugia', errorId: 'error-lugar' }, { id: 'fechaCirugia', errorId: 'error-fecha' }, { id: 'tipoCirugia', errorId: 'error-tipo' }, { id: 'material', errorId: 'error-material' } ];
  camposRequeridos.forEach(campo => {
    const input = document.getElementById(campo.id); const error = document.getElementById(campo.errorId);
    if (!input || !error) { console.warn(`Elemento no encontrado para validación: ${campo.id} o ${campo.errorId}`); return; }
    input.addEventListener('input', () => {
      if (input.value.trim() === '') { input.classList.add('campo-invalido'); error.style.display = 'block'; }
      else { input.classList.remove('campo-invalido'); error.style.display = 'none'; }
    });
    error.style.display = 'none';
  });
}
function validarFormulario() {
  let valido = true; const camposRequeridos = ['paciente', 'medico', 'lugarCirugia', 'fechaCirugia', 'tipoCirugia', 'material'];
  camposRequeridos.forEach(id => {
    const input = document.getElementById(id); const error = document.getElementById(`error-${id}`);
    if (!input) { console.error(`Elemento input no encontrado para validación: ${id}`); valido = false; return; }
    if (!error) console.warn(`Elemento de error no encontrado para: error-${id}`);
    if (input.value.trim() === '') { input.classList.add('campo-invalido'); if (error) error.style.display = 'block'; valido = false; }
    else { input.classList.remove('campo-invalido'); if (error) error.style.display = 'none'; }
  });
  if (!valido) alert('Por favor complete todos los campos requeridos marcados con borde rojo.');
  return valido;
}

// --- Sugerencias (Autocompletado) ---
async function cargarSugerenciasIniciales(idInput, idList) {
  const key = `sugerencias_${idInput}`; const list = document.getElementById(idList);
  if (!list) { console.error(`Datalist no encontrada: ${idList}`); return; }
  try {
    const snapshot = await db.collection(COLECCION_SUGERENCIAS).where('campo', '==', idInput).orderBy('valor').get();
    const valores = []; snapshot.forEach(doc => { valores.push(doc.data().valor); });
    const valoresUnicos = [...new Set(valores)]; localStorage.setItem(key, JSON.stringify(valoresUnicos));
    actualizarListaDatalist(list, valoresUnicos); console.log(`Sugerencias para '${idInput}' cargadas desde Firestore.`);
  } catch (error) {
    console.error(`Error cargando sugerencias para '${idInput}' desde Firestore:`, error);
    const valoresLocalStorage = JSON.parse(localStorage.getItem(key) || "[]"); actualizarListaDatalist(list, valoresLocalStorage);
    console.log(`Sugerencias para '${idInput}' cargadas desde localStorage (fallback).`);
  }
}
function actualizarSugerencias(idInput, idList) {
  const input = document.getElementById(idInput); const list = document.getElementById(idList);
  if (!input || !list) { console.warn(`Input (${idInput}) o Datalist (${idList}) no encontrado para sugerencias.`); return; }
  const key = `sugerencias_${idInput}`; cargarSugerenciasIniciales(idInput, idList);
  input.addEventListener('change', async () => {
    const nuevoValor = input.value.trim(); if (!nuevoValor) return;
    let valoresActuales = JSON.parse(localStorage.getItem(key) || "[]");
    const lowerCaseNuevoValor = nuevoValor.toLowerCase(); const existe = valoresActuales.some(v => v.toLowerCase() === lowerCaseNuevoValor);
    if (!existe) {
      valoresActuales.push(nuevoValor); valoresActuales.sort((a, b) => a.localeCompare(b)); localStorage.setItem(key, JSON.stringify(valoresActuales));
      actualizarListaDatalist(list, valoresActuales);
      try {
        await db.collection(COLECCION_SUGERENCIAS).add({ campo: idInput, valor: nuevoValor, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        console.log(`Sugerencia '${nuevoValor}' para '${idInput}' guardada en Firestore.`);
      } catch (error) { console.error("Error guardando sugerencia en Firestore:", error); }
    }
  });
  const valoresIniciales = JSON.parse(localStorage.getItem(key) || "[]"); actualizarListaDatalist(list, valoresIniciales);
}
function actualizarListaDatalist(datalistElement, valores) {
  datalistElement.innerHTML = ''; valores.forEach(v => { const opt = document.createElement('option'); opt.value = v; datalistElement.appendChild(opt); });
}

// --- Obtención y Formateo de Datos ---
function obtenerDatos() {
  const getValue = (id) => document.getElementById(id)?.value || '';
  return { paciente: getValue('paciente').trim(), medico: getValue('medico').trim(), instrumentador: getValue('instrumentador').trim(), lugarCirugia: getValue('lugarCirugia').trim(), fechaCirugia: getValue('fechaCirugia'), tipoCirugia: getValue('tipoCirugia').trim(), material: getValue('material').trim(), observaciones: getValue('observaciones').trim(), mensajeInicio: getValue('mensajeInicio'), infoAdicional: getValue('infoAdicional').trim(), formato: getValue('formato'), };
}
function formatearMaterialParaHTML(materialTexto) {
  if (!materialTexto || materialTexto.trim() === '') return '<p>No especificado</p>';
  const lineas = materialTexto.split('\n').map(l => l.trim()).filter(l => l); if (lineas.length === 0) return '<p>No especificado</p>';
  let html = '<table class="material-table"><tbody>'; lineas.forEach(linea => { const lineaEscapada = linea.replace(/</g, "<").replace(/>/g, ">"); html += `<tr><td>${lineaEscapada}</td></tr>`; }); html += '</tbody></table>'; return html;
}
function formatearFechaUsuario(fechaISO) {
    if (!fechaISO) return 'No especificada';
    try {
        const partes = fechaISO.split('-'); if (partes.length !== 3) return fechaISO;
        const fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]), 12, 0, 0);
        return fecha.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) { console.error("Error formateando fecha:", e); return fechaISO; }
}

// --- Acciones Principales ---
function generarTexto() {
  if (!validarFormulario()) return; const datos = obtenerDatos(); const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia); const contenidoMaterialHTML = formatearMaterialParaHTML(datos.material);
  const reporteHTML = ` <div class="reporte-contenido reporte-box"> <img src="https://i.imgur.com/aA7RzTN.png" alt="Logo Districorr" style="max-height: 70px; margin-bottom: 12px; display: block; margin: 0 auto;"> <h3>📝 Reporte de Cirugía</h3> <p>${datos.mensajeInicio || 'Detalles de la cirugía programada:'}</p> <ul> <li><strong>Paciente:</strong> ${datos.paciente || 'No especificado'}</li> <li><strong>Tipo de Cirugía:</strong> ${datos.tipoCirugia || 'No especificado'}</li> <li><strong>Médico Responsable:</strong> ${datos.medico || 'No especificado'}</li> <li><strong>Instrumentador:</strong> ${datos.instrumentador || 'No especificado'}</li> <li><strong>Fecha de Cirugía:</strong> ${fechaFormateada}</li> <li><strong>Lugar:</strong> ${datos.lugarCirugia || 'No especificado'}</li> </ul> <h4>Material Requerido:</h4> ${contenidoMaterialHTML} ${datos.observaciones ? `<h4>Observaciones:</h4><p>${datos.observaciones.replace(/\n/g, '<br>')}</p>` : ''} ${datos.infoAdicional ? `<h4>Información Adicional:</h4><p>${datos.infoAdicional.replace(/\n/g, '<br>')}</p>` : ''} </div>`;
  const resultadoContainer = document.getElementById('resultado-container'); resultadoContainer.innerHTML = reporteHTML; resultadoContainer.style.display = 'block'; resultadoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }); mostrarToast('✅ Reporte generado. Listo para copiar o enviar.', 'success');
}
async function copiarTexto() {
  if (!validarFormulario()) return; const resultadoContainer = document.getElementById('resultado-container'); if (!resultadoContainer.querySelector('.reporte-contenido') || resultadoContainer.style.display === 'none') { alert('Primero debe generar un reporte usando el botón "📝 Generar Texto".'); return; }
  const datosParaGuardar = obtenerDatos(); const fechaFormateada = formatearFechaUsuario(datosParaGuardar.fechaCirugia);
  let textoPlano = `${datosParaGuardar.mensajeInicio || 'Detalles de la cirugía programada:'}\n\nPaciente: ${datosParaGuardar.paciente}\nTipo de Cirugía: ${datosParaGuardar.tipoCirugia}\nMédico Responsable: ${datosParaGuardar.medico}\nInstrumentador: ${datosParaGuardar.instrumentador || 'No especificado'}\nFecha de Cirugía: ${fechaFormateada}\nLugar: ${datosParaGuardar.lugarCirugia}\n\nMaterial Requerido:\n${datosParaGuardar.material || 'No especificado'}\n\n`; if (datosParaGuardar.observaciones) textoPlano += `Observaciones:\n${datosParaGuardar.observaciones}\n\n`; if (datosParaGuardar.infoAdicional) textoPlano += `Información Adicional:\n${datosParaGuardar.infoAdicional}\n`;
  let copiadoExitoso = false; let guardadoExitoso = false;
  try { await navigator.clipboard.writeText(textoPlano); copiadoExitoso = true; console.log('Texto plano copiado al portapapeles.'); } catch (err) { console.error('Error al copiar texto al portapapeles:', err); }
  try { await guardarEnFirebase(datosParaGuardar); guardadoExitoso = true; console.log('Reporte guardado en Firestore.'); } catch (err) { console.error('Fallo en la operación de guardado iniciada por copiarTexto.'); }
  if (copiadoExitoso && guardadoExitoso) mostrarToast('✅ Texto copiado y reporte guardado!', 'success'); else if (copiadoExitoso && !guardadoExitoso) mostrarToast('⚠️ Texto copiado, pero falló el guardado. Revise la consola.', 'warning'); else if (!copiadoExitoso && guardadoExitoso) mostrarToast('⚠️ Reporte guardado, pero falló la copia. Revise la consola.', 'warning'); else mostrarToast('❌ Falló la copia y el guardado. Revise la consola.', 'error');
}
async function guardarEnFirebase(data) {
  try {
    let usuarioId = localStorage.getItem(LOCALSTORAGE_USER_ID); if (!usuarioId) { usuarioId = Math.random().toString(36).substring(2, 10); localStorage.setItem(LOCALSTORAGE_USER_ID, usuarioId); } data.usuario = usuarioId; data.timestamp = firebase.firestore.FieldValue.serverTimestamp();
    const docRef = await db.collection(COLECCION_REPORTES).add(data); console.log('Reporte guardado en Firestore con ID:', docRef.id); return docRef;
  } catch (error) { console.error('Error detallado guardando reporte en Firestore:', error); throw error; }
}

// --- Funciones Auxiliares y de Interfaz ---
function mostrarToast(mensaje, tipo = 'info') {
  const toast = document.getElementById('toast'); if (!toast) return; toast.textContent = mensaje; toast.className = 'toast-notification';
  switch (tipo) { case 'success': toast.classList.add('success'); break; case 'warning': toast.classList.add('warning'); break; case 'error': toast.classList.add('error'); break; case 'info': default: toast.classList.add('info'); break; }
  toast.style.display = 'block'; setTimeout(() => { toast.style.display = 'none'; toast.className = 'toast-notification'; }, tipo === 'error' || tipo === 'warning' ? 6000 : 4000);
}

// --- Otras Acciones ---
function compartirWhatsApp() {
  if (!validarFormulario()) return; const resultadoContainer = document.getElementById('resultado-container'); if (!resultadoContainer.querySelector('.reporte-contenido') || resultadoContainer.style.display === 'none') { mostrarToast('Primero genere un reporte para compartir.', 'warning'); return; }
  const datos = obtenerDatos(); const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia); let textoPlano = `*Reporte de Cirugía Districorr*\n\n${datos.mensajeInicio || 'Detalles:'}\n\n*Paciente:* ${datos.paciente}\n*Tipo Cirugía:* ${datos.tipoCirugia}\n*Médico:* ${datos.medico}\n${datos.instrumentador ? `*Instrumentador:* ${datos.instrumentador}\n` : ''}*Fecha:* ${fechaFormateada}\n*Lugar:* ${datos.lugarCirugia}\n\n*Material Requerido:*\n${datos.material || '-'}\n\n${datos.observaciones ? `*Observaciones:*\n${datos.observaciones}\n\n` : ''}${datos.infoAdicional ? `*Info Adicional:*\n${datos.infoAdicional}\n` : ''}`; const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoPlano)}`; window.open(whatsappUrl, '_blank');
}
function enviarPorEmail() {
  if (!validarFormulario()) return; const resultadoContainer = document.getElementById('resultado-container'); if (!resultadoContainer.querySelector('.reporte-contenido') || resultadoContainer.style.display === 'none') { mostrarToast('Primero genere un reporte para enviar.', 'warning'); return; }
  const datos = obtenerDatos(); const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia); const subject = `Reporte Cirugía: ${datos.paciente} - ${datos.tipoCirugia} (${fechaFormateada})`; let body = `${datos.mensajeInicio || 'Detalles de la cirugía programada:'}\n\nPaciente: ${datos.paciente}\nTipo de Cirugía: ${datos.tipoCirugia}\nMédico Responsable: ${datos.medico}\nInstrumentador: ${datos.instrumentador || 'No especificado'}\nFecha de Cirugía: ${fechaFormateada}\nLugar: ${datos.lugarCirugia}\n\nMaterial Requerido:\n${datos.material || 'No especificado'}\n\n`; if (datos.observaciones) body += `Observaciones:\n${datos.observaciones}\n\n`; if (datos.infoAdicional) body += `Información Adicional:\n${datos.infoAdicional}\n\n`; body += `--\nGenerado con App Districorr`; const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; window.location.href = mailtoLink;
}
function imprimirReporte() {
  if (!validarFormulario()) return; const resultadoContainer = document.getElementById('resultado-container'); if (!resultadoContainer.querySelector('.reporte-contenido') || resultadoContainer.style.display === 'none') { mostrarToast('Primero genere un reporte para imprimir.', 'warning'); return; }
  const ventanaImpresion = window.open('', '_blank', 'height=700,width=900'); ventanaImpresion.document.write('<html><head><title>Reporte de Cirugía - Districorr</title><link rel="stylesheet" href="style.css"><style> body { margin: 25px; background: #fff; } .reporte-contenido { border: none; box-shadow: none; margin: 0; padding: 0; } .container { box-shadow: none; padding: 0; } button, .btn-link, .credit, .form-group, header h4, .text-center { display: none; } .reporte-box { border-left: none !important; background-color: transparent !important; } ul { padding-left: 20px; } li { margin-bottom: 5px; } h3, h4 { margin-top: 15px; margin-bottom: 5px; } .material-table td { border: 1px solid #ccc; font-size: 10pt; } img { max-height: 60px !important; } @page { size: A4; margin: 20mm; } </style></head><body>'); ventanaImpresion.document.write(resultadoContainer.querySelector('.reporte-contenido').outerHTML); ventanaImpresion.document.write('</body></html>'); ventanaImpresion.document.close(); ventanaImpresion.focus(); setTimeout(() => { ventanaImpresion.print(); ventanaImpresion.close(); }, 750);
}
async function generarImagen() {
  if (!validarFormulario()) return; const resultadoContainer = document.getElementById('resultado-container'); const reporteContenido = resultadoContainer.querySelector('.reporte-contenido'); if (!reporteContenido || resultadoContainer.style.display === 'none') { mostrarToast('Primero genere un reporte para guardar como imagen.', 'warning'); return; } if (typeof html2canvas === 'undefined') { mostrarToast('Error: Librería html2canvas no cargada.', 'error'); console.error("html2canvas is not loaded"); return; }
  mostrarToast('⏳ Generando imagen...', 'info'); document.body.classList.add('loading');
  try {
    const canvas = await html2canvas(reporteContenido, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }); const imgData = canvas.toDataURL('image/png'); const link = document.createElement('a'); const datos = obtenerDatos(); const fechaStr = datos.fechaCirugia || 'sinfecha'; const nombreArchivo = `Reporte_${datos.paciente}_${fechaStr}.png`.replace(/[^a-z0-9_\-\.]/gi, '_'); link.download = nombreArchivo; link.href = imgData; link.click(); mostrarToast('✅ Imagen generada y descargada.', 'success');
  } catch (error) { console.error('Error al generar la imagen con html2canvas:', error); mostrarToast('❌ Error al generar la imagen. Revise la consola.', 'error'); } finally { document.body.classList.remove('loading'); }
}
function verEstadisticas() { window.location.href = 'admin.html'; }

// --- Funciones para el Modal de Materiales ---
function abrirModalMateriales() {
    const modal = document.getElementById('modalMateriales'); const listaContainer = document.getElementById('modalMaterialesLista'); const searchInput = document.getElementById('modalSearchInput');
    if (!modal || !listaContainer || !searchInput) { console.error("Elementos del modal no encontrados."); return; }
    searchInput.value = ''; listaContainer.innerHTML = '';
    for (const categoria in baseDeDatosMateriales) {
        const categoriaDiv = document.createElement('div'); categoriaDiv.classList.add('modal-categoria');
        const titulo = document.createElement('div'); titulo.classList.add('modal-categoria-titulo'); titulo.textContent = categoria; categoriaDiv.appendChild(titulo);
        baseDeDatosMateriales[categoria].forEach(item => {
            const itemDiv = document.createElement('div'); itemDiv.classList.add('modal-item'); itemDiv.dataset.code = item.code; itemDiv.dataset.description = item.description;
            const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.id = `mat-${item.code}`; checkbox.value = item.code; checkbox.classList.add('modal-item-checkbox');
            const label = document.createElement('label'); label.htmlFor = `mat-${item.code}`; label.innerHTML = `<span class="item-code">${item.code}</span> - <span class="item-desc">${item.description}</span>`;
            itemDiv.appendChild(checkbox); itemDiv.appendChild(label); categoriaDiv.appendChild(itemDiv);
        });
        listaContainer.appendChild(categoriaDiv);
    }
    modal.classList.add('visible'); modal.style.display = 'flex';
}
function cerrarModalMateriales() {
    const modal = document.getElementById('modalMateriales');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => { modal.style.display = 'none'; const checkboxes = modal.querySelectorAll('.modal-item-checkbox'); checkboxes.forEach(cb => cb.checked = false); }, 300);
    }
}
function anadirMaterialesSeleccionados() {
    const modal = document.getElementById('modalMateriales'); const textarea = document.getElementById('material'); if (!modal || !textarea) return;
    const checkboxesSeleccionados = modal.querySelectorAll('.modal-item-checkbox:checked'); let textoParaAnadir = '';
    checkboxesSeleccionados.forEach(cb => { const itemDiv = cb.closest('.modal-item'); if (itemDiv && itemDiv.dataset.code && itemDiv.dataset.description) { textoParaAnadir += `${itemDiv.dataset.code} - ${itemDiv.dataset.description}\n`; } });
    if (textoParaAnadir) { const valorActual = textarea.value.trim(); textarea.value = valorActual + (valorActual ? '\n' : '') + textoParaAnadir.trim(); textarea.dispatchEvent(new Event('input')); }
    cerrarModalMateriales();
}
function filtrarModalMateriales() {
    const input = document.getElementById('modalSearchInput'); const filter = input.value.toUpperCase(); const listaContainer = document.getElementById('modalMaterialesLista'); const categorias = listaContainer.getElementsByClassName('modal-categoria');
    for (let i = 0; i < categorias.length; i++) {
        const items = categorias[i].getElementsByClassName('modal-item'); let categoriaVisible = false;
        for (let j = 0; j < items.length; j++) { const label = items[j].getElementsByTagName('label')[0]; if (label) { const txtValue = label.textContent || label.innerText; if (txtValue.toUpperCase().indexOf(filter) > -1) { items[j].style.display = ""; categoriaVisible = true; } else { items[j].style.display = "none"; } } }
        const titulo = categorias[i].querySelector('.modal-categoria-titulo'); if (titulo) titulo.style.display = categoriaVisible ? "" : "none";
    }
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
  actualizarSugerencias('medico', 'medicosList'); actualizarSugerencias('instrumentador', 'instrumentadoresList'); actualizarSugerencias('lugarCirugia', 'lugaresList'); actualizarSugerencias('tipoCirugia', 'tiposCirugiaList');
  setupValidacion();
  try { const hoy = new Date(); const anio = hoy.getFullYear(); const mes = String(hoy.getMonth() + 1).padStart(2, '0'); const dia = String(hoy.getDate()).padStart(2, '0'); document.getElementById('fechaCirugia').value = `${anio}-${mes}-${dia}`; } catch (e) { console.error("Error estableciendo fecha por defecto:", e); }
  const modalOverlay = document.getElementById('modalMateriales'); if (modalOverlay) modalOverlay.addEventListener('click', function(event) { if (event.target === modalOverlay) cerrarModalMateriales(); });
  console.log("Aplicación de Reportes Districorr inicializada.");
});

// --- END OF FILE script.js ---
