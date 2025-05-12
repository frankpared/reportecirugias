// --- START OF FILE datos_admin.js ---

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

// --- Constantes ---
const COLECCION_CLIENTES = 'clientes'; // NUEVA
const COLECCION_TIPOS_CX = 'tiposCirugia';
const COLECCION_MATERIALES = 'materiales';

// --- Referencias a Elementos DOM ---
// Clientes (NUEVO)
const clienteListEl = document.getElementById('clienteList'); // 'clienteList' es el ul
const newClienteNameInput = document.getElementById('newClienteName');
const addClienteBtn = document.getElementById('addClienteBtn');
const loadingClientes = document.getElementById('loading-clientes');

// Tipos Cirugía
const tipoCxListEl = document.getElementById('tiposCxList'); // 'tiposCxList' es el ul
const newTipoCxNameInput = document.getElementById('newTipoCxName');
const addTipoCxBtn = document.getElementById('addTipoCxBtn');
const loadingTiposCx = document.getElementById('loading-tiposcx');

// Materiales
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

// --- Funciones para Clientes (NUEVAS) ---
async function loadClientes() {
    loadingClientes.style.display = 'block';
    clienteListEl.style.display = 'none';
    clienteListEl.innerHTML = '';

    try {
        const snapshot = await db.collection(COLECCION_CLIENTES).orderBy('nombre').get();
        if (snapshot.empty) {
            loadingClientes.textContent = 'No hay clientes definidos.';
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
            editBtn.textContent = 'Editar';
            editBtn.classList.add('btn-edit');
            editBtn.onclick = () => editCliente(doc.id, data.nombre);
            actionsDiv.appendChild(editBtn);
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Borrar';
            deleteBtn.classList.add('btn-delete');
            deleteBtn.onclick = () => deleteCliente(doc.id, data.nombre);
            actionsDiv.appendChild(deleteBtn);
            li.appendChild(actionsDiv);
            clienteListEl.appendChild(li);
        });
        loadingClientes.style.display = 'none';
        clienteListEl.style.display = 'block';
    } catch (error) {
        console.error("Error cargando clientes:", error);
        loadingClientes.textContent = 'Error al cargar datos.';
        loadingClientes.style.color = 'red';
        mostrarToast('Error cargando clientes.', 'error');
    }
}

async function addCliente() {
    const nombre = newClienteNameInput.value.trim();
    if (!nombre) {
        mostrarToast('Ingrese un nombre para el cliente.', 'warning');
        return;
    }
    addClienteBtn.disabled = true;
    addClienteBtn.textContent = 'Añadiendo...';
    try {
        await db.collection(COLECCION_CLIENTES).add({ nombre: nombre });
        mostrarToast('Cliente añadido con éxito.', 'success');
        newClienteNameInput.value = '';
        await loadClientes();
    } catch (error) {
        console.error("Error añadiendo cliente:", error);
        mostrarToast('Error al añadir cliente.', 'error');
    } finally {
        addClienteBtn.disabled = false;
        addClienteBtn.textContent = '➕ Añadir';
    }
}

async function editCliente(id, currentName) {
    const newName = prompt(`Editar cliente:\n(ID: ${id})`, currentName);
    if (newName === null || newName.trim() === '' || newName.trim() === currentName) return;
    try {
        await db.collection(COLECCION_CLIENTES).doc(id).update({ nombre: newName.trim() });
        mostrarToast('Cliente actualizado.', 'success');
        await loadClientes();
    } catch (error) {
        console.error("Error actualizando cliente:", error);
        mostrarToast('Error al actualizar.', 'error');
    }
}

async function deleteCliente(id, name) {
    if (!confirm(`¿Está seguro de que desea eliminar el cliente "${name}" (ID: ${id})?`)) return;
    try {
        await db.collection(COLECCION_CLIENTES).doc(id).delete();
        mostrarToast('Cliente eliminado.', 'success');
        await loadClientes();
    } catch (error) {
        console.error("Error eliminando cliente:", error);
        mostrarToast('Error al eliminar.', 'error');
    }
}

// --- Funciones para Tipos de Cirugía ---
async function loadTiposCirugia() {
    loadingTiposCx.style.display = 'block';
    tipoCxListEl.style.display = 'none';
    tipoCxListEl.innerHTML = '';
    try {
        const snapshot = await db.collection(COLECCION_TIPOS_CX).orderBy('nombre').get();
        if (snapshot.empty) {
            loadingTiposCx.textContent = 'No hay tipos de cirugía definidos.';
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
            tipoCxListEl.appendChild(li);
        });
        loadingTiposCx.style.display = 'none';
        tipoCxListEl.style.display = 'block';
    } catch (error) {
        console.error("Error cargando tipos de cirugía:", error);
        loadingTiposCx.textContent = 'Error al cargar datos.';
        loadingTiposCx.style.color = 'red';
        mostrarToast('Error cargando tipos de cirugía.', 'error');
    }
}

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
        newTipoCxNameInput.value = '';
        await loadTiposCirugia();
    } catch (error) {
        console.error("Error añadiendo tipo de cirugía:", error);
        mostrarToast('Error al añadir tipo de cirugía.', 'error');
    } finally {
        addTipoCxBtn.disabled = false;
        addTipoCxBtn.textContent = '➕ Añadir';
    }
}

