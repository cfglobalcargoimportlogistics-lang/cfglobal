import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { DEFAULT_TARIFF, SERVICES } from "./services-config.js";
import { evaluateFormula } from "./formula.js";

const optionsRoot = document.querySelector("#serviceOptions");
const panel = document.querySelector("#serviceFormPanel");
const formRoot = document.querySelector("#serviceFormContent");
const APP_CONFIG = window.APP_CONFIG || {};
let tariffs = {};

const SERVICE_ICONS = Object.freeze({
  boxes: "<svg viewBox='0 0 48 48' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='m24 5 13 7.5v15L24 35l-13-7.5v-15L24 5Z'/><path d='M11 12.5 24 20l13-7.5M24 20v15M7 23l8 4.6M41 23l-8 4.6'/><path d='m15 31 9 5 9-5'/></svg>",
  box: "<svg viewBox='0 0 48 48' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='m24 5 17 9.5v19L24 43 7 33.5v-19L24 5Z'/><path d='M7 14.5 24 24l17-9.5M24 24v19M18 8.4l17 9.5v8'/><path d='M15 10l17 9.5v7'/></svg>",
  container: "<svg viewBox='0 0 48 48' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><rect x='5' y='11' width='38' height='25' rx='3'/><path d='M12 11v25M19 11v25M26 11v25M33 11v25M5 18h38M10 41h28M14 36v5M34 36v5'/></svg>",
  ship: "<svg viewBox='0 0 48 48' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M8 24h32l-5 11H15L8 24Z'/><path d='M14 24V13h20v11M19 13V8h10v5M5 40c3-2 5-2 8 0s5 2 8 0 5-2 8 0 5 2 8 0 5-2 8 0'/><path d='m7 35-2 5M41 35l2 5'/></svg>",
  plane: "<svg viewBox='0 0 48 48' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='m5 27 15-4V10c0-2 1.5-3 3-3s3 1 3 3v13l15 4c1.5.4 2.5 1.5 2.5 3 0 1.4-1.3 2.4-2.7 2.1L26 29l-2 12-3-1-4-13-9 2.4C6 30 4.5 29 4.5 27.8c0-.4.2-.7.5-.8Z'/><path d='m20 14 3 3 3-3'/></svg>",
  truck: "<svg viewBox='0 0 48 48' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12h24v22H5zM29 20h8l6 7v7H29z'/><path d='M37 20v8h6M10 34a4 4 0 1 0 8 0M33 34a4 4 0 1 0 8 0M10 18h14M10 23h9'/></svg>",
  document: "<svg viewBox='0 0 48 48' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M13 5h15l9 9v20a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4Z'/><path d='M28 5v10h9M16 22h15M16 28h11'/><path d='m17 34 3 3 6-6'/></svg>",
  verify: "<svg viewBox='0 0 48 48' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><circle cx='21' cy='20' r='12'/><path d='m30 29 10 10'/><path d='m16 20 4 4 7-8'/><path d='M16 9c2-2 4-3 7-3'/></svg>",
  advice: "<svg viewBox='0 0 48 48' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M7 10h25a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H19l-9 7v-7a5 5 0 0 1-5-5V15a5 5 0 0 1 2-4Z'/><path d='M15 19h14M15 25h10'/><path d='M37 17h3a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4v5l-6-5'/></svg>"
});

function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function makeOptionCard(service) {
  const card = document.createElement("article");
  card.className = "service-card";
  const icon = document.createElement("span");
  icon.className = "service-card-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = SERVICE_ICONS[service.icon] || SERVICE_ICONS.box;
  const origin = document.createElement("small");
  origin.className = "service-card-origin";
  origin.textContent = service.origin;
  const title = document.createElement("h3");
  title.textContent = service.title;
  const description = document.createElement("p");
  description.textContent = service.description;
  const button = document.createElement("button");
  button.className = "button button-orange service-card-button";
  button.type = "button";
  button.textContent = "COTIZAR SERVICIO →";
  button.addEventListener("click", () => showServiceForm(service.id));
  card.append(icon, origin, title, description, button);
  card.addEventListener("click", (event) => {
    if (!event.target.closest("button")) showServiceForm(service.id);
  });
  return card;
}

