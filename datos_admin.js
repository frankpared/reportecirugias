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
const COLECCION_CLIENTES = 'clientes'; 
const COLECCION_TIPOS_CX = 'tiposCirugia';
const COLECCION_MATERIALES = 'materiales';

// --- Referencias a Elementos DOM ---
const clienteList = document.getElementById('clientesList');
const newClienteNameInput = document.getElementById('newClienteName');
const addClienteBtn = document.getElementById('addClienteBtn');
const loadingClientes = document.getElementById('loading-clientes');

const tipoCxList = document.getElementById('tiposCxList');
const newTipoCxNameInput = document.getElementById('newTipoCxName');
const addTipoCxBtn = document.getElementById('addTipoCxBtn');
const loadingTiposCx = document.getElementById('loading-tiposcx');

const materialesTableBody = document.getElementById('materialesListBody');
const newMaterialCodeInput = document.getElementById('newMaterialCode');
const newMaterialDescInput = document.getElementById('newMaterialDesc');
const newMaterialCatInput = document.getElementById('newMaterialCat');
const addMaterialBtn = document.getElementById('addMaterialBtn');
const loadingMateriales = document.getElementById('loading-materiales');
const materialesTable = document.getElementById('materialesTable');

// --- Funciones Toast ---
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = mensaje;
    toast.className = 'toast-notification'; 
    toast.classList.add(tipo);
    toast.style.display = 'block';
    void toast.offsetWidth; 
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 4000);
}

// --- Funciones Genéricas para CRUD de Listas Simples (Nombre) ---
async function loadSimpleList(collectionName, listElement, loadingElement, itemNameSingular, itemNamePlural) {
    loadingElement.style.display = 'block';
    listElement.style.display = 'none';
    listElement.innerHTML = '';

    try {
        const snapshot = await db.collection(collectionName).orderBy('nombre').get();
        if (snapshot.empty) {
            loadingElement.textContent = `No hay ${itemNamePlural} definidos.`;
            return;
        }
        snapshot.forEach(doc => {
            const data = doc.data();
            const li = document.createElement('li');
            li.dataset.id = doc.id;
            const nameSpan = document.createElement('span');
            nameSpan.textContent = data.nombre;
            li.appendChild(nameSpan);
            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('data-actions');
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar'; editBtn.classList.add('btn-edit');
            editBtn.onclick = () => editSimpleListItem(collectionName, doc.id, data.nombre, itemNameSingular, listElement, loadingElement, itemNamePlural);
            actionsDiv.appendChild(editBtn);
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Borrar'; deleteBtn.classList.add('btn-delete');
            deleteBtn.onclick = () => deleteSimpleListItem(collectionName, doc.id, data.nombre, itemNameSingular, listElement, loadingElement, itemNamePlural);
            actionsDiv.appendChild(deleteBtn);
            li.appendChild(actionsDiv);
            listElement.appendChild(li);
        });
        loadingElement.style.display = 'none';
        listElement.style.display = 'block';
    } catch (error) {
        console.error(`Error cargando ${itemNamePlural}:`, error);
        loadingElement.textContent = 'Error al cargar datos.'; loadingElement.style.color = 'red';
        mostrarToast(`Error cargando ${itemNamePlural}.`, 'error');
    }
}

async function addSimpleListItem(collectionName, inputElement, addButtonElement, itemNameSingular, listElement, loadingElement, itemNamePlural) {
    const nombre = inputElement.value.trim();
    if (!nombre) {
        mostrarToast(`Ingrese un nombre para el ${itemNameSingular}.`, 'warning');
        return;
    }
    addButtonElement.disabled = true; addButtonElement.textContent = 'Añadiendo...';
    try {
        // Verificar si ya existe (insensible a mayúsculas/minúsculas)
        const querySnapshot = await db.collection(collectionName).where('nombreLower', '==', nombre.toLowerCase()).get();
        if (!querySnapshot.empty) {
            mostrarToast(`El ${itemNameSingular} "${nombre}" ya existe.`, 'warning');
            inputElement.focus();
            return;
        }
        await db.collection(collectionName).add({ nombre: nombre, nombreLower: nombre.toLowerCase() });
        mostrarToast(`${itemNameSingular.charAt(0).toUpperCase() + itemNameSingular.slice(1)} añadido con éxito.`, 'success');
        inputElement.value = '';
        await loadSimpleList(collectionName, listElement, loadingElement, itemNameSingular, itemNamePlural);
    } catch (error) {
        console.error(`Error añadiendo ${itemNameSingular}:`, error);
        mostrarToast(`Error al añadir ${itemNameSingular}.`, 'error');
    } finally {
        addButtonElement.disabled = false; addButtonElement.textContent = '➕ Añadir';
    }
}