async function editTipoCirugia(id, currentName) {
    const newName = prompt(`Editar tipo de cirugía:\n(ID: ${id})`, currentName);
    if (newName === null || newName.trim() === '' || newName.trim() === currentName) return;
    try {
        await db.collection(COLECCION_TIPOS_CX).doc(id).update({ nombre: newName.trim() });
        mostrarToast('Tipo de cirugía actualizado.', 'success');
        await loadTiposCirugia();
    } catch (error) {
        console.error("Error actualizando tipo de cirugía:", error);
        mostrarToast('Error al actualizar.', 'error');
    }
}

async function deleteTipoCirugia(id, name) {
    if (!confirm(`¿Está seguro de que desea eliminar el tipo de cirugía "${name}" (ID: ${id})?`)) return;
    try {
        await db.collection(COLECCION_TIPOS_CX).doc(id).delete();
        mostrarToast('Tipo de cirugía eliminado.', 'success');
        await loadTiposCirugia();
    } catch (error) {
        console.error("Error eliminando tipo de cirugía:", error);
        mostrarToast('Error al eliminar.', 'error');
    }
}

// --- Funciones para Materiales ---
async function loadMateriales() {
    loadingMateriales.style.display = 'block';
    materialesTable.style.display = 'none';
    materialesTableBody.innerHTML = '';
    try {
        const snapshot = await db.collection(COLECCION_MATERIALES).orderBy('categoria').orderBy('code').get();
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
        materialesTable.style.display = 'table';
    } catch (error) {
        console.error("Error cargando materiales:", error);
        loadingMateriales.textContent = 'Error al cargar datos.';
        loadingMateriales.style.color = 'red';
        mostrarToast('Error cargando materiales.', 'error');
    }
}

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
        await db.collection(COLECCION_MATERIALES).add({
            code: code, description: description, categoria: categoria
        });
        mostrarToast('Material añadido con éxito.', 'success');
        newMaterialCodeInput.value = '';
        newMaterialDescInput.value = '';
        newMaterialCatInput.value = '';
        await loadMateriales();
    } catch (error) {
        console.error("Error añadiendo material:", error);
        mostrarToast('Error al añadir material.', 'error');
    } finally {
        addMaterialBtn.disabled = false;
        addMaterialBtn.textContent = '➕ Añadir';
    }
}

async function editMaterial(id, currentData) {
    const newCode = prompt(`Editar Código (ID: ${id}):`, currentData.code);
    if (newCode === null) return;
    const newDesc = prompt(`Editar Descripción:`, currentData.description);
    if (newDesc === null) return;
    const newCat = prompt(`Editar Categoría:`, currentData.categoria);
    if (newCat === null) return;
    const updatedData = {
        code: newCode.trim() || currentData.code,
        description: newDesc.trim() || currentData.description,
        categoria: newCat.trim() || currentData.categoria
    };
    if (updatedData.code === currentData.code && updatedData.description === currentData.description && updatedData.categoria === currentData.categoria) return;
    try {
        await db.collection(COLECCION_MATERIALES).doc(id).update(updatedData);
        mostrarToast('Material actualizado.', 'success');
        await loadMateriales();
    } catch (error) {
        console.error("Error actualizando material:", error);
        mostrarToast('Error al actualizar.', 'error');
    }
}

async function deleteMaterial(id, code) {
    if (!confirm(`¿Está seguro de que desea eliminar el material con código "${code}" (ID: ${id})?`)) return;
    try {
        await db.collection(COLECCION_MATERIALES).doc(id).delete();
        mostrarToast('Material eliminado.', 'success');
        await loadMateriales();
    } catch (error) {
        console.error("Error eliminando material:", error);
        mostrarToast('Error al eliminar.', 'error');
    }
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    loadClientes(); // NUEVO
    loadTiposCirugia();
    loadMateriales();

    addClienteBtn.addEventListener('click', addCliente); // NUEVO
    newClienteNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addClienteBtn.click(); }); // NUEVO

    addTipoCxBtn.addEventListener('click', addTipoCirugia);
    newTipoCxNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTipoCxBtn.click(); });
    
    addMaterialBtn.addEventListener('click', addMaterial);
    // Listeners para Enter en campos de material si se desea
    newMaterialCodeInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addMaterialBtn.click(); });
    newMaterialDescInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addMaterialBtn.click(); });
    newMaterialCatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addMaterialBtn.click(); });
});

// --- END OF FILE datos_admin.js ---
