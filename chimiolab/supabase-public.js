// ─── Supabase Public Client ──────────────────────────────────────────
// Shared module for the public chimiolab/ pages.
// Fetches live data from Supabase so the public site always reflects
// what has been added/edited/deleted in the back office.
// ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://gpeqxrthnrnllpafchwe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZXF4cnRobnJubGxwYWZjaHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzA1ODAsImV4cCI6MjA4NzkwNjU4MH0.U0PlTG_uh6j7twteZ76WuKWfcOj8jnLhqme0Ei0Z3bU';

// Base URL of the React app that serves /product/public/:id.
// Override at runtime by setting `window.CHIMIOLAB_APP_ORIGIN` before this script loads
// (e.g. to your machine's LAN IP so the QR works when scanned from a phone).
const APP_ORIGIN = (typeof window !== 'undefined' && window.CHIMIOLAB_APP_ORIGIN)
    || 'http://localhost:5173';

let _supabase = null;

/**
 * Get or create the Supabase client singleton.
 * Uses the global `supabase` object injected by the CDN script.
 */
function getClient() {
    if (_supabase) return _supabase;
    if (typeof supabase === 'undefined' || !supabase.createClient) {
        console.error('[ChimioLab] Supabase CDN not loaded. Add the script tag before this module.');
        return null;
    }
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _supabase;
}

// ─── Pictogram helpers ───────────────────────────────────────────────

const GHS_LABELS = {
    explosive: '💥 Explosif',
    flammable: '🔥 Inflammable',
    oxidizing: '⚗️ Comburant',
    compressed_gas: '🫧 Gaz',
    corrosive: '🧪 Corrosif',
    toxic: '☠️ Toxique',
    harmful: '❗ Irritant',
    environmental_hazard: '🌿 Environnement',
    health_hazard: '⚕️ Santé',
};

function riskLevel(pictograms) {
    if (!pictograms || !pictograms.length) return 'low';
    const highRisk = ['toxic', 'corrosive', 'explosive'];
    const mediumRisk = ['flammable', 'oxidizing', 'health_hazard', 'harmful'];
    if (pictograms.some(p => highRisk.includes(p))) return 'high';
    if (pictograms.some(p => mediumRisk.includes(p))) return 'medium';
    return 'low';
}

function riskLabel(level) {
    if (level === 'high') return 'DANGER';
    if (level === 'medium') return 'ATTENTION';
    return 'OK';
}

function expiryStatus(expiryDate) {
    if (!expiryDate) return 'good';
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);
    if (daysLeft <= 0) return 'critical';
    if (daysLeft <= 60) return 'near';
    return 'good';
}

// ─── Category icon helpers ───────────────────────────────────────────

const CATEGORY_ICONS = {
    verrerie: '🧪',
    mesure: '📏',
    securite: '🛡️',
    electricite: '⚡',
    chauffage: '🔥',
};

const CATEGORY_LABELS = {
    verrerie: 'Verrerie',
    mesure: 'Mesure',
    securite: 'Sécurité',
    electricite: 'Électricité',
    chauffage: 'Chauffage',
};

const CONDITION_MAP = {
    good: { class: 'state-good', label: 'Bon état' },
    maintenance: { class: 'state-maintenance', label: 'À entretenir' },
    out_of_service: { class: 'state-broken', label: 'Hors service' },
};

const STATUS_MAP = {
    planned: { dot: 'status-planned', label: 'Planifié' },
    done: { dot: 'status-done', label: 'Terminé' },
};

// ─── Fetch functions ─────────────────────────────────────────────────

/**
 * Fetch all products with their safety sheets.
 * Returns an array of products, each with a `safety` property.
 */
async function fetchProducts() {
    const db = getClient();
    if (!db) return [];

    const [productsRes, safetyRes] = await Promise.all([
        db.from('products').select('*').order('name'),
        db.from('safety_sheets').select('*'),
    ]);

    if (productsRes.error) {
        console.error('[ChimioLab] Error fetching products:', productsRes.error);
        return [];
    }

    const safetyMap = new Map();
    (safetyRes.data || []).forEach(sheet => {
        safetyMap.set(sheet.product_id, sheet);
    });

    return (productsRes.data || []).map(product => ({
        ...product,
        safety: safetyMap.get(product.id) || null,
    }));
}

/**
 * Fetch all materials.
 */
async function fetchMaterials() {
    const db = getClient();
    if (!db) return [];

    const { data, error } = await db
        .from('materials')
        .select('*')
        .order('category, name');

    if (error) {
        console.error('[ChimioLab] Error fetching materials:', error);
        return [];
    }
    return data || [];
}

/**
 * Fetch all TP sessions with related reactifs and materials.
 * Joins tp_reactifs → products and tp_materials → materials.
 */
