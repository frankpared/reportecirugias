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
    // Ocultar toast anterior si existe para evitar solapamientos
    toast.classList.remove('visible');
    toast.style.display = 'none';

    toast.textContent = mensaje;
    toast.className = 'toast-notification'; 
    toast.classList.add(tipo); 
    
    // Forzar reflow para reiniciar animación si es necesario
    void toast.offsetWidth; 

    toast.style.display = 'block'; // Hacer visible antes de añadir la clase
    setTimeout(() => { // Añadir clase visible en el siguiente ciclo para que la transición funcione
        toast.classList.add('visible');
        toast.style.transform = 'translateY(0)';
    }, 10); 
    
    setTimeout(() => {
        toast.classList.remove('visible');
        toast.style.transform = 'translateY(20px)';
        // Esperar que termine la transición para ocultar con display:none
        setTimeout(() => { toast.style.display = 'none'; }, 300); 
    }, 4000); 
}

// --- Funciones Genéricas para CRUD de Listas Simples (Nombre) ---
async function loadSimpleList(collectionName, listElement, loadingElement, itemNameSingular, itemNamePlural) {
    console.log(`Intentando cargar: ${itemNamePlural} desde ${collectionName}`); // Log de inicio
    loadingElement.style.display = 'block';
    loadingElement.textContent = `Cargando ${itemNamePlural}...`; // Mensaje inicial
    loadingElement.style.color = '#777'; // Color normal
    listElement.style.display = 'none';
    listElement.innerHTML = '';

    try {
        const snapshot = await db.collection(collectionName).orderBy('nombreLower').get();
        console.log(`Snapshot recibido para ${itemNamePlural}. Vacío: ${snapshot.empty}, Tamaño: ${snapshot.size}`); // Log del resultado

        if (snapshot.empty) {
            loadingElement.textContent = `No hay ${itemNamePlural} definidos.`;
            // No mostrar error, solo el mensaje de vacío
            loadingElement.style.display = 'block'; // Asegurarse que el mensaje sea visible
            listElement.style.display = 'none'; // Ocultar la lista vacía
            return;
        }
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.nombre) { // Chequeo por si falta el campo nombre
                 console.warn(`Documento ${doc.id} en ${collectionName} no tiene campo 'nombre'. Omitiendo.`);
                 return; // Saltar este documento
            }
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
        loadingElement.style.display = 'none'; // Ocultar mensaje de carga
        listElement.style.display = 'block'; // Mostrar la lista

    } catch (error) {
        console.error(`Error cargando ${itemNamePlural} desde ${collectionName}:`, error); // Log detallado del error
        loadingElement.textContent = 'Error al cargar datos.'; // Mensaje genérico de error
        loadingElement.style.color = 'red'; // Color rojo para error
        loadingElement.style.display = 'block'; // Asegurarse que el mensaje de error sea visible
        listElement.style.display = 'none'; // Ocultar lista si hay error
        mostrarToast(`Error cargando ${itemNamePlural}. Revise la consola.`, 'error'); // Toast con más info
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
        const nombreLower = nombre.toLowerCase();
        const querySnapshot = await db.collection(collectionName).where('nombreLower', '==', nombreLower).get();
        if (!querySnapshot.empty) {
            mostrarToast(`El ${itemNameSingular} "${nombre}" ya existe.`, 'warning');
            inputElement.focus();
            // No retornar aquí, permitir reactivar el botón en finally
        } else {
            await db.collection(collectionName).add({ nombre: nombre, nombreLower: nombreLower }); 
            mostrarToast(`${itemNameSingular.charAt(0).toUpperCase() + itemNameSingular.slice(1)} añadido con éxito.`, 'success');
            inputElement.value = '';
            await loadSimpleList(collectionName, listElement, loadingElement, itemNameSingular, itemNamePlural); // Recargar lista
        }
    } catch (error) {
        console.error(`Error añadiendo ${itemNameSingular}:`, error);
        mostrarToast(`Error al añadir ${itemNameSingular}.`, 'error');
    } finally {
        // Asegurarse de reactivar el botón incluso si ya existía o hubo error
        addButtonElement.disabled = false; addButtonElement.textContent = '➕ Añadir';
    }
}

