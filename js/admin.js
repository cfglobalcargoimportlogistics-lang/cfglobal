import { auth } from './firebase-auth.js';
import { db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy, updateDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { DEFAULT_TARIFF, SERVICES, TARIFF_VARIABLES } from "./services-config.js";
import { evaluateFormula } from "./formula.js";

// Configuración pública de subida de imágenes en Cloudinary.
const CLOUD_NAME = window.APP_CONFIG?.cloudinary?.cloudName || "";
const UPLOAD_PRESET = window.APP_CONFIG?.cloudinary?.uploadPreset || "";
const PRODUCTS_COLLECTION = "productos";
const categoryLabels = { china: "China", zofri: "Chile · Zofri" };

const authLoading = document.getElementById('authLoading');
const loginSection = document.getElementById('loginSection');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const btnLogout = document.getElementById('btnLogout');
const adminTableBody = document.getElementById('adminTableBody');
const addProductForm = document.getElementById('addProductForm');
const saveProductButton = document.getElementById('saveProductButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const productFormTitle = document.getElementById('productFormTitle');
const productFormStatus = document.getElementById('productFormStatus');
const productImageInput = document.getElementById('prod-imagenFile');
const tariffForm = document.getElementById('tariffForm');
const tariffEditor = document.getElementById('tariffEditor');
const tariffFormStatus = document.getElementById('tariffFormStatus');
const saveTariffsButton = document.getElementById('saveTariffsButton');
const adminTabButtons = [...document.querySelectorAll('[data-admin-tab]')];
const adminTabPanels = [...document.querySelectorAll('[data-admin-panel]')];

function activateAdminTab(name, moveFocus = false) {
    adminTabButtons.forEach((button) => {
        const selected = button.dataset.adminTab === name;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        if (selected && moveFocus) button.focus();
    });
    adminTabPanels.forEach((panel) => {
        panel.hidden = panel.dataset.adminPanel !== name;
    });
}

adminTabButtons.forEach((button) => {
    button.addEventListener('click', () => activateAdminTab(button.dataset.adminTab));
    button.addEventListener('keydown', (event) => {
        const currentIndex = adminTabButtons.indexOf(button);
        let nextIndex = currentIndex;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % adminTabButtons.length;
        else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + adminTabButtons.length) % adminTabButtons.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = adminTabButtons.length - 1;
        else return;
        event.preventDefault();
        activateAdminTab(adminTabButtons[nextIndex].dataset.adminTab, true);
    });
});

let productsList = [];
let editingProductId = null;
let editingImageUrl = "";

onAuthStateChanged(auth, (user) => {
    authLoading.hidden = true;
    loginSection.style.display = user ? 'none' : 'flex';
    adminDashboard.style.display = user ? 'block' : 'none';
    if (user) {
        loadAdminProducts();
        loadAdminTariffs();
    } else {
        loginError.textContent = "";
        loginError.hidden = true;
    }
}, (error) => {
    console.error("No se pudo comprobar la sesión:", error);
    authLoading.hidden = true;
    loginSection.style.display = 'flex';
    adminDashboard.style.display = 'none';
    loginError.textContent = "No se pudo comprobar la sesión. Recarga la página e inténtalo nuevamente.";
    loginError.hidden = false;
});

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.hidden = true;
    loginError.textContent = "";
    try {
        await signInWithEmailAndPassword(
            auth,
            document.getElementById('loginEmail').value.trim(),
            document.getElementById('loginPassword').value
        );
    } catch (error) {
        console.error("Error de acceso:", error);
        loginError.textContent = "No se pudo iniciar sesión. Revisa tu correo y contraseña.";
        loginError.hidden = false;
    }
});

btnLogout.addEventListener('click', async () => {
    btnLogout.disabled = true;
    try {
        await signOut(auth);
        window.location.replace('index.html');
    } catch (error) {
        console.error("Error cerrando sesión:", error);
        btnLogout.disabled = false;
    }
});
cancelEditButton.addEventListener('click', resetProductForm);

