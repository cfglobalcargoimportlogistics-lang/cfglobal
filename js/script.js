const menuToggle = document.querySelector("#menuToggle");
const utilityMenu = document.querySelector("#utilityMenu");

if (menuToggle && utilityMenu) {
  const setMenuOpen = (open) => {
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Cerrar menú de opciones" : "Abrir menú de opciones");
    utilityMenu.hidden = !open;
  };

  menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  utilityMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (!menuToggle.contains(event.target) && !utilityMenu.contains(event.target)) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });
}
const originDetails = {
  CHINA: {
    name: "China",
    route: "CHINA → BOLIVIA",
    subtitle: "Soluciones logísticas integrales desde China.",
    quoteLabel: "COTIZAR DESDE CHINA",
    services: [
      "Consolidación de mercancías de diferentes proveedores.",
      "Embarques de contenedores completos (FCL) y carga consolidada (LCL).",
      "Verificación de proveedores y coordinación de recogida de mercancías.",
      "Recepción y consolidación en almacén en Yiwu, China.",
      "Gestión y revisión de facturas, listas de empaque y documentos de exportación.",
      "Coordinación logística para el transporte internacional hacia Bolivia."
    ]
  },
  "ESTADOS UNIDOS": {
    name: "Estados Unidos",
    route: "ESTADOS UNIDOS → BOLIVIA",
    subtitle: "Opciones de compra, recepción y envío desde Estados Unidos.",
    quoteLabel: "COTIZAR DESDE EE. UU.",
    services: [
      "Compras en Amazon, eBay y otros proveedores.",
      "Recepción y manejo de paquetes de diferentes tiendas.",
      "Envíos de carga aérea y asesoramiento para la importación.",
      "Evaluación de peso, volumen y costos de transporte.",
      "Coordinación de transporte y documentación para Bolivia."
    ]
  },
  EUROPA: {
    name: "Europa",
    route: "EUROPA → BOLIVIA",
    subtitle: "Alternativas de abastecimiento y transporte desde Europa.",
    quoteLabel: "COTIZAR DESDE EUROPA",
    services: [
      "Gestión de embarques y productos de retorno.",
      "Coordinación para repuestos de camiones y tractocamiones.",
      "Coordinación de compras y recogida con proveedores.",
      "Gestión y revisión de documentación comercial.",
      "Coordinación logística internacional hasta Bolivia."
    ]
  },
  "CHILE - ZOFRI": {
    name: "Zofri Iquique",
    route: "ZOFRI IQUIQUE → BOLIVIA",
    subtitle: "Coordinación de carga desde Iquique hacia Bolivia.",
    quoteLabel: "COTIZAR DESDE ZOFRI",
    services: [
      "Gestión de mercancías nuevas y de retorno.",
      "Recepción de carga por caja, pallet o saco.",
      "Consolidación de mercancías de diferentes proveedores.",
      "Coordinación de transporte desde Iquique hacia Bolivia.",
      "Evaluación de volumen, peso y características de la carga.",
      "Asesoramiento logístico y cotización."
    ]
  },
  "OTROS ORÍGENES": {
    name: "otros orígenes",
    route: "OTROS ORÍGENES → BOLIVIA",
    subtitle: "Evaluamos la ruta según tu producto y destino.",
    quoteLabel: "CONSULTAR MI ENVÍO",
    services: [
      "Evaluación de alternativas logísticas.",
      "Opciones de transporte marítimo, aéreo o terrestre.",
      "Búsqueda de puertos y rutas disponibles.",
      "Coordinación con proveedores y agentes.",
      "Evaluación de mercancía, peso y volumen.",
      "Cotizaciones según las necesidades de tu operación."
    ]
  }
};

const originDialog = document.querySelector("#originDialog");

if (originDialog) {
  const dialogTitle = document.querySelector("#originDialogTitle");
  const dialogSubtitle = document.querySelector("#originDialogSubtitle");
  const dialogFlag = document.querySelector("#originDialogFlag");
  const dialogImage = originDialog.querySelector(".origin-dialog-image");
  const serviceList = document.querySelector("#originServiceList");
  const quoteLabel = document.querySelector("#originQuoteLabel");

  document.querySelectorAll(".origin-card").forEach((card) => {
    const cardName = card.querySelector("h3")?.textContent.trim().replace(/\s+/g, " ");
    const details = originDetails[cardName];
    if (!details) return;

    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Ver servicios y cotizar desde ${details.name}`);
    card.setAttribute("aria-haspopup", "dialog");

    const openOriginDialog = () => {
      dialogTitle.textContent = details.route;
      dialogSubtitle.textContent = details.subtitle;
      quoteLabel.textContent = details.quoteLabel;

      const flagIcon = card.querySelector(".flag svg");
      dialogFlag.replaceChildren(flagIcon.cloneNode(true));
      dialogImage.setAttribute("aria-label", `Imagen ilustrativa de carga internacional para la ruta ${details.route}`);

      serviceList.replaceChildren(...details.services.map((service) => {
        const item = document.createElement("li");
        item.textContent = service;
        return item;
      }));

      if (!originDialog.open) originDialog.showModal();
    };

    card.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) return;
      openOriginDialog();
    });
    card.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
        event.preventDefault();
        openOriginDialog();
      }
    });
  });

  document.querySelector("#originDialogClose").addEventListener("click", () => originDialog.close());
  originDialog.addEventListener("click", (event) => {
    if (event.target === originDialog) originDialog.close();
  });
  originDialog.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => originDialog.close());
  });
}

const publicConfig = window.APP_CONFIG || {};
const currentYear = document.querySelector("[data-current-year]");
if (currentYear) currentYear.textContent = String(new Date().getFullYear());

const contactRow = document.querySelector('[data-contact-row="2"]');
const contactPhone = String(publicConfig.whatsappContactPhone2 || "").trim();
const contactPhoneOutput = contactRow?.querySelector("[data-contact-phone]");
if (contactRow && contactPhoneOutput && contactPhone) {
  contactPhoneOutput.textContent = contactPhone;
  contactRow.hidden = false;
}
const footerContacts = document.querySelector("[data-footer-contacts]");
if (footerContacts) footerContacts.hidden = !contactPhone;

const socialUrls = {
  tiktok: publicConfig.socialTikTokUrl,
  facebook: publicConfig.socialFacebookUrl,
  instagram: publicConfig.socialInstagramUrl,
  whatsapp: publicConfig.socialWhatsAppUrl
};

function isSafeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

document.querySelectorAll("[data-social-key]").forEach((link) => {
  const url = socialUrls[link.dataset.socialKey];
  if (isSafeExternalUrl(url)) {
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.removeAttribute("aria-disabled");
  } else {
    link.setAttribute("aria-disabled", "true");
    link.addEventListener("click", (event) => event.preventDefault());
  }
});

const communityUrls = {
  china: publicConfig.whatsappGroupChinaUrl,
  chile: publicConfig.whatsappGroupChileUrl
};
document.querySelectorAll("[data-community-link]").forEach((link) => {
  const url = communityUrls[link.dataset.communityLink];
  if (isSafeExternalUrl(url)) {
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.removeAttribute("aria-disabled");
    link.closest(".community-card")?.querySelector(".community-pending")?.setAttribute("hidden", "");
  } else {
    link.addEventListener("click", (event) => event.preventDefault());
  }
});