async function editSimpleListItem(collectionName, id, currentName, itemNameSingular, listElement, loadingElement, itemNamePlural) {
    const newName = prompt(`Editar nombre del ${itemNameSingular}:\n(Actual: ${currentName})`, currentName);
    if (newName === null || newName.trim() === '' || newName.trim() === currentName) return;
    
    const newNameTrimmed = newName.trim();
    const newNameLower = newNameTrimmed.toLowerCase();
    try {
        const querySnapshot = await db.collection(collectionName).where('nombreLower', '==', newNameLower).get();
        let conflict = false;
        querySnapshot.forEach(doc => {
            if (doc.id !== id) conflict = true; 
        });
        if (conflict) {
            mostrarToast(`El nombre "${newNameTrimmed}" ya existe para otro ${itemNameSingular}.`, 'warning');
            return;
        }

        await db.collection(collectionName).doc(id).update({ nombre: newNameTrimmed, nombreLower: newNameLower });
        mostrarToast(`${itemNameSingular.charAt(0).toUpperCase() + itemNameSingular.slice(1)} actualizado.`, 'success');
        await loadSimpleList(collectionName, listElement, loadingElement, itemNameSingular, itemNamePlural); // Recargar lista
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
        await loadSimpleList(collectionName, listElement, loadingElement, itemNameSingular, itemNamePlural); // Recargar lista
    } catch (error) {
        console.error(`Error eliminando ${itemNameSingular}:`, error);
        mostrarToast('Error al eliminar.', 'error');
    }
}

// --- Funciones Específicas para Materiales ---
async function loadMateriales() {
    console.log("Intentando cargar: Materiales"); // Log
    loadingMateriales.style.display = 'block'; 
    loadingMateriales.textContent = 'Cargando materiales...';
    loadingMateriales.style.color = '#777';
    materialesTable.style.display = 'none'; 
    materialesTableBody.innerHTML = '';
    try {
        const snapshot = await db.collection(COLECCION_MATERIALES).orderBy('categoria').orderBy('code').get();
        console.log(`Snapshot recibido para Materiales. Vacío: ${snapshot.empty}, Tamaño: ${snapshot.size}`); // Log
        if (snapshot.empty) { 
            loadingMateriales.textContent = 'No hay materiales definidos.'; 
            loadingMateriales.style.display = 'block';
            materialesTable.style.display = 'none';
            return; 
        }
        snapshot.forEach(doc => {
            const data = doc.data(); 
             if (!data.code || !data.description || !data.categoria) { // Chequeo campos requeridos
                 console.warn(`Documento ${doc.id} en ${COLECCION_MATERIALES} le faltan campos (code, description, categoria). Omitiendo.`);
                 return; 
            }
            const tr = document.createElement('tr'); tr.dataset.id = doc.id;
            const createCell = (text) => { const td = document.createElement('td'); td.textContent = text || '-'; return td; };
            tr.appendChild(createCell(data.code)); tr.appendChild(createCell(data.description)); tr.appendChild(createCell(data.categoria));
            const tdActions = document.createElement('td'); tdActions.classList.add('data-actions');
            const editBtn = document.createElement('button'); editBtn.textContent = 'Editar'; editBtn.classList.add('btn-edit');
            editBtn.onclick = () => editMaterial(doc.id, data); tdActions.appendChild(editBtn);
            const deleteBtn = document.createElement('button'); deleteBtn.textContent = 'Borrar'; deleteBtn.classList.add('btn-delete');
            deleteBtn.onclick = () => deleteMaterial(doc.id, data.code); tdActions.appendChild(deleteBtn);
            tr.appendChild(tdActions); materialesTableBody.appendChild(tr);
        });
        loadingMateriales.style.display = 'none'; 
        materialesTable.style.display = 'table';
    } catch (error) {
        console.error(`Error cargando ${COLECCION_MATERIALES}:`, error); // Log detallado
        loadingMateriales.textContent = 'Error al cargar datos.'; 
        loadingMateriales.style.color = 'red'; 
        loadingMateriales.style.display = 'block';
        materialesTable.style.display = 'none';
        mostrarToast('Error cargando materiales. Revise la consola.', 'error');
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
            // No retornar, dejar que finally reactive el botón
        } else {
            await db.collection(COLECCION_MATERIALES).add({ code: code, description: description, categoria: categoria });
            mostrarToast('Material añadido con éxito.', 'success');
            newMaterialCodeInput.value = ''; newMaterialDescInput.value = ''; newMaterialCatInput.value = '';
            await loadMateriales(); // Recargar
        }
    } catch (error) {
        console.error("Error añadiendo material:", error); mostrarToast('Error al añadir material.', 'error');
    } finally {
        addMaterialBtn.disabled = false; addMaterialBtn.textContent = '➕ Añadir';
    }
}

