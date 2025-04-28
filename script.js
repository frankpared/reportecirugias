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
const DEBOUNCE_DELAY = 300; // ms para esperar antes de filtrar modales

// --- Base de Datos de Materiales ---
const baseDeDatosMateriales = {
  "CIRUGIA MINIMAMENTE INVASIVA": [ { code: "TR-T00TCU-001", description: "TORNILLO TITANIO 4,5/6,5 CANULADO SERIE 001" }, { code: "TR-T00TCU-002", description: "TORNILLO TITANIO 4,5/6,5 CANULADO SERIE 002" }, { code: "TR-T70TCU-001", description: "TORNILLO TITANIO 7,0 CANULADO SERIE 001" }, { code: "TR-T35TCU-001", description: "TORNILLO TITANIO 3,5 CANULADO SERIE 001" }, { code: "TR-T35TCU-002", description: "TORNILLO TITANIO 3,5 CANULADO SERIE 002" }, { code: "TR-T35TCU-003", description: "TORNILLO TITANIO 3,5 CANULADO SERIE 003" }, { code: "HE-T30CNU-001", description: "TORNILLO TITANIO 3,0 CANULADO HERBERT SERIE 001" }, { code: "HE-T00HMU-001", description: "TORNILLO TITANIO 2,0/2,5 CANULADO MICROHERBERT SERIE 001" }, { code: "HE-T00HMU-002", description: "TORNILLO TITANIO 2,0/2,5 CANULADO MICROHERBERT SERIE 002" }, { code: "OS-T15MCU-002", description: "TORNILLO TITANIO 1,5/2,0 MICRO SERIE 001" }, { code: "OS-T25MCU-002", description: "TORNILLO TITANIO 2,5 MICRO SERIE 002" } ],
  "CLAVOS ENDOMEDULARES": [ { code: "CL-T00FRP-001", description: "CAJA FEMUR TITANIO 001 IMPLANTES" }, { code: "CL-T00FRI-001", description: "INSTRUMENTAL FEMUR TITANIO 001" }, { code: "CL-T00FRP-002", description: "CAJA FEMUR TITANIO 002 IMPLANTES" }, { code: "CL-T00FRI-002", description: "INSTRUMENTAL FEMUR TITANIO 002" }, { code: "CL-A00FRP-001", description: "CAJA FEMUR ACERO 001 IMPLANTES" }, { code: "CL-A00FRI-001", description: "INSTRUMENTAL FEMUR ACERO 001" }, { code: "CL-T00FXI-001", description: "CAJA INSTRUMENTAL EXPERT TITANIO 001" }, { code: "CL-TI1FXP-001", description: "IMPLANTE IZQUIERDA EXPERT TITANIO 001" }, { code: "CL-AD2FXP-001", description: "IMPLANTE DERECHA EXPERT TITANIO 002" }, { code: "CL-T00TBP-001", description: "CAJA TIBIA TITANIO 001 IMPLANTES" }, { code: "CL-T00TBI-001", description: "INSTRUMENTAL TIBIA TITANIO 001" }, { code: "CL-T00TBP-002", description: "CAJA TIBIA TITANIO 002 IMPLANTES" }, { code: "CL-T00TBI-002", description: "INSTRUMENTAL TIBIA TITANIO 002" }, { code: "CL-T00TXP-001", description: "CAJA TIBIA EXPERT TITANIO 001 IMPLANTES" }, { code: "CL-T00TXI-001", description: "INSTRUMENTAL TIBIA EXPERT 001" }, { code: "CL-A00TBP-001", description: "CAJA TIBIA ACERO 001 IMPLANTES" }, { code: "CL-A00TBI-001", description: "INSTRUMENTAL TIBIA ACERO" }, { code: "CL-T00TAP-001", description: "CAJA TIBIA C/ ANTIBIOTICO MULTIACERROJADO IMPLANTES" }, { code: "CL-T00TAI-001", description: "INSTRUMENTAL TIBIA C/ ANTIBIOTICO MULTIACERROJADO" }, { code: "CL-T00HGP-001", description: "CAJA HUMERO TIPO \"G\" 001 IMPLANTES" }, { code: "CL-T00HGI-001", description: "INSTRUMENTAL HUMERO TIPO \"G\" 001" }, { code: "CL-T00HRP-001", description: "CAJA HUMERO 001 IMPLANTES" }, { code: "CL-T00HRI-001", description: "INSTRUMENTAL HUMERO 001" }, { code: "RC-T00GMC-001", description: "CONTENEDOR GAMMA TITANIO 001 IMPLANTES" }, { code: "RC-T00GMI-001", description: "INSTRUMENTAL GAMMA TITANIO 001" }, { code: "RC-T00GMC-002", description: "CONTENEDOR GAMMA TITANIO 002 IMPLANTES" }, { code: "RC-T00GMI-002", description: "INSTRUMENTAL GAMMA TITANIO 002" } ],
  "EXTRACCION Y REVISION DE IMPLANTES": [ { code: "EX-X00OCI-002", description: "SET DE EXTRACCION DE CLAVOS 3.5/4.5" }, { code: "EX-X00OCI-001", description: "SET EXTRACCION DE CLAVO 001" }, { code: "EX-X00MRI-001", description: "EXTRACCION MORELAN 001" }, { code: "ST-X00DSI-001", description: "SET DE DESCEMENTACION 001" }, { code: "RC-X00ECC-001", description: "ESPACIADOR CON GENTAMICINA CADERA 001" } ],
  "OSTEOSINTESIS": [ { code: "RD-X00PLI-001", description: "CAJA DE REDUCCION INSTRUMENTAL PELVIS 001" }, { code: "PC-A00DHU-001", description: "CAJA TUTOR AO ACERO 001" }, { code: "OS-T35TPU-001", description: "CAJA OSTEOSINTESIS TIBIA DISTAL 3,5 SERIE 001" }, { code: "ST-T35TDP-001", description: "SET TIBIA DISTAL ANTERIOR 3,5 001 IMPLANTES" }, { code: "MT-SIMTLB-001", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 001" }, { code: "OS-T35CLU-002", description: "CAJA OSTEOSINTESIS CLAVICULA 3,5 SERIE 002" }, { code: "ST-T35CLP-002", description: "SET PLACA P/ CLAVICULA 3,5 TITANIO 002" }, { code: "MT-SIMTLB-002", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 002" }, { code: "OS-T35VLU-003", description: "CAJA OSTEOSINTESIS VOLAR 3,5 003" }, { code: "ST-T35VLP-003", description: "SET DE PLACA VOLAR TITANIO 003" }, { code: "MT-SIMTLB-003", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 003" }, { code: "OS-T35VLU-004", description: "CAJA OSTEOSINTESIS VOLAR 3,5 004" }, { code: "ST-T35VLP-004", description: "SET DE PLACA VOLAR TITANIO 004" }, { code: "MT-SIMTLB-004", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 004" }, { code: "OS-T35TDU-005", description: "OSTEOSINTESIS TIBIA PROXIMAL 3,5 SERIE 005" }, { code: "ST-T35TPP-005", description: "SET PLACA TIBIA PROXIMAL 3.5 TITANIO 005" }, { code: "MT-SIMTLB-005", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 005" }, { code: "OS-T35DCU-006", description: "OSTEOSINTESIS DCP/TERCIOTUBO 3,5 SERIE 006" }, { code: "ST-T35TDP-006", description: "SET PLACA DCP 013 / SET PLACA TERCIO TUBO 006" }, { code: "MT-SIMTLB-006", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 006" }, { code: "OS-T35DTU-007", description: "OSTEOSINTESIS DCP/TERCIOTUBO 3,5 SERIE 007" }, { code: "ST-T35TDP-007", description: "SET PLACA 1/3 TUBO / SET PLACA DCP 007" }, { code: "MT-SIMTLB-007", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 007" }, { code: "OS-T35DTU-008", description: "OSTEOSINTESIS DCP/TERCIOTUBO 3,5 SERIE 008" }, { code: "ST-T35TDP-008", description: "SET PLACA 1/3 TUBO / SET PLACA DCP 008" }, { code: "OS-T35VLU-009", description: "OSTEOSINTESIS VOLAR 3,5 SERIE 009" }, { code: "ST-T35VLP-009", description: "SET DE PLACA VOLAR TITANIO 009" }, { code: "MT-SIMTLB-009", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 009" }, { code: "OS-T35OLU-010", description: "OSTEOSINTESIS OLECRANO 3,5 SERIE 010" }, { code: "ST-T35OLP-010", description: "SET PLACA OLECRANON TITANIO 010" }, { code: "ST-T35PYP-010", description: "SET TITANIO 3.5 PLACA EN Y IMPLANTE 010" }, { code: "MT-SIMTLB-010", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 010" }, { code: "OS-T35CPU-011", description: "OSTEOSINTESIS CALCANEO/PHILO 3,5 SERIE 011" }, { code: "ST-T35OLP-011", description: "SET PLACA PHILO TIT 11" }, { code: "ST-T35CCP-011", description: "SET PLACAS CALCANEO TITANIO 011" }, { code: "MT-SIMTLB-011", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 011" }, { code: "OS-T35CLU-012", description: "OSTEOSINTESIS CLAVICULA 3,5 SERIE 012" }, { code: "ST-T35CLP-012", description: "SET PLACA P/ CLAVICULA 3,5 TITANIO 012" }, { code: "MT-SIMTLB-012", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 012" }, { code: "OS-T35DTU-013", description: "OSTEOSINTESIS DCP/TERCIOTUBO 3,5 SERIE 013" }, { code: "ST-T35TDP-013", description: "SET PLACA 1/3 TUBO / SET PLACA DCP 013" }, { code: "MT-SIMTLB-013", description: "MOTOR CANULADO A BATERIA TOTAL ASIGNADO 013" }, { code: "OS-A35XXU-001", description: "OSTEOSINTESIS 3,5 ACERO 001" }, { code: "OS-A35XXU-002", description: "OSTEOSINTESIS 3,5 ACERO 002" }, { code: "OS-A35XXU-003", description: "OSTEOSINTESIS 3,5 ACERO 003" }, { code: "OS-T45XXU-001", description: "OSTEOSINTESIS 4.5 TITANIO 001" }, { code: "OS-T45XXU-002", description: "OSTEOSINTESIS 4.5 TITANIO 002" }, { code: "OS-A45XXU-001", description: "OSTEOSINTESIS 4,5 ACERO 001" }, { code: "OS-A45XXU-002", description: "OSTEOSINTESIS 4,5 ACERO 002" }, { code: "PC-A00DHP-001", description: "PLACA CLAVO DHS - DCS EN ACERO 001" } ],
  "MEDICINA DEL DEPORTE": [ { code: "AR-X00MCI-001", description: "CAJA ARTROSCOPIA MICROMED 001" }, { code: "AR-X00BTI-001", description: "CAJA ARTROSCOPIA BOTON 001" }, { code: "AR-X00API-001", description: "CAJA ARTROSCOPIA ARPON 001" }, { code: "AR-X00SMI-001", description: "CAJA ARTROSCOPIA SUTURA MENISCAL 001" }, { code: "AR-X00HMP-001", description: "CAJA ARTROSCOPIA HOMBRO 001" }, { code: "LG-T00PKI-001", description: "CAJA LIGAMENTO CRUZADO ANTERIOR TIT/PEEK SERIE 001" }, { code: "LG-T00PKI-002", description: "CAJA LIGAMENTO CRUZADO ANTERIOR TIT/PEEK SERIE 002" }, { code: "LG-T00PKI-003", description: "CAJA LIGAMENTO CRUZADO ANTERIOR TIT/PEEK SERIE 003" } ],
  "EQUIPOS DE FERRETERIA": [ { code: "MT-CANDWB-001", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-002", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-003", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-005", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-006", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-007", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-008", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-009", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANDWB-010", description: "MOTOR CANULADO A BATERIA DEWALT" }, { code: "MT-CANMWB-001", description: "MOTOR CANULADO A BATERIA MILWAUKEE" }, { code: "MT-CANMWB-002", description: "MOTOR CANULADO A BATERIA MILWAUKEE" }, { code: "MT-CANMWB-003", description: "MOTOR CANULADO A BATERIA MILWAUKEE" }, { code: "MT-CANMWB-004", description: "MOTOR CANULADO A BATERIA MILWAUKEE" }, { code: "MT-TALMKE-001", description: "TALADRO ELECTRICO MAKITA" }, { code: "MT-TALMKE-002", description: "TALADRO ELECTRICO MAKITA" }, { code: "MT-TALMKE-003", description: "TALADRO ELECTRICO MAKITA" }, { code: "MT-CANMKB-001", description: "MOTOR CANULADO A BATERIA MAKITA" }, { code: "MT-CANMKB-002", description: "MOTOR CANULADO A BATERIA MAKITA" }, { code: "MT-CANMKB-003", description: "MOTOR CANULADO A BATERIA MAKITA" }, { code: "MT-SIMBSB-001", description: "MOTOR CANULADO A BATERIA BOSCH P/CIRUGIAS PEQUEÑO FRAGMENTO" }, { code: "MT-SIMTLB-001", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-002", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-005", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-009", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-010", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-003", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-004", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-006", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-007", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-008", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-011", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-012", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-013", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-014", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-015", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-SIMTLB-016", description: "MOTOR CANULADO A BATERIA TOTAL" }, { code: "MT-CANEHB-001", description: "MOTOR CANULADO A BATERIA EINHELL" }, { code: "MT-CANEHB-002", description: "MOTOR CANULADO A BATERIA EINHELL" }, { code: "MT-CANEHB-003", description: "MOTOR CANULADO A BATERIA EINHELL" }, { code: "TL-MANDRE-001", description: "TALADRO DE MANO DREMEL 001" }, { code: "MS-UNIOFB-001", description: "MOTOR CANULADO/ MICRO SIERRA A BATERIA OVER FIX" }, { code: "MS-UNIOFB-002", description: "MOTOR CANULADO/ MICRO SIERRA A BATERIA OVER FIX" }, { code: "MS-UNIOFB-003", description: "MOTOR CANULADO/ MICRO SIERRA A BATERIA OVER FIX" }, { code: "MC-MOTBTM-001", description: "MICRO MOTOR BTR 2000 + MICRO SIERRA" }, { code: "MC-MOTBTM-002", description: "MICRO SIERRA BTR 20000" }, { code: "EQ-SHABTM-001", description: "EQUIPO SHAVER BTR 001" }, { code: "SR-UNIBTM-001", description: "SIERRA BTR 2000 1" }, { code: "SR-UNIBTM-002", description: "SIERRA BTR 2000 2" }, { code: "EQ-SHABTM-002", description: "EQUIPO SHAVER BTR 002" }, { code: "EQ-RDFCMM-001", description: "EQUIPO RADIO FRECUENCIA CONMED" }, { code: "EQ-BIRCMM-001", description: "EQUIPO SISTEMA DE GESTION DE IRRIGACION-CONMED (BOMBA)" }, { code: "SR-RECSWB-001", description: "SIERRA RECIPROCANTE SWIPRO 001" } ],
   "REEMPLAZO TOTAL DE CADERA CEMENTADA": [ { code: "RC-X00CMC-001", description: "REEMPLAZO TOTAL DE CADERA CEMENTADA TIPO MULLER - 001" }, { code: "RC-X00CMC-002", description: "REEMPLAZO TOTAL DE CADERA CEMENTADA TIPO MULLER - 002" } ],
  "REEMPLAZO TOTAL DE CADERA NO CEMENTADA": [ { code: "RC-X00CNC-001", description: "INSTRUMENTAL + IMPLANTES - 001" }, { code: "RC-X00CNC-002", description: "INSTRUMENTAL + IMPLANTES - 002" } ],
  "REEMPLAZO TOTAL CADERA CEMENTADA TALLO TRICONICO CONTENEDOR 001": [ { code: "RC-X00TAC-001", description: "INSTRUMENTAL + IMPLANTES - 001" } ],
  "REEMPLAZO TOTAL DE CADERA CEMENTADA DOBLE MOVILIDAD CONTENEDOR 001": [ { code: "RC-X00DMC-001", description: "INSTRUMENTAL PARA COTILO DOBLE MOVILIDAD CEMENTADO - 001" } ],
  "REEMPLAZO PARCIAL DE CADERA THOMPSON 001": [ { code: "RP-X00THC-001", description: "INSTRUMENTAL PARA COTILO NO CEMENTADO - 001" } ],
  "REEMPLAZO TOTAL DE RODILLA FEMORAL JPX 001": [ { code: "RR-X00JFI-001", description: "INSTRUMENTAL - 001" }, { code: "RR-X00JTI-002", description: "INSTRUMENTAL - 002" }, { code: "RR-X00JPI-003", description: "INSTRUMENTAL - 003" }, { code: "RR-X00JPM-004", description: "IMPLANTES - 004" } ],
  "CAJA REEMPLAZO DE CUPULA RADIAL 001": [ { code: "RP-X00CRU-001", description: "INSTRUMENTAL + IMPLANTE - 1" } ]
};
for (const categoria in baseDeDatosMateriales) { baseDeDatosMateriales[categoria].forEach(item => { item.description = item.description.replace(/^-+|-+$/g, '').trim(); }); }

// --- Base de Datos Tipo Cirugía ---
const baseDeDatosTipoCx = [ "ARTROSCOPIA DE CADERA", "SISTEMA ALL INSIDE", "ARTROPLASTIA ANATOMICA DE HUMERO", "ARTROPLASTIA CUPULA RADIAL", "ARTROPLASTIA REVERSA", "ARTRODESIS CERVICAL/ DORSAL/ LUMBAR HASTA 3 NIVELES", "ARTROSCOPIA DE HOMBRO ACROMIOCLAVICULAR", "ARTROSCOPIA DE HOMBRO - COMPLEJA - PEEK", "ARTROSCOPIA DE MANO - CODO - TOBILLO", "ARTROSCOPIA RODILLA COMPLEJA", "ARTRO RODILLA SIMPLE", "ARTROPLASTIA HUMERO PARCIAL", "ASISTENCIA POR DRILL CON FRESAS,BURS O SHAVER, CRANEO", "CAGE PEEK", "CLAVO DHS", "CLAVO EXPERT F-T", "CLAVO GAMMA", "CLAVO NANCY", "CLAVO CON ATB", "CLAVIJA", "CLAVO F/T/H EN ACERO", "CLAVO F/T/H TITANIO", "CLAVO FEMUR/TIBIA CON ATB", "COLOCACION MECHES", "COLUMNA POR NIVELES", "CRANEOPLASTIA MAS DE 4 HORAS", "CRANEOPLASTIA POR HORA UNA VEZ SUSPERADAS 8 HORAS DE CX", "CRANEOPLASTIA HASTA 4 HORAS", "CRANEOPLATIA", "CUPULA RADIAL", "DESCARTABLE", "ENDOPROTESIS", "EQUIPO", "ESCOLIOSIS POR NIVEL", "EXTRACION CLAVOS", "EXTRACION PLACAS", "EXTRACCION MATERIAL", "HOMBRO - ACROMICLAVICULAR", "HOMBRO PEEK", "INTERESPINOSO O CAGE POR IMPLANTE", "JPX", "LESIÓN DE LIGAMENTO CRUZADO ANTERIOR", "LIGAMENTO CRUZADO COMPLEJO", "LOGISTICA", "MANO ARPON", "MAXILOFACIAL COMPLEJA", "MAXILOFACIAL POR HORA UNA VEZ SUPERADA 8 HORAS DE CX", "MAXILOFACIAL SIMPLE", "MICROFRAGMENTO", "ORTOPEDIA", "OSTESINSTESIS 3,5 TITANIO", "OSTEOSINTESIS 4,5 ACERO", "OSTEOSINTESIS 4,5 EN TITANIO", "OSTESINSTESIS 3,5 ACERO", "PLACA CERVICAL", "PUNTA SHAVER", "RODILLA", "REV RTC REVISION", "RTC NO CEMENTADA", "REEMPAZO TOTAL DE CADERA BIPOLAR", "RTC CEMENTADA - ESPACIADOR", "RTC HIBRIDA - REVISION", "REEMPLAZO TOTAL RODILLA ANATOMICA", "RTR REVISION", "RTR PRIMARIA C/ VASTAGO TIBIAL", "SIN CONSUMO O SUSPENDIDA SE COBRARA EL 50% SEGUN COMPL", "SUTURA", "SUTURA COMPLEJA", "THOMPSON", "TORNILLOS CANULADOS/HERBERT", "TUTOR", "XLIF, ALIF, OLIF SISTEMAS MINIVASICO/LAPAROSCOPIA DE COLUMNA" ].sort((a, b) => a.localeCompare(b));

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

// --- Validación ---
function setupValidacion() { /* ... (código sin cambios) ... */ }
function validarFormulario() { /* ... (código sin cambios) ... */ }

// --- Sugerencias (Autocompletado) ---
async function cargarSugerenciasIniciales(idInput, idList) { /* ... (código sin cambios) ... */ }
function actualizarSugerencias(idInput, idList) { /* ... (código sin cambios) ... */ }
function actualizarListaDatalist(datalistElement, valores) { /* ... (código sin cambios) ... */ }

// --- Obtención y Formateo de Datos ---
function obtenerDatos() { /* ... (código sin cambios) ... */ }
function formatearMaterialParaHTML(materialTexto) { /* ... (código sin cambios) ... */ }
function formatearFechaUsuario(fechaISO) { /* ... (código sin cambios) ... */ }

// --- Acciones Principales ---
function generarTexto() {
  if (!validarFormulario()) return; const datos = obtenerDatos(); const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia); const contenidoMaterialHTML = formatearMaterialParaHTML(datos.material);
  // AÑADIR FRASE FINAL AQUÍ
  const fraseFinal = "\n\nSaludos, quedo al pendiente.";
  const reporteHTML = ` <div class="reporte-contenido reporte-box"> <img src="https://i.imgur.com/aA7RzTN.png" alt="Logo Districorr" style="max-height: 70px; margin-bottom: 12px; display: block; margin: 0 auto;"> <h3>📝 Reporte de Cirugía</h3> <p>${datos.mensajeInicio || 'Detalles de la cirugía programada:'}</p> <ul> <li><strong>Paciente:</strong> ${datos.paciente || 'No especificado'}</li> <li><strong>Tipo de Cirugía:</strong> ${datos.tipoCirugia || 'No especificado'}</li> <li><strong>Médico Responsable:</strong> ${datos.medico || 'No especificado'}</li> <li><strong>Instrumentador:</strong> ${datos.instrumentador || 'No especificado'}</li> <li><strong>Fecha de Cirugía:</strong> ${fechaFormateada}</li> <li><strong>Lugar:</strong> ${datos.lugarCirugia || 'No especificado'}</li> </ul> <h4>Material Requerido:</h4> ${contenidoMaterialHTML} ${datos.observaciones ? `<h4>Observaciones:</h4><p>${datos.observaciones.replace(/\n/g, '<br>')}</p>` : ''} ${datos.infoAdicional ? `<h4>Información Adicional:</h4><p>${datos.infoAdicional.replace(/\n/g, '<br>')}</p>` : ''} <p style="margin-top: 20px;">${fraseFinal.trim().replace(/\n/g, '<br>')}</p> {/* Añadir frase final */} </div>`;
  const resultadoContainer = document.getElementById('resultado-container'); resultadoContainer.innerHTML = reporteHTML; resultadoContainer.style.display = 'block'; resultadoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }); mostrarToast('✅ Reporte generado. Listo para copiar o enviar.', 'success');
}
async function copiarTexto() {
  if (!validarFormulario()) return; const resultadoContainer = document.getElementById('resultado-container'); const reporteContenidoElement = resultadoContainer.querySelector('.reporte-contenido'); if (!reporteContenidoElement || resultadoContainer.style.display === 'none') { alert('Primero debe generar un reporte usando el botón "📝 Generar Texto".'); return; }
  const datosParaGuardar = obtenerDatos(); // Obtener datos para guardar
  // OBTENER TEXTO EXACTO DEL HTML RENDERIZADO
  const textoPlanoParaCopiar = reporteContenidoElement.innerText;
  let copiadoExitoso = false; let guardadoExitoso = false;
  try { await navigator.clipboard.writeText(textoPlanoParaCopiar); copiadoExitoso = true; console.log('Texto del reporte copiado al portapapeles.'); } catch (err) { console.error('Error al copiar texto al portapapeles:', err); }
  try { await guardarEnFirebase(datosParaGuardar); guardadoExitoso = true; console.log('Reporte guardado en Firestore.'); } catch (err) { console.error('Fallo en la operación de guardado iniciada por copiarTexto.'); }
  if (copiadoExitoso && guardadoExitoso) mostrarToast('✅ Texto copiado y reporte guardado!', 'success'); else if (copiadoExitoso && !guardadoExitoso) mostrarToast('⚠️ Texto copiado, pero falló el guardado. Revise la consola.', 'warning'); else if (!copiadoExitoso && guardadoExitoso) mostrarToast('⚠️ Reporte guardado, pero falló la copia. Revise la consola.', 'warning'); else mostrarToast('❌ Falló la copia y el guardado. Revise la consola.', 'error');
}
async function guardarEnFirebase(data) { /* ... (código sin cambios) ... */ }

// --- Funciones Auxiliares y de Interfaz ---
function mostrarToast(mensaje, tipo = 'info') { /* ... (código sin cambios) ... */ }

// --- Otras Acciones ---
function compartirWhatsApp() {
  if (!validarFormulario()) return; const resultadoContainer = document.getElementById('resultado-container'); const reporteContenidoElement = resultadoContainer.querySelector('.reporte-contenido'); if (!reporteContenidoElement || resultadoContainer.style.display === 'none') { mostrarToast('Primero genere un reporte para compartir.', 'warning'); return; }
  // Usar innerText para obtener el texto formateado, incluyendo la frase final
  const textoPlano = `*Reporte de Cirugía Districorr*\n\n${reporteContenidoElement.innerText}`; // Más simple y preciso
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoPlano)}`; window.open(whatsappUrl, '_blank');
}
function enviarPorEmail() {
  if (!validarFormulario()) return; const resultadoContainer = document.getElementById('resultado-container'); const reporteContenidoElement = resultadoContainer.querySelector('.reporte-contenido'); if (!resultadoContainer.querySelector('.reporte-contenido') || resultadoContainer.style.display === 'none') { mostrarToast('Primero genere un reporte para enviar.', 'warning'); return; }
  const datos = obtenerDatos(); const fechaFormateada = formatearFechaUsuario(datos.fechaCirugia); const subject = `Reporte Cirugía: ${datos.paciente} - ${datos.tipoCirugia} (${fechaFormateada})`;
  // Usar innerText para el cuerpo, es más simple
  let body = reporteContenidoElement.innerText; body += `\n\n--\nGenerado con App Districorr`;
  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; window.location.href = mailtoLink;
}
function imprimirReporte() { /* ... (código sin cambios) ... */ }
async function generarImagen() { /* ... (código sin cambios) ... */ }
function verEstadisticas() { /* ... (código sin cambios) ... */ }

// --- Funciones para Modales ---

// Modal Materiales
function abrirModalMateriales() {
    const modal = document.getElementById('modalMateriales'); const listaContainer = document.getElementById('modalMaterialesLista'); const searchInput = document.getElementById('modalMaterialesSearchInput');
    if (!modal || !listaContainer || !searchInput) { console.error("Elementos del modal de materiales no encontrados."); return; }
    searchInput.value = ''; listaContainer.innerHTML = ''; // Limpiar
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
    searchInput.focus(); // Poner foco en la búsqueda
}
function cerrarModalMateriales() {
    const modal = document.getElementById('modalMateriales');
    if (modal) { modal.classList.remove('visible'); setTimeout(() => { modal.style.display = 'none'; const checkboxes = modal.querySelectorAll('.modal-item-checkbox'); checkboxes.forEach(cb => cb.checked = false); }, DEBOUNCE_DELAY); }
}
function anadirMaterialesSeleccionados() {
    const modal = document.getElementById('modalMateriales'); const textarea = document.getElementById('material'); if (!modal || !textarea) return;
    const checkboxesSeleccionados = modal.querySelectorAll('.modal-item-checkbox:checked'); let textoParaAnadir = '';
    checkboxesSeleccionados.forEach(cb => { const itemDiv = cb.closest('.modal-item'); if (itemDiv && itemDiv.dataset.code && itemDiv.dataset.description) { textoParaAnadir += `${itemDiv.dataset.code} - ${itemDiv.dataset.description}\n`; } });
    if (textoParaAnadir) { const valorActual = textarea.value.trim(); textarea.value = valorActual + (valorActual ? '\n' : '') + textoParaAnadir.trim(); textarea.dispatchEvent(new Event('input')); }
    cerrarModalMateriales();
}
function filtrarModalMateriales() {
    const input = document.getElementById('modalMaterialesSearchInput'); const filter = input.value.toUpperCase(); const listaContainer = document.getElementById('modalMaterialesLista'); const categorias = listaContainer.getElementsByClassName('modal-categoria');
    for (let i = 0; i < categorias.length; i++) {
        const items = categorias[i].getElementsByClassName('modal-item'); let categoriaVisible = false;
        for (let j = 0; j < items.length; j++) { const label = items[j].getElementsByTagName('label')[0]; if (label) { const txtValue = label.textContent || label.innerText; if (txtValue.toUpperCase().indexOf(filter) > -1) { items[j].style.display = ""; categoriaVisible = true; } else { items[j].style.display = "none"; } } }
        const titulo = categorias[i].querySelector('.modal-categoria-titulo'); if (titulo) titulo.style.display = categoriaVisible ? "" : "none";
    }
}
// Crear versión debounced
const debouncedFilterMateriales = debounce(filtrarModalMateriales, DEBOUNCE_DELAY);

// Modal Tipo Cirugía
function abrirModalTipoCx() {
    const modal = document.getElementById('modalTipoCx'); const listaContainer = document.getElementById('modalTipoCxLista'); const searchInput = document.getElementById('modalTipoCxSearchInput');
    if (!modal || !listaContainer || !searchInput) { console.error("Elementos del modal de Tipo Cx no encontrados."); return; }
    searchInput.value = ''; listaContainer.innerHTML = ''; // Limpiar
    baseDeDatosTipoCx.forEach(tipo => {
        const itemDiv = document.createElement('div'); itemDiv.classList.add('modal-item', 'tipo-cx-item'); // Clase específica
        itemDiv.dataset.value = tipo;
        itemDiv.textContent = tipo;
        // Añadir evento click para seleccionar y cerrar
        itemDiv.onclick = function() { anadirTipoCxSeleccionado(tipo); };
        listaContainer.appendChild(itemDiv);
    });
    modal.classList.add('visible'); modal.style.display = 'flex';
    searchInput.focus(); // Poner foco en la búsqueda
}
function cerrarModalTipoCx() {
    const modal = document.getElementById('modalTipoCx');
    if (modal) { modal.classList.remove('visible'); setTimeout(() => { modal.style.display = 'none'; }, DEBOUNCE_DELAY); }
}
function anadirTipoCxSeleccionado(tipoSeleccionado) {
    const inputTipoCx = document.getElementById('tipoCirugia');
    if (inputTipoCx) {
        inputTipoCx.value = tipoSeleccionado;
        inputTipoCx.dispatchEvent(new Event('input')); // Actualizar validación
        inputTipoCx.dispatchEvent(new Event('change')); // Disparar change para guardar sugerencia si es nueva
    }
    cerrarModalTipoCx();
}
function filtrarModalTipoCx() {
    const input = document.getElementById('modalTipoCxSearchInput'); const filter = input.value.toUpperCase(); const listaContainer = document.getElementById('modalTipoCxLista'); const items = listaContainer.getElementsByClassName('tipo-cx-item');
    for (let i = 0; i < items.length; i++) {
        const txtValue = items[i].textContent || items[i].innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) { items[i].style.display = ""; }
        else { items[i].style.display = "none"; }
    }
}
// Crear versión debounced
const debouncedFilterTipoCx = debounce(filtrarModalTipoCx, DEBOUNCE_DELAY);


// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
  actualizarSugerencias('medico', 'medicosList'); actualizarSugerencias('instrumentador', 'instrumentadoresList'); actualizarSugerencias('lugarCirugia', 'lugaresList'); actualizarSugerencias('tipoCirugia', 'tiposCirugiaList');
  setupValidacion();
  try { const hoy = new Date(); const anio = hoy.getFullYear(); const mes = String(hoy.getMonth() + 1).padStart(2, '0'); const dia = String(hoy.getDate()).padStart(2, '0'); document.getElementById('fechaCirugia').value = `${anio}-${mes}-${dia}`; } catch (e) { console.error("Error estableciendo fecha por defecto:", e); }
  // Cerrar modales al hacer clic fuera
  document.getElementById('modalMateriales')?.addEventListener('click', function(event) { if (event.target === this) cerrarModalMateriales(); });
  document.getElementById('modalTipoCx')?.addEventListener('click', function(event) { if (event.target === this) cerrarModalTipoCx(); });
  console.log("Aplicación de Reportes Districorr inicializada.");
});

// --- END OF FILE script.js ---
