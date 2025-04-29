// --- START OF FILE datos_admin.js ---

// Configuración de Firebase (DEBE SER LA MISMA QUE EN script.js y admin.html)
const firebaseConfig = {
  apiKey: "AIzaSyCFtuuSPCcQIkgDN_F1WRS4U-71pRNCf_E", // ¡TU API KEY REAL!
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

// --- Constantes ---
const COLECCION_TIPOS_CX = 'tiposCirugia';
const COLECCION_MATERIALES = 'materiales';

// --- Referencias a Elementos DOM ---
// Tipos Cirugía
const tipoCxList = document.getElementById('tiposCxList');
const newTipoCxNameInput = document.getElementById('newTipoCxName');
const addTipoCxBtn = document.getElementById('addTipoCxBtn');
const loadingTiposCx = document.getElementById('loading-tiposcx');
const tiposCxListContainer = document.getElementById('tiposCxListContainer');

// Materiales
const materialesTableBody = document.getElementById('materialesListBody');
const newMaterialCodeInput = document.getElementById('newMaterialCode');
const newMaterialDescInput = document.getElementById('newMaterialDesc');
const newMaterialCatInput = document.getElementById('newMaterialCat');
const addMaterialBtn = document.getElementById('addMaterialBtn');
const loadingMateriales = document.getElementById('loading-materiales');
const materialesTable = document.getElementById('materialesTable');
const materialesListContainer = document.getElementById('materialesListContainer');

// --- Funciones Toast (Copiada de script.js para feedback) ---
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = mensaje;
    toast.className = 'toast-notification'; // Resetear clases
    toast.classList.add(tipo);
    toast.style.display = 'block';
    void toast.offsetWidth; // Reflow
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 4000);
}

// --- Funciones para Tipos de Cirugía ---

// Cargar y mostrar tipos de cirugía
async function loadTiposCirugia() {
    loadingTiposCx.style.display = 'block';
    tipoCxList.style.display = 'none';
    tipoCxList.innerHTML = ''; // Limpiar lista

    try {
        const snapshot = await db.collection(COLECCION_TIPOS_CX).orderBy('nombre').get();
        if (snapshot.empty) {
            loadingTiposCx.textContent = 'No hay tipos de cirugía definidos.';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const li = document.createElement('li');
            li.dataset.id = doc.id; // Guardar ID para editar/borrar

            const nameSpan = document.createElement('span');
            nameSpan.textContent = data.nombre;
            li.appendChild(nameSpan);

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('data-actions');

            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar';
            editBtn.classList.add('btn-edit');
            editBtn.onclick = () => editTipoCirugia(doc.id, data.nombre);
            actionsDiv.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Borrar';
            deleteBtn.classList.add('btn-delete');
            deleteBtn.onclick = () => deleteTipoCirugia(doc.id, data.nombre);
            actionsDiv.appendChild(deleteBtn);

            li.appendChild(actionsDiv);
            tipoCxList.appendChild(li);
        });

        loadingTiposCx.style.display = 'none';
        tipoCxList.style.display = 'block';

    } catch (error) {
        console.error("Error cargando tipos de cirugía:", error);
        loadingTiposCx.textContent = 'Error al cargar datos.';
        loadingTiposCx.style.color = 'red';
        mostrarToast('Error cargando tipos de cirugía.', 'error');
    }
}

// Añadir nuevo tipo de cirugía
async function addTipoCirugia() {
    const nombre = newTipoCxNameInput.value.trim();
    if (!nombre) {
        mostrarToast('Ingrese un nombre para el tipo de cirugía.', 'warning');
        return;
    }

    addTipoCxBtn.disabled = true;
    addTipoCxBtn.textContent = 'Añadiendo...';

    try {
        await db.collection(COLECCION_TIPOS_CX).add({ nombre: nombre });
        mostrarToast('Tipo de cirugía añadido con éxito.', 'success');
        newTipoCxNameInput.value = ''; // Limpiar input
        await loadTiposCirugia(); // Recargar lista
    } catch (error) {
        console.error("Error añadiendo tipo de cirugía:", error);
        mostrarToast('Error al añadir tipo de cirugía.', 'error');
    } finally {
        addTipoCxBtn.disabled = false;
        addTipoCxBtn.textContent = '➕ Añadir';
    }
}

// Editar tipo de cirugía
async function editTipoCirugia(id, currentName) {
    const newName = prompt(`Editar tipo de cirugía:\n(ID: ${id})`, currentName);
    if (newName === null || newName.trim() === '' || newName.trim() === currentName) {
        return; // Cancelado o sin cambios
    }

    try {
        await db.collection(COLECCION_TIPOS_CX).doc(id).update({ nombre: newName.trim() });
        mostrarToast('Tipo de cirugía actualizado.', 'success');
        await loadTiposCirugia(); // Recargar lista
    } catch (error) {
        console.error("Error actualizando tipo de cirugía:", error);
        mostrarToast('Error al actualizar.', 'error');
    }
}

// Borrar tipo de cirugía
async function deleteTipoCirugia(id, name) {
    if (!confirm(`¿Está seguro de que desea eliminar el tipo de cirugía "${name}" (ID: ${id})?`)) {
        return;
    }

    try {
        await db.collection(COLECCION_TIPOS_CX).doc(id).delete();
        mostrarToast('Tipo de cirugía eliminado.', 'success');
        await loadTiposCirugia(); // Recargar lista
    } catch (error) {
        console.error("Error eliminando tipo de cirugía:", error);
        mostrarToast('Error al eliminar.', 'error');
    }
}

