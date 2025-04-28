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
// (Se omite por brevedad, es la misma que proporcionaste)
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
// Limpiar descripciones (código sin cambios)
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
function setupValidacion() {
    const camposRequeridos = ['paciente', 'medico', 'lugarCirugia', 'fechaCirugia', 'tipoCirugia', 'material'];
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
    const camposRequeridos = ['paciente', 'medico', 'lugarCirugia', 'fechaCirugia', 'tipoCirugia', 'material'];

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


async function guardarEnFirebase(data) {
    if (!data || !data.paciente || !data.medico) { // Validación mínima antes de guardar
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

        return docRef.id; // Devolver el ID por si se necesita
    } catch (error) {
        console.error("Error al guardar reporte en Firebase: ", error);
        mostrarToast(`❌ Error al guardar: ${error.message}`, 'error');
        throw error; // Re-lanzar el error para que la función llamante sepa que falló
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
    const subject = `Reporte Cirugía: ${datos.paciente} - ${datos.tipoCirugia} (${fechaFormateada})`;

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
                button, .btn-link, .btn-volver, .modal-overlay, .toast-notification, .credit, header, .form-group, .text-center {
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

// Modal Materiales
function abrirModalMateriales() {
    const modal = document.getElementById('modalMateriales');
    const listaContainer = document.getElementById('modalMaterialesLista');
    const searchInput = document.getElementById('modalMaterialesSearchInput');

    if (!modal || !listaContainer || !searchInput) {
        console.error("Elementos del modal de materiales no encontrados.");
        return;
    }

    searchInput.value = ''; // Limpiar búsqueda anterior
    listaContainer.innerHTML = ''; // Limpiar lista anterior

    // Cargar y mostrar materiales por categoría
    let hasContent = false;
    for (const categoria in baseDeDatosMateriales) {
        if (baseDeDatosMateriales[categoria] && baseDeDatosMateriales[categoria].length > 0) {
             hasContent = true;
            const categoriaDiv = document.createElement('div');
            categoriaDiv.classList.add('modal-categoria');

            const titulo = document.createElement('div');
            titulo.classList.add('modal-categoria-titulo');
            titulo.textContent = categoria;
            categoriaDiv.appendChild(titulo);

            baseDeDatosMateriales[categoria].forEach(item => {
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
    }

     if (!hasContent) {
        listaContainer.innerHTML = '<p style="text-align: center; color: #777;">No hay materiales para mostrar.</p>';
    }

    // Mostrar el modal
    modal.classList.add('visible');
    modal.style.display = 'flex'; // Asegurar display flex
    searchInput.focus(); // Poner foco en la búsqueda
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
function abrirModalTipoCx() {
    const modal = document.getElementById('modalTipoCx');
    const listaContainer = document.getElementById('modalTipoCxLista');
    const searchInput = document.getElementById('modalTipoCxSearchInput');

    if (!modal || !listaContainer || !searchInput) {
        console.error("Elementos del modal de Tipo Cx no encontrados.");
        return;
    }

    searchInput.value = ''; // Limpiar búsqueda
    listaContainer.innerHTML = ''; // Limpiar lista

    // Cargar y mostrar tipos de cirugía
    if (baseDeDatosTipoCx && baseDeDatosTipoCx.length > 0) {
        baseDeDatosTipoCx.forEach(tipo => {
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
    } else {
         listaContainer.innerHTML = '<p style="text-align: center; color: #777;">No hay tipos de cirugía para mostrar.</p>';
    }


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