async function editMaterial(id, currentData) {
    const newCode = prompt(`Editar Código (Actual: ${currentData.code}):`, currentData.code);
    if (newCode === null) return; // Cancelado en el primer prompt
    const newDesc = prompt(`Editar Descripción (Actual: ${currentData.description}):`, currentData.description);
    if (newDesc === null) return; // Cancelado en el segundo prompt
    const newCat = prompt(`Editar Categoría (Actual: ${currentData.categoria}):`, currentData.categoria);
    if (newCat === null) return; // Cancelado en el tercer prompt

    const newCodeTrimmed = newCode.trim();
    const newDescTrimmed = newDesc.trim();
    const newCatTrimmed = newCat.trim();

    // Validar que los campos obligatorios no queden vacíos después de editar
    if (!newCodeTrimmed || !newDescTrimmed || !newCatTrimmed) {
         mostrarToast('Los campos Código, Descripción y Categoría no pueden quedar vacíos.', 'warning');
         return;
    }

    const updatedData = {
        code: newCodeTrimmed,
        description: newDescTrimmed,
        categoria: newCatTrimmed
    };
    // Verificar si hubo cambios reales
    if (updatedData.code === currentData.code && updatedData.description === currentData.description && updatedData.categoria === currentData.categoria) {
         mostrarToast('No se realizaron cambios.', 'info');
         return;
    }

    try {
        // Verificar si el nuevo código ya existe en otro documento
        if (newCodeTrimmed !== currentData.code) {
            const existing = await db.collection(COLECCION_MATERIALES).where('code', '==', newCodeTrimmed).limit(1).get();
            let conflict = false;
            existing.forEach(doc => { if(doc.id !== id) conflict = true; });
            if (conflict) {
                mostrarToast(`El código de material "${newCodeTrimmed}" ya existe.`, 'warning');
                return;
            }
        }
        await db.collection(COLECCION_MATERIALES).doc(id).update(updatedData);
        mostrarToast('Material actualizado.', 'success'); 
        await loadMateriales(); // Recargar
    } catch (error) {
        console.error("Error actualizando material:", error); mostrarToast('Error al actualizar.', 'error');
    }
}

async function deleteMaterial(id, code) {
    if (!confirm(`¿Está seguro de que desea eliminar el material con código "${code}" (ID: ${id})?`)) return;
    try {
        await db.collection(COLECCION_MATERIALES).doc(id).delete();
        mostrarToast('Material eliminado.', 'success'); 
        await loadMateriales(); // Recargar
    } catch (error) {
        console.error("Error eliminando material:", error); mostrarToast('Error al eliminar.', 'error');
    }
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Iniciando carga de datos...");
    // Cargar listas
    loadSimpleList(COLECCION_CLIENTES, clienteList, loadingClientes, 'cliente', 'clientes');
    loadSimpleList(COLECCION_TIPOS_CX, tipoCxList, loadingTiposCx, 'tipo de cirugía', 'tipos de cirugía');
    loadMateriales();

    // Listeners para añadir
    addClienteBtn.addEventListener('click', () => addSimpleListItem(COLECCION_CLIENTES, newClienteNameInput, addClienteBtn, 'cliente', clienteList, loadingClientes, 'clientes'));
    addTipoCxBtn.addEventListener('click', () => addSimpleListItem(COLECCION_TIPOS_CX, newTipoCxNameInput, addTipoCxBtn, 'tipo de cirugía', tipoCxList, loadingTiposCx, 'tipos de cirugía'));
    addMaterialBtn.addEventListener('click', addMaterial);

    // Listeners para Enter
    newClienteNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addClienteBtn.click(); });
    newTipoCxNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTipoCxBtn.click(); });
    [newMaterialCodeInput, newMaterialDescInput, newMaterialCatInput].forEach(input => {
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addMaterialBtn.click(); });
    });
    console.log("Listeners añadidos.");
});

// --- END OF FILE datos_admin.js ---