async function editSimpleListItem(collectionName, id, currentName, itemNameSingular, listElement, loadingElement, itemNamePlural) {
    const newName = prompt(`Editar nombre del ${itemNameSingular}:\n(ID: ${id})`, currentName);
    if (newName === null || newName.trim() === '' || newName.trim() === currentName) return;
    
    const newNameTrimmed = newName.trim();
    try {
        // Verificar si el nuevo nombre (insensible a mayúsculas/minúsculas) ya existe en otro documento
        const querySnapshot = await db.collection(collectionName).where('nombreLower', '==', newNameTrimmed.toLowerCase()).get();
        let conflict = false;
        querySnapshot.forEach(doc => {
            if (doc.id !== id) conflict = true; // Conflicto si el nombre existe en un ID diferente
        });
        if (conflict) {
            mostrarToast(`El nombre "${newNameTrimmed}" ya existe para otro ${itemNameSingular}.`, 'warning');
            return;
        }

        await db.collection(collectionName).doc(id).update({ nombre: newNameTrimmed, nombreLower: newNameTrimmed.toLowerCase() });
        mostrarToast(`${itemNameSingular.charAt(0).toUpperCase() + itemNameSingular.slice(1)} actualizado.`, 'success');
        await loadSimpleList(collectionName, listElement, loadingElement, itemNameSingular, itemNamePlural);
    } catch (error) {
        console.error(`Error actualizando ${itemNameSingular}:`, error);
        mostrarToast('Error al actualizar.', 'error');
    }
}

async function deleteSimpleListItem(collectionName, id, name, itemNameSingular, listElement, loadingElement, itemNamePlural) {
    if (!confirm(`¿Está seguro de que desea eliminar el ${itemNameSingular} "${name}" (ID: ${id})?`)) return;
    try {
        await db.collection(collectionName).doc(id).delete();
        mostrarToast(`${itemNameSingular.charAt(0).toUpperCase() + itemNameSingular.slice(1)} eliminado.`, 'success');
        await loadSimpleList(collectionName, listElement, loadingElement, itemNameSingular, itemNamePlural);
    } catch (error) {
        console.error(`Error eliminando ${itemNameSingular}:`, error);
        mostrarToast('Error al eliminar.', 'error');
    }
}

// --- Funciones Específicas para Materiales (Mantienen su lógica CRUD separada) ---
async function loadMateriales() {
    loadingMateriales.style.display = 'block'; materialesTable.style.display = 'none'; materialesTableBody.innerHTML = '';
    try {
        const snapshot = await db.collection(COLECCION_MATERIALES).orderBy('categoria').orderBy('code').get();
        if (snapshot.empty) { loadingMateriales.textContent = 'No hay materiales definidos.'; return; }
        snapshot.forEach(doc => {
            const data = doc.data(); const tr = document.createElement('tr'); tr.dataset.id = doc.id;
            const createCell = (text) => { const td = document.createElement('td'); td.textContent = text || '-'; return td; };
            tr.appendChild(createCell(data.code)); tr.appendChild(createCell(data.description)); tr.appendChild(createCell(data.categoria));
            const tdActions = document.createElement('td'); tdActions.classList.add('data-actions');
            const editBtn = document.createElement('button'); editBtn.textContent = 'Editar'; editBtn.classList.add('btn-edit');
            editBtn.onclick = () => editMaterial(doc.id, data); tdActions.appendChild(editBtn);
            const deleteBtn = document.createElement('button'); deleteBtn.textContent = 'Borrar'; deleteBtn.classList.add('btn-delete');
            deleteBtn.onclick = () => deleteMaterial(doc.id, data.code); tdActions.appendChild(deleteBtn);
            tr.appendChild(tdActions); materialesTableBody.appendChild(tr);
        });
        loadingMateriales.style.display = 'none'; materialesTable.style.display = 'table';
    } catch (error) {
        console.error("Error cargando materiales:", error);
        loadingMateriales.textContent = 'Error al cargar datos.'; loadingMateriales.style.color = 'red';
        mostrarToast('Error cargando materiales.', 'error');
    }
}

