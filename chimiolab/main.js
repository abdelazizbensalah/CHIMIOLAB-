import QRCode from 'qrcode';
window.QRCode = QRCode;

const body = document.body;

function setBodyLock() {
  const menuOpen = document.querySelector("[data-mobile-menu]")?.classList.contains("is-open");
  const modalOpen = document.querySelector("[data-qr-modal]")?.classList.contains("is-open");
  body.classList.toggle("menu-open", Boolean(menuOpen));
  body.classList.toggle("modal-open", Boolean(modalOpen));
}

function initNav() {
  const currentPage = body.dataset.page || "index";
  const navLinks = document.querySelectorAll("[data-nav-link]");

  navLinks.forEach((link) => {
    if (link.dataset.navLink === currentPage) {
      link.classList.add("is-active");
    }
  });

  const menu = document.querySelector("[data-mobile-menu]");
  const toggle = document.querySelector("[data-menu-toggle]");

  if (!menu || !toggle) return;

  const setMenu = (open) => {
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    setBodyLock();
  };

  toggle.addEventListener("click", () => {
    setMenu(!menu.classList.contains("is-open"));
  });

  menu.querySelectorAll("[data-menu-close]").forEach((button) => {
    button.addEventListener("click", () => setMenu(false));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  items.forEach((item) => observer.observe(item));
}

function syncFilterChips(chips, activeValue, key) {
  chips.forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset[key] === activeValue);
  });
}

// ─── Reactifs Page ────────────────────────────────────────────────────

function initReactifsPage() {
  const grid = document.getElementById("products-grid");
  if (!grid) return;

  // If ChimioLab is available (supabase-public.js loaded), fetch live data
  if (window.ChimioLab) {
    window.ChimioLab.loadProducts("products-grid").then(() => {
      bindReactifInteractivity();
    });
  }
}

function bindReactifInteractivity() {
  const cards = [...document.querySelectorAll("[data-product-card]")];
  if (!cards.length) return;

  const chips = [...document.querySelectorAll("[data-reactif-filter]")];
  const search = document.querySelector("[data-reactif-search]");
  const empty = document.querySelector("[data-reactif-empty]");

  let activeFilter = "all";

  const applyFilters = () => {
    const query = (search?.value || "").trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const matchesQuery = (card.dataset.search || "").includes(query);
      const risk = card.dataset.risk || "low";
      const expiry = card.dataset.expiry || "good";

      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "expiring" && ["near", "critical"].includes(expiry)) ||
        risk === activeFilter;

      const visible = matchesQuery && matchesFilter;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (empty) {
      empty.classList.toggle("is-visible", visibleCount === 0);
    }
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeFilter = chip.dataset.reactifFilter || "all";
      syncFilterChips(chips, activeFilter, "reactifFilter");
      applyFilters();
    });
  });

  search?.addEventListener("input", applyFilters);

  // QR Modal
  const modal = document.querySelector("[data-qr-modal]");
  if (modal) {
    const title = modal.querySelector("[data-qr-name]");
    const formula = modal.querySelector("[data-qr-formula]");
    const location = modal.querySelector("[data-qr-location]");
    const placeholder = modal.querySelector("[data-qr-placeholder]");
    const download = modal.querySelector("[data-qr-download]");

    const setModal = (open) => {
      modal.classList.toggle("is-open", open);
      setBodyLock();
    };

    const updateModal = (button) => {
      const name = button.dataset.productName || "Produit";
      const productFormula = button.dataset.productFormula || "";
      const productLocation = button.dataset.productLocation || "Non renseignée";
      const productId = button.dataset.productId || "000";
      const appOrigin = (window.ChimioLab && window.ChimioLab.APP_ORIGIN) || window.CHIMIOLAB_APP_ORIGIN || 'http://localhost:5173';
      const productUrl = `${appOrigin}/product/public/${productId}`;

      if (title) title.textContent = name;
      if (formula) formula.textContent = productFormula || "Formule non renseignée";
      if (location) location.textContent = productLocation;

      if (placeholder) {
        placeholder.innerHTML = '<canvas id="qr-modal-canvas"></canvas>';
        const canvas = document.getElementById("qr-modal-canvas");
        if (canvas && window.QRCode) {
          QRCode.toCanvas(canvas, productUrl, {
            width: 220,
            margin: 2,
            color: { dark: "#0d1b2a", light: "#ffffff" },
          }).catch(() => {});
        }
      }

      if (download) {
        download.onclick = () => {
          if (!window.QRCode) return;
          QRCode.toDataURL(productUrl, {
            width: 512,
            margin: 2,
            color: { dark: "#0d1b2a", light: "#ffffff" },
          }).then((dataUrl) => {
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `qr-${name.replace(/\s+/g, "-").toLowerCase()}.png`;
            link.click();
          }).catch(() => {});
        };
      }
    };

    // Bind QR buttons (using event delegation since cards are dynamic)
    document.addEventListener("click", (e) => {
      const qrButton = e.target.closest("[data-qr-open]");
      if (qrButton) {
        updateModal(qrButton);
        setModal(true);
      }
    });

    modal.querySelectorAll("[data-modal-close]").forEach((button) => {
      button.addEventListener("click", () => setModal(false));
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelector("[data-qr-modal]")?.classList.remove("is-open");
      setBodyLock();
    }
  });

  applyFilters();
}