tariffEditor.innerHTML = SERVICES.map((service) => `
    <article class="tariff-service-card" data-tariff-service="${service.id}">
        <div class="tariff-service-heading">
            <div><h4>${service.title}</h4><p>${service.origin}</p></div>
            <label class="tariff-enable"><input type="checkbox" data-tariff-enabled> Mostrar estimación</label>
        </div>
        <div class="tariff-rate-grid">
            <label>Base (Bs.)<input type="number" min="0" step="0.01" data-tariff-field="baseBOB"></label>
            <label>Por kg (Bs.)<input type="number" min="0" step="0.01" data-tariff-field="tarifaKg"></label>
            <label>Por m³ / CBM (Bs.)<input type="number" min="0" step="0.01" data-tariff-field="tarifaCbm"></label>
            <label>Por caja / bulto (Bs.)<input type="number" min="0" step="0.01" data-tariff-field="tarifaCaja"></label>
            <label>Por contenedor (Bs.)<input type="number" min="0" step="0.01" data-tariff-field="tarifaContenedor"></label>
            <label>Margen (%)<input type="number" min="0" step="0.01" data-tariff-field="margen"></label>
        </div>
        <label class="tariff-formula-label">Fórmula para este servicio
            <textarea rows="2" spellcheck="false" data-tariff-field="formula"></textarea>
        </label>
        <small class="tariff-variables">Variables permitidas: ${TARIFF_VARIABLES}. Operadores: + − × ÷ y paréntesis.</small>
    </article>`).join('');

tariffForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    saveTariffsButton.disabled = true;
    tariffFormStatus.textContent = "Guardando tarifas…";
    const tarifas = {};
    try {
        for (const service of SERVICES) {
            const card = tariffEditor.querySelector(`[data-tariff-service="${service.id}"]`);
            const formula = card.querySelector('[data-tariff-field="formula"]').value.trim();
            const settings = {
                enabled: card.querySelector('[data-tariff-enabled]').checked,
                baseBOB: numericRate(card, "baseBOB"),
                tarifaKg: numericRate(card, "tarifaKg"),
                tarifaCbm: numericRate(card, "tarifaCbm"),
                tarifaCaja: numericRate(card, "tarifaCaja"),
                tarifaContenedor: numericRate(card, "tarifaContenedor"),
                margen: numericRate(card, "margen"),
                formula
            };
            if (settings.enabled && !formula) throw new Error(`Escribe la fórmula para “${service.title}”.`);
            if (formula) evaluateFormula(formula, {
                base: settings.baseBOB, kg: 10, cbm: 1, cajas: 2, contenedores: 1,
                tarifaKg: settings.tarifaKg, tarifaCbm: settings.tarifaCbm,
                tarifaCaja: settings.tarifaCaja, tarifaContenedor: settings.tarifaContenedor,
                margen: settings.margen
            });
            tarifas[service.id] = settings;
        }
        await setDoc(doc(db, "configuracion", "cotizaciones"), { tarifas, fechaActualizacion: new Date() }, { merge: true });
        tariffFormStatus.textContent = "Tarifas guardadas. El cotizador ya puede usarlas.";
    } catch (error) {
        console.error("Error guardando tarifas:", error);
        tariffFormStatus.textContent = error.message || "No se pudieron guardar las tarifas.";
    } finally {
        saveTariffsButton.disabled = false;
    }
});

function numericRate(card, field) {
    const value = Number(card.querySelector(`[data-tariff-field="${field}"]`).value);
    if (!Number.isFinite(value) || value < 0) throw new Error("Las tarifas deben ser números iguales o mayores que cero.");
    return value;
}

async function loadAdminTariffs() {
    tariffFormStatus.textContent = "Cargando tarifas…";
    try {
        const snapshot = await getDoc(doc(db, "configuracion", "cotizaciones"));
        const saved = snapshot.exists() ? snapshot.data().tarifas || {} : {};
        SERVICES.forEach((service) => {
            const settings = { ...DEFAULT_TARIFF, ...(saved[service.id] || {}) };
            const card = tariffEditor.querySelector(`[data-tariff-service="${service.id}"]`);
            card.querySelector('[data-tariff-enabled]').checked = Boolean(settings.enabled);
            Object.entries(settings).forEach(([key, value]) => {
                const field = card.querySelector(`[data-tariff-field="${key}"]`);
                if (field) field.value = value;
            });
        });
        tariffFormStatus.textContent = snapshot.exists() ? "Tarifas actuales cargadas." : "Configura tarifas para habilitar las estimaciones automáticas.";
    } catch (error) {
        console.error("Error cargando tarifas:", error);
        tariffFormStatus.textContent = "No se pudieron cargar las tarifas. Revisa permisos de Firestore.";
    }
}

addProductForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = productImageInput.files[0];

    if (!editingProductId && !file) {
        productFormStatus.textContent = "Selecciona una fotografía para el producto.";
        return;
    }

    saveProductButton.disabled = true;
    cancelEditButton.disabled = true;

    try {
        let imageUrl = editingImageUrl;
        if (file) {
            productFormStatus.textContent = "Subiendo fotografía...";
            imageUrl = await uploadProductImage(file);
        }

        const productData = {
            categoria: document.getElementById('prod-categoria').value,
            subcategoria: document.getElementById('prod-subcategoria').value.trim(),
            nombre: document.getElementById('prod-nombre').value.trim(),
            descripcion: document.getElementById('prod-desc').value.trim(),
            precioUnitario: Number(document.getElementById('prod-precioUnitario').value) || 0,
            precioCaja: Number(document.getElementById('prod-precioCaja').value) || 0,
            unidadesCaja: Number.parseInt(document.getElementById('prod-unidadesCaja').value, 10) || 0,
            precioBolivia: Number(document.getElementById('prod-precioBolivia').value) || 0,
            moneda: "BOB",
            imagenUrl: imageUrl,
            disponibilidad: document.getElementById('prod-disponibilidad').value,
            fechaActualizacion: new Date()
        };

        if (editingProductId) {
            await updateDoc(doc(db, PRODUCTS_COLLECTION, editingProductId), productData);
            productFormStatus.textContent = "Cambios guardados.";
        } else {
            await addDoc(collection(db, PRODUCTS_COLLECTION), { ...productData, fechaCreacion: new Date() });
            productFormStatus.textContent = "Producto publicado.";
        }

        resetProductForm();
        await loadAdminProducts();
    } catch (error) {
        console.error("Error guardando producto:", error);
        productFormStatus.textContent = "No se pudo guardar. Revisa la conexión e inténtalo nuevamente.";
    } finally {
        saveProductButton.disabled = false;
        cancelEditButton.disabled = false;
    }
});

async function uploadProductImage(file) {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error("Falta configurar Cloudinary en .env.");
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
    });
    const result = await response.json();
    if (!response.ok || !result.secure_url) {
        throw new Error(result.error?.message || "Cloudinary no pudo subir la imagen.");
    }
    return result.secure_url;
}

async function loadAdminProducts() {
    adminTableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:20px;">Cargando productos...</td></tr>';

    try {
        const productsQuery = query(collection(db, PRODUCTS_COLLECTION), orderBy("fechaCreacion", "desc"));
        const snapshot = await getDocs(productsQuery);
        productsList = snapshot.docs.map((productDoc) => ({ id: productDoc.id, ...productDoc.data() }));
        renderAdminTable();
    } catch (error) {
        console.error("Error cargando productos:", error);
        adminTableBody.innerHTML = '<tr><td colspan="6" class="text-center admin-error-row" style="padding:20px;">No se pudieron cargar los productos.</td></tr>';
    }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

function safeImageUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

function formatBolivianos(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0
        ? `Bs ${amount.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "Consultar";
}

function renderAdminTable() {
    if (!productsList.length) {
        adminTableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:20px;">No hay productos registrados.</td></tr>';
        return;
    }

    adminTableBody.innerHTML = productsList.map((product) => {
        const imageUrl = safeImageUrl(product.imagenUrl);
        const image = imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" style="width:45px;height:45px;object-fit:cover;border-radius:6px;" alt="">`
            : '<span aria-label="Sin fotografía">—</span>';
        const category = categoryLabels[product.categoria] || product.categoria || "Sin origen";
        const priceUnit = product.moneda === "BOB" ? formatBolivianos(product.precioUnitario) : "Pendiente actualizar en Bs.";
        const priceBolivia = product.moneda === "BOB" ? formatBolivianos(product.precioBolivia) : "Pendiente actualizar en Bs.";
        return `
            <tr style="border-bottom:1px solid var(--border-color);">
                <td style="padding:10px;">${image}</td>
                <td style="padding:10px;"><strong>${escapeHtml(product.nombre)}</strong><br><small>${escapeHtml(product.subcategoria || "")}</small></td>
                <td style="padding:10px;"><span style="font-size:.75rem;font-weight:800;color:var(--accent-orange);">${escapeHtml(category)}</span></td>
                <td style="padding:10px;">${escapeHtml(priceUnit)}</td>
                <td style="padding:10px;"><strong style="color:var(--primary-blue);">${escapeHtml(priceBolivia)}</strong></td>
                <td style="padding:10px;"><div class="admin-action-group">
                    <button type="button" class="btn-admin-action" data-action="edit" data-id="${escapeHtml(product.id)}">Editar</button>
                    <button type="button" class="btn-admin-action" data-action="delete" data-id="${escapeHtml(product.id)}">Eliminar</button>
                </div></td>
            </tr>`;
    }).join('');
}