function fieldMarkup(field, serviceId) {
  const id = `field-${serviceId}-${field.name}`;
  const required = field.required ? " required" : "";
  const label = `${escapeText(field.label)}${field.required ? ' <span aria-hidden="true">*</span>' : ""}`;
  if (field.type === "select") {
    const choices = (field.options || []).map((option) => `<option value="${escapeText(option)}">${escapeText(option)}</option>`).join("");
    return `<div class="service-field"><label for="${id}">${label}</label><select id="${id}" name="${escapeText(field.name)}"${required}><option value="">Selecciona una opción</option>${choices}</select></div>`;
  }
  if (field.type === "textarea") {
    return `<div class="service-field service-field-wide"><label for="${id}">${label}</label><textarea id="${id}" name="${escapeText(field.name)}" rows="3" maxlength="600" placeholder="${escapeText(field.placeholder || "")}"${required}></textarea></div>`;
  }
  const type = field.type || "text";
  const numeric = type === "number" ? ` min="${field.min ?? 0}" step="${field.step ?? "any"}" inputmode="decimal"` : "";
  const maxLength = ["text", "url", "email", "tel"].includes(type) ? ` maxlength="${type === "email" ? 254 : 180}"` : "";
  return `<div class="service-field"><label for="${id}">${label}</label><input id="${id}" name="${escapeText(field.name)}" type="${escapeText(type)}" placeholder="${escapeText(field.placeholder || "")}"${numeric}${maxLength}${required}></div>`;
}

function renderForm(service) {
  const computedLabels = service.id === "caja_zofri"
    ? '<div class="service-computed"><span>Peso total estimado</span><strong data-computed-weight>Se calcula automáticamente</strong><span>Volumen aproximado</span><strong data-computed-cbm>Se calcula automáticamente</strong></div>'
    : '<div class="service-computed" data-computed-summary hidden><span>Peso total estimado</span><strong data-computed-weight></strong><span>Volumen aproximado</span><strong data-computed-cbm></strong></div>';
  const fields = service.fields.map((field) => fieldMarkup(field, service.id)).join("");
  formRoot.innerHTML = `
    <div class="service-form-heading">
      <button class="service-back" type="button" data-back-services>← Cambiar servicio</button>
      <p class="service-card-origin">${escapeText(service.origin)}</p>
      <h3>${escapeText(service.shortTitle)}</h3>
      <p>${escapeText(service.description)}</p>
    </div>
    <form class="service-form" id="quoteForm-${escapeText(service.id)}" novalidate>
      <div class="service-form-grid">
        <div class="service-field"><label for="field-${service.id}-nombre">Nombre completo <span aria-hidden="true">*</span></label><input id="field-${service.id}-nombre" name="nombre" required maxlength="180" autocomplete="name" placeholder="Tu nombre completo"></div>
        <div class="service-field"><label for="field-${service.id}-whatsapp">WhatsApp <span aria-hidden="true">*</span></label><input id="field-${service.id}-whatsapp" name="whatsapp" type="tel" required maxlength="20" autocomplete="tel" inputmode="tel" placeholder="+591 70000000" pattern="[+0-9() -]{7,20}"></div>
        <div class="service-field service-field-wide"><label for="field-${service.id}-email">Correo electrónico (opcional)</label><input id="field-${service.id}-email" name="email" type="email" autocomplete="email" placeholder="tu@correo.com"></div>
        ${fields}
      </div>
      ${computedLabels}
      <div class="service-estimate" data-estimate role="status" aria-live="polite">Cotización por confirmar con un asesor.</div>
      <button class="button button-orange service-submit" type="submit">PREPARAR SOLICITUD POR WHATSAPP <span aria-hidden="true">➜</span></button>
      <div class="service-submit-result" data-submit-result role="status" aria-live="polite" hidden></div>
    </form>`;

  panel.hidden = false;
  optionsRoot.hidden = true;
  formRoot.querySelector("[data-back-services]").addEventListener("click", showServiceOptions);
  const form = formRoot.querySelector("form");
  form.addEventListener("input", () => updateEstimate(service, form));
  form.addEventListener("change", () => updateEstimate(service, form));
  form.addEventListener("submit", (event) => submitQuote(event, service, form));
  updateEstimate(service, form);
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
  form.querySelector("input[name=nombre]").focus({ preventScroll: true });
}