async function fetchTPSessions() {
    const db = getClient();
    if (!db) return [];

    const [sessionsRes, reactifsRes, materialsRes] = await Promise.all([
        db.from('tp_sessions').select('*').order('date', { ascending: false }),
        db.from('tp_reactifs').select(`
            id, tp_session_id, planned_quantity, unit,
            products:product_id ( id, name, chemical_formula )
        `),
        db.from('tp_materials').select(`
            id, tp_session_id, required_quantity,
            materials:material_id ( id, name )
        `),
    ]);

    if (sessionsRes.error) {
        console.error('[ChimioLab] Error fetching sessions:', sessionsRes.error);
        return [];
    }

    const reactifsMap = new Map();
    (reactifsRes.data || []).forEach(r => {
        const sessionId = r.tp_session_id;
        if (!reactifsMap.has(sessionId)) reactifsMap.set(sessionId, []);
        const product = Array.isArray(r.products) ? r.products[0] : r.products;
        reactifsMap.get(sessionId).push({
            name: product?.name || 'Produit',
            formula: product?.chemical_formula || '',
            quantity: r.planned_quantity,
            unit: r.unit,
        });
    });

    const materialsMap = new Map();
    (materialsRes.data || []).forEach(m => {
        const sessionId = m.tp_session_id;
        if (!materialsMap.has(sessionId)) materialsMap.set(sessionId, []);
        const mat = Array.isArray(m.materials) ? m.materials[0] : m.materials;
        materialsMap.get(sessionId).push({
            name: mat?.name || 'Matériel',
            quantity: m.required_quantity,
        });
    });

    return (sessionsRes.data || []).map(session => ({
        ...session,
        reactifs: reactifsMap.get(session.id) || [],
        materials: materialsMap.get(session.id) || [],
    }));
}

// ─── HTML Renderers ──────────────────────────────────────────────────

function renderProductCard(product) {
    const safety = product.safety;
    const pictograms = safety?.pictograms || [];
    const risk = riskLevel(pictograms);
    const expiry = expiryStatus(product.expiry_date);
    const searchText = [
        product.chemical_formula,
        product.name,
        product.cas_number,
        ...pictograms.map(p => GHS_LABELS[p] || p),
    ].filter(Boolean).join(' ').toLowerCase();

    const ghsTags = pictograms.length > 0
        ? pictograms.map(p => `<span class="ghs-tag">${GHS_LABELS[p] || p}</span>`).join('')
        : '<span class="ghs-tag">✅ Faible risque</span>';

    const stockWarning = product.quantity <= product.min_quantity_alert
        ? ` · ⚠️ Stock faible`
        : '';

    return `
        <article class="inventory-card reveal is-visible"
            data-product-card
            data-risk="${risk}"
            data-expiry="${expiry}"
            data-search="${searchText}">
            <div class="expiry-line expiry-${expiry}"></div>
            <div class="inventory-body">
                <div class="inventory-top">
                    <div>
                        <div class="formula">${product.chemical_formula || ''}</div>
                        <h2 class="inventory-name">${product.name}</h2>
                        ${product.cas_number ? `<div class="cas">CAS ${product.cas_number}</div>` : ''}
                    </div>
                    <span class="risk-badge risk-${risk}">${riskLabel(risk)}</span>
                </div>
                <div class="ghs-tags">${ghsTags}</div>
            </div>
            <div class="inventory-footer">
                <div class="stock-meta">
                    <span class="stock-qty">${product.quantity} ${product.unit}</span>
                    <span class="stock-note">Localisation : ${product.location || 'Non définie'}${stockWarning}</span>
                </div>
                <div class="qr-inline-wrap">
                    <canvas class="qr-inline-canvas"
                        data-qr-canvas
                        data-qr-url="${APP_ORIGIN}/product/public/${product.id}"
                        data-product-id="${product.id}"
                        data-product-name="${product.name}"
                        data-product-formula="${product.chemical_formula || ''}"
                        data-product-location="${product.location || ''}"
                        width="72" height="72"
                        title="Scanner pour accéder à la fiche produit"
                        data-qr-open></canvas>
                    <span class="qr-inline-label">QR Code</span>
                </div>
            </div>
        </article>
    `;
}

function renderMaterialCard(material) {
    const icon = material.icon || CATEGORY_ICONS[material.category] || '🔬';
    const categoryLabel = CATEGORY_LABELS[material.category] || material.category;
    const condition = CONDITION_MAP[material.condition_status] || CONDITION_MAP.good;
    const unitLabel = material.quantity_unit || '';
    const searchText = [material.name, material.category, material.description].filter(Boolean).join(' ').toLowerCase();

    return `
        <article class="material-card reveal is-visible"
            data-material-card
            data-category="${material.category}"
            data-search="${searchText}">
            <div class="material-top">
                <span class="material-icon">${icon}</span>
                <div>
                    <span class="category-kicker">${categoryLabel}</span>
                    <h3>${material.name}</h3>
                </div>
            </div>
            <p>${material.description || ''}</p>
            <div class="material-footer">
                <span class="quantity-badge">Qté ${material.quantity}${unitLabel ? ' ' + unitLabel : ''}</span>
                <span class="state-pill ${condition.class}">${condition.label}</span>
            </div>
        </article>
    `;
}