// --- Funciones para Materiales ---

// Cargar y mostrar materiales
async function loadMateriales() {
    loadingMateriales.style.display = 'block';
    materialesTable.style.display = 'none';
    materialesTableBody.innerHTML = ''; // Limpiar tabla

    try {
        // Ordenar por categoría y luego por código para agrupar visualmente
        const snapshot = await db.collection(COLECCION_MATERIALES)
                                 .orderBy('categoria')
                                 .orderBy('code')
                                 .get();

        if (snapshot.empty) {
            loadingMateriales.textContent = 'No hay materiales definidos.';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement('tr');
            tr.dataset.id = doc.id;

            const createCell = (text) => {
                const td = document.createElement('td');
                td.textContent = text || '-';
                return td;
            };

            tr.appendChild(createCell(data.code));
            tr.appendChild(createCell(data.description));
            tr.appendChild(createCell(data.categoria));

            const tdActions = document.createElement('td');
            tdActions.classList.add('data-actions');

            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar';
            editBtn.classList.add('btn-edit');
            editBtn.onclick = () => editMaterial(doc.id, data);
            tdActions.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Borrar';
            deleteBtn.classList.add('btn-delete');
            deleteBtn.onclick = () => deleteMaterial(doc.id, data.code);
            tdActions.appendChild(deleteBtn);

            tr.appendChild(tdActions);
            materialesTableBody.appendChild(tr);
        });

        loadingMateriales.style.display = 'none';
        materialesTable.style.display = 'table'; // Mostrar como tabla

    } catch (error) {
        console.error("Error cargando materiales:", error);
        loadingMateriales.textContent = 'Error al cargar datos.';
        loadingMateriales.style.color = 'red';
        mostrarToast('Error cargando materiales.', 'error');
    }
}

// Añadir nuevo material
async function addMaterial() {
    const code = newMaterialCodeInput.value.trim();
    const description = newMaterialDescInput.value.trim();
    const categoria = newMaterialCatInput.value.trim();

    if (!code || !description || !categoria) {
        mostrarToast('Complete todos los campos del material (*).', 'warning');
        return;
    }

    addMaterialBtn.disabled = true;
    addMaterialBtn.textContent = 'Añadiendo...';

    try {
        // Opcional: Verificar si el código ya existe antes de añadir
        // const existing = await db.collection(COLECCION_MATERIALES).where('code', '==', code).limit(1).get();
        // if (!existing.empty) {
        //     mostrarToast(`El código ${code} ya existe.`, 'error');
        //     addMaterialBtn.disabled = false;
        //     addMaterialBtn.textContent = '➕ Añadir';
        //     return;
        // }

        await db.collection(COLECCION_MATERIALES).add({
            code: code,
            description: description,
            categoria: categoria
        });
        mostrarToast('Material añadido con éxito.', 'success');
        newMaterialCodeInput.value = '';
        newMaterialDescInput.value = '';
        newMaterialCatInput.value = '';
        await loadMateriales(); // Recargar lista
    } catch (error) {
        console.error("Error añadiendo material:", error);
        mostrarToast('Error al añadir material.', 'error');
    } finally {
        addMaterialBtn.disabled = false;
        addMaterialBtn.textContent = '➕ Añadir';
    }
}

// Editar material (más complejo por múltiples campos)
// Podríamos abrir un pequeño modal o usar prompts múltiples
async function editMaterial(id, currentData) {
    // Implementación simple con prompts:
    const newCode = prompt(`Editar Código (ID: ${id}):`, currentData.code);
    if (newCode === null) return; // Cancelado
    const newDesc = prompt(`Editar Descripción:`, currentData.description);
     if (newDesc === null) return; // Cancelado
    const newCat = prompt(`Editar Categoría:`, currentData.categoria);
    if (newCat === null) return; // Cancelado

    const updatedData = {
        code: newCode.trim() || currentData.code, // Mantener si está vacío
        description: newDesc.trim() || currentData.description,
        categoria: newCat.trim() || currentData.categoria
    };

    // Verificar si hubo cambios reales
    if (updatedData.code === currentData.code &&
        updatedData.description === currentData.description &&
        updatedData.categoria === currentData.categoria) {
        return; // Sin cambios
    }

    try {
        await db.collection(COLECCION_MATERIALES).doc(id).update(updatedData);
        mostrarToast('Material actualizado.', 'success');
        await loadMateriales(); // Recargar lista
    } catch (error) {
        console.error("Error actualizando material:", error);
        mostrarToast('Error al actualizar.', 'error');
    }
}

// Borrar material
async function deleteMaterial(id, code) {
    if (!confirm(`¿Está seguro de que desea eliminar el material con código "${code}" (ID: ${id})?`)) {
        return;
    }

    try {
        await db.collection(COLECCION_MATERIALES).doc(id).delete();
        mostrarToast('Material eliminado.', 'success');
        await loadMateriales(); // Recargar lista
    } catch (error) {
        console.error("Error eliminando material:", error);
        mostrarToast('Error al eliminar.', 'error');
    }
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    loadTiposCirugia();
    loadMateriales();

    // Listeners para botones de añadir
    addTipoCxBtn.addEventListener('click', addTipoCirugia);
    addMaterialBtn.addEventListener('click', addMaterial);

    // Opcional: Añadir al presionar Enter en los inputs
    newTipoCxNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTipoCxBtn.click(); });
    // Añadir listeners similares para inputs de material si se desea
});

// --- END OF FILE datos_admin.js ---