adminTableBody.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('button[data-action][data-id]');
    if (!actionButton) return;
    const product = productsList.find((item) => item.id === actionButton.dataset.id);
    if (!product) return;

    if (actionButton.dataset.action === "edit") {
        startEditingProduct(product);
    } else if (actionButton.dataset.action === "delete") {
        await deleteProduct(product);
    }
});

function startEditingProduct(product) {
    editingProductId = product.id;
    editingImageUrl = product.imagenUrl || "";
    document.getElementById('prod-categoria').value = product.categoria || "china";
    document.getElementById('prod-subcategoria').value = product.subcategoria || "";
    document.getElementById('prod-nombre').value = product.nombre || "";
    document.getElementById('prod-desc').value = product.descripcion || "";
    const legacyCurrency = product.moneda !== "BOB";
    document.getElementById('prod-precioUnitario').value = legacyCurrency ? "" : product.precioUnitario ?? "";
    document.getElementById('prod-precioCaja').value = legacyCurrency ? "" : product.precioCaja ?? "";
    document.getElementById('prod-unidadesCaja').value = product.unidadesCaja ?? "";
    document.getElementById('prod-precioBolivia').value = legacyCurrency ? "" : product.precioBolivia ?? "";
    document.getElementById('prod-disponibilidad').value = product.disponibilidad || "disponible";
    productImageInput.value = "";
    productImageInput.required = false;
    productFormTitle.textContent = `Editar producto: ${product.nombre || "Producto"}`;
    saveProductButton.textContent = "GUARDAR CAMBIOS";
    cancelEditButton.hidden = false;
    productFormStatus.textContent = legacyCurrency
        ? "Este producto tiene precios antiguos sin moneda registrada. Ingresa nuevamente los tres precios en Bs.; no se aplicó una conversión automática."
        : editingImageUrl ? "La fotografía actual se conserva si no seleccionas otra." : "Selecciona una fotografía para este producto.";
    addProductForm.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById('prod-nombre').focus({ preventScroll: true });
}

function resetProductForm() {
    addProductForm.reset();
    editingProductId = null;
    editingImageUrl = "";
    productImageInput.required = true;
    productFormTitle.textContent = "📦 Registrar Nuevo Producto en Catálogo";
    saveProductButton.textContent = "GUARDAR Y PUBLICAR PRODUCTO";
    cancelEditButton.hidden = true;
    productFormStatus.textContent = "";
}

async function deleteProduct(product) {
    if (!confirm(`¿Eliminar “${product.nombre || "este producto"}” permanentemente?`)) return;
    try {
        await deleteDoc(doc(db, PRODUCTS_COLLECTION, product.id));
        productsList = productsList.filter((item) => item.id !== product.id);
        renderAdminTable();
        productFormStatus.textContent = "Producto eliminado.";
    } catch (error) {
        console.error("Error eliminando producto:", error);
        productFormStatus.textContent = "No se pudo eliminar el producto.";
    }
}