function renderSessionCard(session, index) {
    const status = STATUS_MAP[session.status] || STATUS_MAP.planned;
    const dateStr = new Date(session.date).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    const durationStr = session.duration_minutes >= 60
        ? `${Math.floor(session.duration_minutes / 60)}h${String(session.duration_minutes % 60).padStart(2, '0')}`
        : `${session.duration_minutes}min`;

    const reactifsRows = session.reactifs.length > 0
        ? session.reactifs.map(r => `<tr><td>${r.name}</td><td>${r.quantity} ${r.unit}</td></tr>`).join('')
        : '<tr><td colspan="2" style="color:var(--gray)">Aucun réactif assigné</td></tr>';

    const materialsList = session.materials.length > 0
        ? session.materials.map(m => `<li>${m.name}${m.quantity > 1 ? ' ×' + m.quantity : ''}</li>`).join('')
        : '<li style="color:var(--gray)">Aucun matériel assigné</li>';

    return `
        <article class="session-card reveal is-visible" data-session-card data-status="${session.status}">
            <div class="session-summary">
                <div>
                    <span class="code-pill">${session.code || 'TP-' + String(index + 1).padStart(3, '0')}</span>
                    <h2 class="session-title">${session.title}</h2>
                    <div class="session-meta">
                        <span>📅 ${dateStr}</span>
                        <span>⏱️ ${durationStr}</span>
                        <span>🎓 ${session.level}</span>
                        <span>👥 ${session.student_count} élève(s)</span>
                    </div>
                </div>
                <div class="session-side">
                    <span class="status-pill"><span class="status-dot ${status.dot}"></span>${status.label}</span>
                    <button class="accordion-toggle" type="button" data-accordion-toggle aria-label="Développer la session">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="session-panel" data-accordion-panel>
                <div class="session-panel-inner">
                    ${session.objectives ? `
                    <div class="session-info-bar">
                        <span><strong>Objectif :</strong> ${session.objectives}</span>
                        <span><strong>Niveau :</strong> ${session.level}</span>
                        <span><strong>Durée :</strong> ${durationStr}</span>
                    </div>` : ''}
                    <div class="session-body">
                        <div class="session-box">
                            <h3>⚗️ Réactifs utilisés</h3>
                            <table class="session-table">${reactifsRows}</table>
                        </div>
                        <div class="session-box">
                            <h3>🔬 Matériel nécessaire</h3>
                            <ul class="bullet-list">${materialsList}</ul>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    `;
}

// ─── Page Loaders ────────────────────────────────────────────────────

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--gray);">
                <div style="font-size: 2rem; margin-bottom: 12px;">⏳</div>
                <p style="font-size: 1.1rem; font-weight: 600;">Chargement des données...</p>
            </div>
        `;
    }
}

function showEmpty(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--gray);">
                <div style="font-size: 2rem; margin-bottom: 12px;">📭</div>
                <p style="font-size: 1.1rem; font-weight: 600;">${message}</p>
            </div>
        `;
    }
}

/**
 * Load products into the page grid.
 * Call this on DOMContentLoaded for reactifs.html.
 */
async function loadProducts(containerId) {
    showLoading(containerId);
    const products = await fetchProducts();
    const container = document.getElementById(containerId);
    if (!container) return;

    if (products.length === 0) {
        showEmpty(containerId, 'Aucun produit enregistré pour le moment.');
        return;
    }

    container.innerHTML = products.map(p => renderProductCard(p)).join('');

    // Generate real QR codes on each canvas
    if (window.QRCode) {
        container.querySelectorAll('[data-qr-canvas]').forEach(canvas => {
            const url = canvas.dataset.qrUrl;
            if (url) {
                QRCode.toCanvas(canvas, url, { width: 72, margin: 1, color: { dark: '#0d1b2a', light: '#ffffff' } })
                    .catch(() => {});
            }
        });
    }
}

/**
 * Load materials into the page grid.
 */
async function loadMaterials(containerId) {
    showLoading(containerId);
    const materials = await fetchMaterials();
    const container = document.getElementById(containerId);
    if (!container) return;

    if (materials.length === 0) {
        showEmpty(containerId, 'Aucun matériel enregistré pour le moment.');
        return;
    }

    container.innerHTML = materials.map(m => renderMaterialCard(m)).join('');
}

/**
 * Load TP sessions into the page list.
 */
async function loadSessions(containerId) {
    showLoading(containerId);
    const sessions = await fetchTPSessions();
    const container = document.getElementById(containerId);
    if (!container) return;

    if (sessions.length === 0) {
        showEmpty(containerId, 'Aucune séance TP enregistrée pour le moment.');
        return;
    }

    container.innerHTML = sessions.map((s, i) => renderSessionCard(s, i)).join('');
}

// Export everything for use in inline scripts.
window.ChimioLab = {
    fetchProducts,
    fetchMaterials,
    fetchTPSessions,
    loadProducts,
    loadMaterials,
    loadSessions,
    APP_ORIGIN,
};
