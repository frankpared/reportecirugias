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

const COLECCION_CLIENTES = 'clientes';
const COLECCION_TIPOS_CX = 'tiposCirugia';
const COLECCION_MATERIALES = 'materiales';

// Referencias DOM (simplificadas)
const refs = {
    clientes: { list: document.getElementById('clienteList'), loadMsg: document.getElementById('loading-clientes'), input: document.getElementById('newClienteName'), addBtn: document.getElementById('addClienteBtn') },
    tiposCx: { list: document.getElementById('tiposCxList'), loadMsg: document.getElementById('loading-tiposcx'), input: document.getElementById('newTipoCxName'), addBtn: document.getElementById('addTipoCxBtn') },
    materiales: { tableBody: document.getElementById('materialesListBody'), loadMsg: document.getElementById('loading-materiales'), table: document.getElementById('materialesTable'), inputs: { code: document.getElementById('newMaterialCode'), desc: document.getElementById('newMaterialDesc'), cat: document.getElementById('newMaterialCat') }, addBtn: document.getElementById('addMaterialBtn') }
};

function mostrarToastAdmin(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = mensaje; toast.className = 'toast-notification'; toast.classList.add(tipo);
    toast.style.display = 'block'; void toast.offsetWidth;
    toast.style.opacity = '1'; toast.style.transform = 'translateY(0)';
    setTimeout(() => {
        toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 3000);
}

// --- Funciones Genéricas para Listas Simples (Clientes, TiposCx) ---
async function loadSimpleList(collectionName, domRefs, fieldName = 'nombre') {
    domRefs.loadMsg.style.display = 'block'; domRefs.list.style.display = 'none'; domRefs.list.innerHTML = '';
    try {
        const snapshot = await db.collection(collectionName).orderBy(fieldName).get();
        if (snapshot.empty) { domRefs.loadMsg.textContent = `No hay ${collectionName.replace(/([A-Z])/g, ' $1').toLowerCase()} definidos.`; return; }
        snapshot.forEach(doc => {
            const data = doc.data();
            const li = document.createElement('li'); li.dataset.id = doc.id;
            const nameSpan = document.createElement('span'); nameSpan.textContent = data[fieldName]; li.appendChild(nameSpan);
            const actionsDiv = document.createElement('div'); actionsDiv.classList.add('data-actions');
            const editBtn = document.createElement('button'); editBtn.textContent = 'Editar'; editBtn.classList.add('btn-edit');
            editBtn.onclick = () => editSimpleListItem(collectionName, doc.id, data[fieldName], domRefs, fieldName);
            actionsDiv.appendChild(editBtn);
            const deleteBtn = document.createElement('button'); deleteBtn.textContent = 'Borrar'; deleteBtn.classList.add('btn-delete');
            deleteBtn.onclick = () => deleteSimpleListItem(collectionName, doc.id, data[fieldName], domRefs);
            actionsDiv.appendChild(deleteBtn);
            li.appendChild(actionsDiv); domRefs.list.appendChild(li);
        });
        domRefs.loadMsg.style.display = 'none'; domRefs.list.style.display = 'block';
    } catch (error) {
        console.error(`Error cargando ${collectionName}:`, error);
        domRefs.loadMsg.textContent = 'Error al cargar.'; domRefs.loadMsg.style.color = 'red';
        mostrarToastAdmin(`Error cargando ${collectionName}.`, 'error');
    }
}

async function addSimpleListItem(collectionName, domRefs, fieldName = 'nombre') {
    const value = domRefs.input.value.trim();
    if (!value) { mostrarToastAdmin(`Ingrese un ${fieldName} para el ${collectionName.slice(0,-1)}.`, 'warning'); return; }
    domRefs.addBtn.disabled = true; domRefs.addBtn.textContent = 'Añadiendo...';
    try {
        await db.collection(collectionName).add({ [fieldName]: value });
        mostrarToastAdmin(`${collectionName.slice(0,-1)} añadido.`, 'success');
        domRefs.input.value = ''; await loadSimpleList(collectionName, domRefs, fieldName);
    } catch (error) {
        console.error(`Error añadiendo a ${collectionName}:`, error);
        mostrarToastAdmin(`Error al añadir ${collectionName.slice(0,-1)}.`, 'error');
    } finally {
        domRefs.addBtn.disabled = false; domRefs.addBtn.textContent = '➕ Añadir';
    }
}

async function editSimpleListItem(collectionName, id, currentValue, domRefs, fieldName = 'nombre') {
    const newValue = prompt(`Editar ${fieldName} de ${collectionName.slice(0,-1)}:`, currentValue);
    if (newValue === null || newValue.trim() === '' || newValue.trim() === currentValue) return;
    try {
        await db.collection(collectionName).doc(id).update({ [fieldName]: newValue.trim() });
        mostrarToastAdmin(`${collectionName.slice(0,-1)} actualizado.`, 'success');
        await loadSimpleList(collectionName, domRefs, fieldName);
    } catch (error) {
        console.error(`Error actualizando ${collectionName}:`, error);
        mostrarToastAdmin('Error al actualizar.', 'error');
    }
}

async function deleteSimpleListItem(collectionName, id, name, domRefs) {
    if (!confirm(`¿Eliminar ${collectionName.slice(0,-1)} "${name}"?`)) return;
    try {
        await db.collection(COLECCION_CLIENTES).doc(id).delete(); // CORREGIDO: Usar la colección correcta
        mostrarToastAdmin(`${collectionName.slice(0,-1)} eliminado.`, 'success');
        await loadSimpleList(collectionName, domRefs);
    } catch (error) {
        console.error(`Error eliminando de ${collectionName}:`, error);
        mostrarToastAdmin('Error al eliminar.', 'error');
    }
}


// --- Funciones para Materiales (Específicas por estructura de tabla) ---
async function loadMateriales() {
    refs.materiales.loadMsg.style.display = 'block'; refs.materiales.table.style.display = 'none'; refs.materiales.tableBody.innerHTML = '';
    try {
        const snapshot = await db.collection(COLECCION_MATERIALES).orderBy('categoria').orderBy('code').get();
        if (snapshot.empty) { refs.materiales.loadMsg.textContent = 'No hay materiales definidos.'; return; }
        snapshot.forEach(doc => {
            const data = doc.data(); const tr = document.createElement('tr'); tr.dataset.id = doc.id;
            const cell = (txt) => { const td = document.createElement('td'); td.textContent = txt || '-'; return td; };
            tr.appendChild(cell(data.code)); tr.appendChild(cell(data.description)); tr.appendChild(cell(data.categoria));
            const tdActions = document.createElement('td'); tdActions.classList.add('data-actions');
            const editBtn = document.createElement('button'); editBtn.textContent = 'Editar'; editBtn.classList.add('btn-edit');
            editBtn.onclick = () => editMaterial(doc.id, data); tdActions.appendChild(editBtn);
            const deleteBtn = document.createElement('button'); deleteBtn.textContent = 'Borrar'; deleteBtn.classList.add('btn-delete');
            deleteBtn.onclick = () => deleteMaterial(doc.id, data.code); tdActions.appendChild(deleteBtn);
            tr.appendChild(tdActions); refs.materiales.tableBody.appendChild(tr);
        });
        refs.materiales.loadMsg.style.display = 'none'; refs.materiales.table.style.display = 'table';
    } catch (error) {
        console.error("Error cargando materiales:", error);
        refs.materiales.loadMsg.textContent = 'Error al cargar.'; refs.materiales.loadMsg.style.color = 'red';
        mostrarToastAdmin('Error cargando materiales.', 'error');
    }
}

async function addMaterial() {
    const { code, desc, cat } = refs.materiales.inputs;
    const codeVal = code.value.trim(), descVal = desc.value.trim(), catVal = cat.value.trim();
    if (!codeVal || !descVal || !catVal) { mostrarToastAdmin('Complete todos los campos del material.', 'warning'); return; }
    refs.materiales.addBtn.disabled = true; refs.materiales.addBtn.textContent = 'Añadiendo...';
    try {
        await db.collection(COLECCION_MATERIALES).add({ code: codeVal, description: descVal, categoria: catVal });
        mostrarToastAdmin('Material añadido.', 'success');
        code.value = ''; desc.value = ''; cat.value = ''; await loadMateriales();
    } catch (error) {
        console.error("Error añadiendo material:", error); mostrarToastAdmin('Error al añadir material.', 'error');
    } finally {
        refs.materiales.addBtn.disabled = false; refs.materiales.addBtn.textContent = '➕ Añadir';
    }
}

async function editMaterial(id, currentData) {
    const newCode = prompt(`Editar Código:`, currentData.code); if (newCode === null) return;
    const newDesc = prompt(`Editar Descripción:`, currentData.description); if (newDesc === null) return;
    const newCat = prompt(`Editar Categoría:`, currentData.categoria); if (newCat === null) return;
    const updated = { code: newCode.trim()||currentData.code, description: newDesc.trim()||currentData.description, categoria: newCat.trim()||currentData.categoria };
    if (updated.code===currentData.code && updated.description===currentData.description && updated.categoria===currentData.categoria) return;
    try {
        await db.collection(COLECCION_MATERIALES).doc(id).update(updated);
        mostrarToastAdmin('Material actualizado.', 'success'); await loadMateriales();
    } catch (error) { console.error("Error actualizando material:", error); mostrarToastAdmin('Error al actualizar.', 'error'); }
}

async function deleteMaterial(id, code) {
    if (!confirm(`¿Eliminar material "${code}"?`)) return;
    try {
        await db.collection(COLECCION_MATERIALES).doc(id).delete();
        mostrarToastAdmin('Material eliminado.', 'success'); await loadMateriales();
    } catch (error) { console.error("Error eliminando material:", error); mostrarToastAdmin('Error al eliminar.', 'error'); }
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    loadSimpleList(COLECCION_CLIENTES, refs.clientes);
    refs.clientes.addBtn.addEventListener('click', () => addSimpleListItem(COLECCION_CLIENTES, refs.clientes));
    refs.clientes.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') refs.clientes.addBtn.click(); });

    loadSimpleList(COLECCION_TIPOS_CX, refs.tiposCx);
    refs.tiposCx.addBtn.addEventListener('click', () => addSimpleListItem(COLECCION_TIPOS_CX, refs.tiposCx));
    refs.tiposCx.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') refs.tiposCx.addBtn.click(); });
    
    loadMateriales();
    refs.materiales.addBtn.addEventListener('click', addMaterial);
    Object.values(refs.materiales.inputs).forEach(input => {
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') refs.materiales.addBtn.click(); });
    });
});
// --- END OF FILE datos_admin.js ---