// ─── Matériels Page ───────────────────────────────────────────────────

function initMaterielsPage() {
  const grid = document.getElementById("materials-grid");
  if (!grid) return;

  if (window.ChimioLab) {
    window.ChimioLab.loadMaterials("materials-grid").then(() => {
      bindMaterialInteractivity();
    });
  }
}

function bindMaterialInteractivity() {
  const cards = [...document.querySelectorAll("[data-material-card]")];
  if (!cards.length) return;

  const chips = [...document.querySelectorAll("[data-material-filter]")];
  const search = document.querySelector("[data-material-search]");
  const empty = document.querySelector("[data-material-empty]");
  let activeFilter = "all";

  const applyFilters = () => {
    const query = (search?.value || "").trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const matchesQuery = (card.dataset.search || "").includes(query);
      const category = card.dataset.category || "";
      const visible = matchesQuery && (activeFilter === "all" || category === activeFilter);
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (empty) {
      empty.classList.toggle("is-visible", visibleCount === 0);
    }
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeFilter = chip.dataset.materialFilter || "all";
      syncFilterChips(chips, activeFilter, "materialFilter");
      applyFilters();
    });
  });

  search?.addEventListener("input", applyFilters);
  applyFilters();
}

// ─── TP Sessions Page ─────────────────────────────────────────────────

function initTpPage() {
  const list = document.getElementById("sessions-list");
  if (!list) return;

  if (window.ChimioLab) {
    window.ChimioLab.loadSessions("sessions-list").then(() => {
      bindSessionInteractivity();
    });
  }
}

function bindSessionInteractivity() {
  const cards = [...document.querySelectorAll("[data-session-card]")];
  if (!cards.length) return;

  const chips = [...document.querySelectorAll("[data-session-filter]")];
  const empty = document.querySelector("[data-session-empty]");
  let activeFilter = "all";

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeFilter = chip.dataset.sessionFilter || "all";
      syncFilterChips(chips, activeFilter, "sessionFilter");

      let visibleCount = 0;
      cards.forEach((card) => {
        const visible = activeFilter === "all" || card.dataset.status === activeFilter;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      if (empty) {
        empty.classList.toggle("is-visible", visibleCount === 0);
      }
    });
  });

  // Accordion toggles
  cards.forEach((card) => {
    const toggle = card.querySelector("[data-accordion-toggle]");
    const panel = card.querySelector("[data-accordion-panel]");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
      const isOpen = card.classList.toggle("is-open");
      panel.style.maxHeight = isOpen ? `${panel.scrollHeight}px` : "0px";
    });
  });
}

// ─── Init ─────────────────────────────────────────────────────────────

initNav();
initReveal();
initReactifsPage();
initMaterielsPage();
initTpPage();