function showServiceForm(serviceId) {
  const service = SERVICES.find((item) => item.id === serviceId);
  if (service) renderForm(service);
}

function showServiceOptions() {
  panel.hidden = true;
  optionsRoot.hidden = false;
  optionsRoot.scrollIntoView({ behavior: "smooth", block: "start" });
}

function numeric(form, fieldName) {
  const input = form.elements.namedItem(fieldName);
  const value = Number(input?.value);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function metricsFor(form) {
  const boxCount = numeric(form, "cantidadCajas") || numeric(form, "cantidadBultos");
  const containerCount = numeric(form, "cantidadContenedores");
  let weightKg = numeric(form, "pesoTotalKg");
  if (!weightKg && numeric(form, "pesoCajaKg") && numeric(form, "cantidadCajas")) {
    weightKg = numeric(form, "pesoCajaKg") * numeric(form, "cantidadCajas");
  }
  let cbm = numeric(form, "cbm");
  const length = numeric(form, "largoCm");
  const width = numeric(form, "anchoCm");
  const height = numeric(form, "altoCm");
  if (!cbm && length && width && height) {
    cbm = length * width * height / 1_000_000 * (boxCount || 1);
  }
  return { kg: weightKg, cbm, cajas: boxCount, contenedores: containerCount };
}

function tariffVariables(tariff, metrics) {
  return {
    base: Number(tariff.baseBOB) || 0,
    kg: metrics.kg,
    cbm: metrics.cbm,
    cajas: metrics.cajas,
    contenedores: metrics.contenedores,
    tarifaKg: Number(tariff.tarifaKg) || 0,
    tarifaCbm: Number(tariff.tarifaCbm) || 0,
    tarifaCaja: Number(tariff.tarifaCaja) || 0,
    tarifaContenedor: Number(tariff.tarifaContenedor) || 0,
    margen: Number(tariff.margen) || 0
  };
}

function formatBolivianos(value) {
  return `Bs ${Number(value).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function updateEstimate(service, form) {
  const metrics = metricsFor(form);
  const weightOutput = form.querySelector("[data-computed-weight]");
  const cbmOutput = form.querySelector("[data-computed-cbm]");
  const computedSummary = form.querySelector("[data-computed-summary]");
  if (weightOutput) weightOutput.textContent = metrics.kg ? `${metrics.kg.toLocaleString("es-BO", { maximumFractionDigits: 2 })} kg` : "Se calcula automáticamente";
  if (cbmOutput) cbmOutput.textContent = metrics.cbm ? `${metrics.cbm.toLocaleString("es-BO", { maximumFractionDigits: 3 })} m³ (CBM)` : "Se calcula automáticamente";
  if (computedSummary) computedSummary.hidden = !metrics.kg && !metrics.cbm;

  const estimate = form.querySelector("[data-estimate]");
  const tariff = { ...DEFAULT_TARIFF, ...(tariffs[service.id] || {}) };
  if (!tariff.enabled) {
    estimate.textContent = "Cotización por confirmar con un asesor.";
    estimate.dataset.amount = "";
    return;
  }
  try {
    const amount = evaluateFormula(tariff.formula, tariffVariables(tariff, metrics));
    if (amount < 0) throw new Error("La fórmula produjo un monto negativo.");
    estimate.textContent = `Estimación referencial: ${formatBolivianos(amount)}. El monto final se confirma al revisar los datos de la carga.`;
    estimate.dataset.amount = String(amount);
  } catch {
    estimate.textContent = "Tarifa pendiente de revisión por el administrador.";
    estimate.dataset.amount = "";
  }
}

function currentFormValues(service, form) {
  const fields = new FormData(form);
  const values = [];
  for (const [name, value] of fields.entries()) {
    const field = service.fields.find((item) => item.name === name);
    const label = name === "nombre" ? "Nombre completo"
      : name === "whatsapp" ? "WhatsApp"
        : name === "email" ? "Correo electrónico"
          : field?.label || name;
    const stringValue = String(value).trim();
    if (stringValue) values.push(`${label}: ${stringValue}`);
  }
  return values;
}

function quoteRecipient() {
  return String(APP_CONFIG.whatsappContactPhone2 || "").replace(/\D/g, "");
}

function whatsappLink(phone, message) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function showQuoteWhatsApp(result, message, noteText, configuredRecipient = quoteRecipient()) {
  result.replaceChildren();
  result.classList.remove("is-error");
  const note = document.createElement("p");
  note.textContent = noteText || "La cotización está lista. Abre WhatsApp y confirma el envío.";
  result.append(note);
  if (configuredRecipient) {
    const link = document.createElement("a");
    link.className = "button button-orange service-whatsapp-link";
    link.href = whatsappLink(configuredRecipient, message);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "ABRIR WHATSAPP →";
    result.append(link);
  }
  if (!configuredRecipient) {
    const warning = document.createElement("small");
    warning.textContent = "Completa WHATSAPP_CONTACT_PHONE_2 en .env y vuelve a generar la configuración pública.";
    result.append(warning);
    result.classList.add("is-error");
  } else {
    const limitation = document.createElement("small");
    limitation.textContent = "El mensaje ya está rellenado; confirma Enviar en WhatsApp.";
    result.append(limitation);
    result.classList.add("is-success");
  }
}

function submitQuote(event, service, form) {
  event.preventDefault();
  const result = form.querySelector("[data-submit-result]");
  result.hidden = false;
  result.replaceChildren();
  if (!form.reportValidity()) return;
  const metrics = metricsFor(form);
  const estimate = form.querySelector("[data-estimate]");
  const amount = Number(estimate.dataset.amount);
  const messageLines = [
    `SOLICITUD DE COTIZACIÓN · ${service.shortTitle}`,
    `Ruta / servicio: ${service.origin}`,
    ...currentFormValues(service, form)
  ];
  if (metrics.kg) messageLines.push(`Peso total calculado: ${metrics.kg.toLocaleString("es-BO")} kg`);
  if (metrics.cbm) messageLines.push(`Volumen calculado: ${metrics.cbm.toLocaleString("es-BO", { maximumFractionDigits: 3 })} m³ (CBM)`);
  if (Number.isFinite(amount) && amount >= 0 && estimate.dataset.amount) {
    messageLines.push(`Estimación referencial: ${formatBolivianos(amount)}`);
    messageLines.push("Monto sujeto a revisión y confirmación de CF Global Cargo.");
  } else {
    messageLines.push("Cotización: pendiente de revisión por el equipo.");
  }
  const message = messageLines.join("\n");
  showQuoteWhatsApp(result, message);
  result.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

optionsRoot.append(...SERVICES.map(makeOptionCard));

try {
  const configSnapshot = await getDoc(doc(db, "configuracion", "cotizaciones"));
  if (configSnapshot.exists()) tariffs = configSnapshot.data().tarifas || {};
} catch (error) {
  console.error("No se pudieron cargar las tarifas de cotización:", error);
}