async function addMaterial() {
    const code = newMaterialCodeInput.value.trim();
    const description = newMaterialDescInput.value.trim();
    const categoria = newMaterialCatInput.value.trim();
    if (!code || !description || !categoria) { mostrarToast('Complete todos los campos del material (*).', 'warning'); return; }
    addMaterialBtn.disabled = true; addMaterialBtn.textContent = 'Añadiendo...';
    try {
        const existing = await db.collection(COLECCION_MATERIALES).where('code', '==', code).limit(1).get();
        if (!existing.empty) {
            mostrarToast(`El código de material "${code}" ya existe.`, 'warning');
            newMaterialCodeInput.focus();
            return;
        }
        await db.collection(COLECCION_MATERIALES).add({ code: code, description: description, categoria: categoria });
        mostrarToast('Material añadido con éxito.', 'success');
        newMaterialCodeInput.value = ''; newMaterialDescInput.value = ''; newMaterialCatInput.value = '';
        await loadMateriales();
    } catch (error) {
        console.error("Error añadiendo material:", error); mostrarToast('Error al añadir material.', 'error');
    } finally {
        addMaterialBtn.disabled = false; addMaterialBtn.textContent = '➕ Añadir';
    }
}

async function editMaterial(id, currentData) {
    const newCode = prompt(`Editar Código (ID: ${id}):`, currentData.code);
    if (newCode === null) return;
    const newDesc = prompt(`Editar Descripción:`, currentData.description);
    if (newDesc === null) return;
    const newCat = prompt(`Editar Categoría:`, currentData.categoria);
    if (newCat === null) return;

    const newCodeTrimmed = newCode.trim();
    const updatedData = {
        code: newCodeTrimmed || currentData.code,
        description: newDesc.trim() || currentData.description,
        categoria: newCat.trim() || currentData.categoria
    };
    if (updatedData.code === currentData.code && updatedData.description === currentData.description && updatedData.categoria === currentData.categoria) return;

    try {
        if (newCodeTrimmed && newCodeTrimmed !== currentData.code) {
            const existing = await db.collection(COLECCION_MATERIALES).where('code', '==', newCodeTrimmed).limit(1).get();
            let conflict = false;
            existing.forEach(doc => { if(doc.id !== id) conflict = true; });
            if (conflict) {
                mostrarToast(`El código de material "${newCodeTrimmed}" ya existe.`, 'warning');
                return;
            }
        }
        await db.collection(COLECCION_MATERIALES).doc(id).update(updatedData);
        mostrarToast('Material actualizado.', 'success'); await loadMateriales();
    } catch (error) {
        console.error("Error actualizando material:", error); mostrarToast('Error al actualizar.', 'error');
    }
}

async function deleteMaterial(id, code) {
    if (!confirm(`¿Está seguro de que desea eliminar el material con código "${code}" (ID: ${id})?`)) return;
    try {
        await db.collection(COLECCION_MATERIALES).doc(id).delete();
        mostrarToast('Material eliminado.', 'success'); await loadMateriales();
    } catch (error) {
        console.error("Error eliminando material:", error); mostrarToast('Error al eliminar.', 'error');
    }
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    loadSimpleList(COLECCION_CLIENTES, clienteList, loadingClientes, 'cliente', 'clientes');
    loadSimpleList(COLECCION_TIPOS_CX, tipoCxList, loadingTiposCx, 'tipo de cirugía', 'tipos de cirugía');
    loadMateriales();

    addClienteBtn.addEventListener('click', () => addSimpleListItem(COLECCION_CLIENTES, newClienteNameInput, addClienteBtn, 'cliente', clienteList, loadingClientes, 'clientes'));
    addTipoCxBtn.addEventListener('click', () => addSimpleListItem(COLECCION_TIPOS_CX, newTipoCxNameInput, addTipoCxBtn, 'tipo de cirugía', tipoCxList, loadingTiposCx, 'tipos de cirugía'));
    addMaterialBtn.addEventListener('click', addMaterial);

    newClienteNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addClienteBtn.click(); });
    newTipoCxNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTipoCxBtn.click(); });
    [newMaterialCodeInput, newMaterialDescInput, newMaterialCatInput].forEach(input => {
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addMaterialBtn.click(); });
    });
});

// --- END OF FILE datos_admin.js ---
