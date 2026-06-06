import { useCallback, useEffect, useMemo, useState } from 'react';
import chemLabImg from '../../assets/Chemistry Lab Equipment .jpg';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    CalendarDays,
    ChevronDown,
    Clock3,
    Download,
    ExternalLink,
    LayoutDashboard,
    Menu,
    QrCode,
    RefreshCcw,
    Search,
    Users,
    X,
} from 'lucide-react';
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Tooltip as ChartTooltip,
    type ChartData,
    type ChartOptions,
} from 'chart.js';
import QRCode from 'qrcode';
import { Bar as ChartBar } from 'react-chartjs-2';
import { cn } from '../../lib/utils';
import { formatPublicDate, getRiskLevel, type RiskLevel } from './public-utils';

const PRODUCTS_PER_PAGE = 12;

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

type GhsKey =
    | 'explosive'
    | 'flammable'
    | 'oxidizing'
    | 'compressed_gas'
    | 'corrosive'
    | 'toxic'
    | 'harmful'
    | 'environmental_hazard'
    | 'health_hazard';

type SessionStatus = 'planned' | 'in_progress' | 'done';

type ProductFilter = 'all' | 'high' | 'medium' | 'low' | 'expiring';

type SessionFilter = 'all' | SessionStatus;

interface ProductSafety {
    pictograms: GhsKey[];
    epiRequired: string[];
    storageRules: string;
    physicalProperties: Record<string, string | number>;
    pdfUrl: string;
    emergencyProcedures: {
        eyes: string[];
        skin: string[];
        inhalation: string[];
        fire: string[];
    };
}

interface PublicProduct {
    id: string;
    name: string;
    chemicalFormula: string;
    casNumber: string;
    quantity: number;
    unit: string;
    minQuantityAlert: number;
    expiryDate: string | null;
    location: string;
    supplier: string;
    qrCodeUrl: string;
    createdAt: string;
    safety: ProductSafety;
}

interface SessionReactif {
    productId: string;
    productName: string;
    plannedQuantity: number;
    unit: string;
}

interface PublicSession {
    id: string;
    code: string;
    title: string;
    date: string | null;
    durationMinutes: number;
    level: string;
    studentCount: number;
    status: SessionStatus;
    reactifs: SessionReactif[];
    equipment: string[];
    checklist: string[];
    quizCount: number;
    quizTitle: string;
}

interface DashboardUsage {
    productName: string;
    usageCount: number;
}

interface DashboardStats {
    totalProducts: number;
    expiredProducts: number;
    nearExpiryProducts: number;
    missingFds: number;
    topUsedProducts: DashboardUsage[];
}

interface PublicAlert {
    id: string;
    severity: 'red' | 'orange' | 'yellow';
    message: string;
    type: string;
    createdAt: string;
}

const GHS_DETAILS: Record<GhsKey, { title: string; description: string; symbol: string }> = {
    explosive: {
        title: 'Explosif',
        description: 'Matieres explosives',
        symbol: '💥',
    },
    flammable: {
        title: 'Inflammable',
        description: 'Liquides et solides inflammables',
        symbol: '🔥',
    },
    oxidizing: {
        title: 'Comburant',
        description: 'Substances oxydantes',
        symbol: '⚗️',
    },
    compressed_gas: {
        title: 'Gaz sous pression',
        description: 'Gaz comprimes',
        symbol: '🫧',
    },
    corrosive: {
        title: 'Corrosif',
        description: 'Attaque les metaux et la peau',
        symbol: '🧪',
    },
    toxic: {
        title: 'Toxique',
        description: 'Danger aigu mortel',
        symbol: '💀',
    },
    harmful: {
        title: 'Irritant',
        description: 'Irritant cutane et oculaire',
        symbol: '❗',
    },
    environmental_hazard: {
        title: 'Dangereux environnement',
        description: 'Toxique aquatique',
        symbol: '🌿',
    },
    health_hazard: {
        title: 'Danger sante',
        description: 'Cancerogene, mutagene',
        symbol: '🫁',
    },
};

const EPI_DETAILS: Record<string, { label: string; icon: string }> = {
    gloves: { label: 'Gants de protection', icon: '🧤' },
    safety_glasses: { label: 'Lunettes de protection', icon: '👓' },
    lab_coat: { label: 'Blouse de laboratoire', icon: '🥼' },
    fume_hood: { label: 'Utiliser sous hotte', icon: '💨' },
    respirator: { label: 'Masque respiratoire', icon: '😷' },
    face_shield: { label: 'Ecran facial', icon: '🛡️' },
};

const INCOMPATIBILITY_PAIRS = [
    ['Acides', 'Bases'],
    ['Oxydants', 'Inflammables'],
    ['Eau', 'Metaux alcalins'],
    ['Peroxydes', 'Composes organiques'],
];

const DEFAULT_EMERGENCY = {
    eyes: [
        'Rincer abondamment a l\'eau pendant 15 minutes',
        'Consulter un medecin immediatement',
    ],
    skin: [
        'Retirer les vetements contamines',
        'Laver la peau avec eau et savon',
    ],
    inhalation: [
        'Transporter la personne a l\'air frais',
        'Surveiller la respiration',
    ],
    fire: [
        'Utiliser CO2 ou poudre seche',
        'Isoler la zone et alerter rapidement',
    ],
};

function asObject(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null) return {};
    return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
    if (!Array.isArray(value)) return [];
    return value;
}

function toStringValue(value: unknown, fallback = ''): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => toStringValue(item).trim())
            .filter((item) => item.length > 0);
    }

    if (typeof value === 'string') {
        return value
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
}

function normalizeGhsKey(value: unknown): GhsKey | null {
    const raw = toStringValue(value).toLowerCase().trim();
    if (!raw) return null;

    const normalized = raw
        .replace(/\s+/g, '_')
        .replace(/-/g, '_')
        .replace(/é/g, 'e')
        .replace(/è/g, 'e')
        .replace(/à/g, 'a');

    const map: Record<string, GhsKey> = {
        explosive: 'explosive',
        flammable: 'flammable',
        inflammable: 'flammable',
        oxidizing: 'oxidizing',
        oxydant: 'oxidizing',
        compressed_gas: 'compressed_gas',
        gaz_sous_pression: 'compressed_gas',
        corrosive: 'corrosive',
        corrosif: 'corrosive',
        toxic: 'toxic',
        toxique: 'toxic',
        harmful: 'harmful',
        irritant: 'harmful',
        environmental_hazard: 'environmental_hazard',
        dangereux_environnement: 'environmental_hazard',
        health_hazard: 'health_hazard',
        danger_sante: 'health_hazard',
    };

    return map[normalized] || null;
}

function normalizePictograms(value: unknown): GhsKey[] {
    const rawList = asArray(value);
    const mapped = rawList
        .map((item) => normalizeGhsKey(item))
        .filter((item): item is GhsKey => Boolean(item));

    return [...new Set(mapped)];
}

function normalizeEmergency(value: unknown): ProductSafety['emergencyProcedures'] {
    const source = asObject(value);
    const eyes = toStringList(source.eyes || source.eye || source.contact_eyes);
    const skin = toStringList(source.skin || source.contact_skin);
    const inhalation = toStringList(source.inhalation || source.inhale);
    const fire = toStringList(source.fire || source.incendie);

    return {
        eyes: eyes.length > 0 ? eyes : DEFAULT_EMERGENCY.eyes,
        skin: skin.length > 0 ? skin : DEFAULT_EMERGENCY.skin,
        inhalation: inhalation.length > 0 ? inhalation : DEFAULT_EMERGENCY.inhalation,
        fire: fire.length > 0 ? fire : DEFAULT_EMERGENCY.fire,
    };
}

function normalizeProduct(rawValue: unknown): PublicProduct {
    const raw = asObject(rawValue);
    const safetyRaw = asObject(
        raw.safety ||
        raw.safety_sheet ||
        raw.safetySheet ||
        raw.safety_sheets ||
        raw.sheet
    );

    const pictograms = normalizePictograms(
        safetyRaw.pictograms || safetyRaw.ghs_pictograms || raw.pictograms
    );

    const epiRequired = toStringList(
        safetyRaw.epi_required || safetyRaw.epi || raw.epi_required
    );

    const storageRules = toStringValue(
        safetyRaw.storage_rules || safetyRaw.storageRules || raw.storage_rules
    );

    const physicalProperties = asObject(
        safetyRaw.physical_properties || safetyRaw.physicalProperties || raw.physical_properties
    ) as Record<string, string | number>;

    const emergencyProcedures = normalizeEmergency(
        safetyRaw.emergency_procedures || safetyRaw.emergency || raw.emergency
    );

    return {
        id: toStringValue(raw.id),
        name: toStringValue(raw.name, 'Produit sans nom'),
        chemicalFormula: toStringValue(raw.chemical_formula || raw.formula),
        casNumber: toStringValue(raw.cas_number || raw.cas),
        quantity: toNumberValue(raw.quantity),
        unit: toStringValue(raw.unit, 'g'),
        minQuantityAlert: toNumberValue(raw.min_quantity_alert || raw.min_quantity),
        expiryDate: toStringValue(raw.expiry_date || raw.expiration_date) || null,
        location: toStringValue(raw.location),
        supplier: toStringValue(raw.supplier),
        qrCodeUrl: toStringValue(raw.qr_code_url || raw.qrCodeUrl),
        createdAt: toStringValue(raw.created_at || raw.createdAt),
        safety: {
            pictograms,
            epiRequired,
            storageRules,
            physicalProperties,
            pdfUrl: toStringValue(safetyRaw.pdf_url || safetyRaw.pdfUrl || raw.pdf_url),
            emergencyProcedures,
        },
    };
}

function normalizeSessionStatus(value: unknown): SessionStatus {
    const raw = toStringValue(value).toLowerCase().trim();
    if (!raw) return 'planned';
    if (raw.includes('done') || raw.includes('termine')) return 'done';
    if (raw.includes('progress') || raw.includes('cours')) return 'in_progress';
    return 'planned';
}

function normalizeSession(rawValue: unknown, index: number): PublicSession {
    const raw = asObject(rawValue);

    const reactifSource = asArray(
        raw.reactifs || raw.reagents || raw.products || raw.tp_reactifs
    );

    const reactifs: SessionReactif[] = reactifSource.map((reactifRaw) => {
        const reactif = asObject(reactifRaw);
        const product = asObject(reactif.product || reactif.products);

        return {
            productId: toStringValue(reactif.product_id || product.id),
            productName: toStringValue(
                reactif.product_name || reactif.name || product.name,
                'Reactif'
            ),
            plannedQuantity: toNumberValue(
                reactif.planned_quantity || reactif.quantity || reactif.qty
            ),
            unit: toStringValue(reactif.unit || product.unit, 'g'),
        };
    });

    const equipment = toStringList(
        raw.equipment || raw.equipment_list || raw.materials || raw.material_list
    );

    const checklist = toStringList(raw.checklist || raw.checklist_items);

    const quizSource = asArray(raw.quiz || raw.quiz_items);
    const quizCount = Math.max(
        quizSource.length,
        toNumberValue(raw.quiz_count || raw.quizCount)
    );

    return {
        id: toStringValue(raw.id),
        code: toStringValue(raw.code, `TP-${String(index + 1).padStart(3, '0')}`),
        title: toStringValue(raw.title, 'Session TP'),
        date: toStringValue(raw.date) || null,
        durationMinutes: toNumberValue(raw.duration_minutes || raw.duration || 0),
        level: toStringValue(raw.level, 'CRMEF'),
        studentCount: toNumberValue(raw.student_count || raw.students || 0),
        status: normalizeSessionStatus(raw.status),
        reactifs,
        equipment,
        checklist,
        quizCount,
        quizTitle: toStringValue(raw.quiz_title || raw.quizTitle, 'Quiz de session'),
    };
}

function normalizeDashboardStats(rawValue: unknown): DashboardStats {
    const raw = asObject(rawValue);
    const topRaw = asArray(raw.top_used_products || raw.topProducts || raw.top_used || []);

    const topUsedProducts: DashboardUsage[] = topRaw
        .map((item) => {
            const obj = asObject(item);
            return {
                productName: toStringValue(obj.product_name || obj.name, 'Produit'),
                usageCount: toNumberValue(obj.usage_count || obj.count || obj.value),
            };
        })
        .filter((item) => item.usageCount > 0);

    return {
        totalProducts: toNumberValue(raw.total_products || raw.totalProducts),
        expiredProducts: toNumberValue(raw.expired_products || raw.expiredProducts),
        nearExpiryProducts: toNumberValue(raw.near_expiry_products || raw.nearExpiryProducts),
        missingFds: toNumberValue(raw.missing_fds || raw.missingFds || raw.missing_fds_documents),
        topUsedProducts,
    };
}

function normalizeAlert(rawValue: unknown): PublicAlert {
    const raw = asObject(rawValue);
    const severityRaw = toStringValue(raw.severity || raw.level).toLowerCase();

    let severity: PublicAlert['severity'] = 'yellow';
    if (severityRaw.includes('red') || severityRaw.includes('urgent')) severity = 'red';
    else if (severityRaw.includes('orange') || severityRaw.includes('warn')) severity = 'orange';

    return {
        id: toStringValue(raw.id),
        severity,
        message: toStringValue(raw.message || raw.title || raw.description, 'Alerte'),
        type: toStringValue(raw.type, 'Alerte'),
        createdAt: toStringValue(raw.created_at || raw.createdAt),
    };
}

async function fetchApiJson<T>(endpoint: string): Promise<T> {
    const response = await fetch(endpoint, {
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} sur ${endpoint}`);
    }

    return (await response.json()) as T;
}

function extractList<T>(payload: unknown, mapper: (item: unknown, index: number) => T): T[] {
    if (Array.isArray(payload)) return payload.map((item, index) => mapper(item, index));

    const payloadObj = asObject(payload);
    const data = payloadObj.data;
    if (Array.isArray(data)) return data.map((item, index) => mapper(item, index));

    return [];
}

function useDebouncedValue<T>(value: T, delay = 300): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [delay, value]);

    return debouncedValue;
}

function getDaysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const now = new Date();
    const target = new Date(dateStr);
    if (Number.isNaN(target.getTime())) return null;

    const ms = target.getTime() - now.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function getExpiryMeta(dateStr: string | null): {
    progress: number;
    label: string;
    barClass: string;
    isExpiringSoon: boolean;
} {
    const days = getDaysUntil(dateStr);

    if (days === null) {
        return {
            progress: 35,
            label: 'Date non renseignee',
            barClass: 'bg-slate-500',
            isExpiringSoon: false,
        };
    }

    if (days < 0) {
        return {
            progress: 8,
            label: 'Perime',
            barClass: 'bg-[#e8403a]',
            isExpiringSoon: true,
        };
    }

    if (days <= 30) {
        return {
            progress: Math.max(10, Math.round((days / 30) * 100)),
            label: `Expire dans ${days} jours`,
            barClass: 'bg-[#f5a623]',
            isExpiringSoon: true,
        };
    }

    return {
        progress: Math.min(100, Math.round((days / 180) * 100)),
        label: `Valide (${days} jours restants)`,
        barClass: 'bg-[#2ecc71]',
        isExpiringSoon: false,
    };
}

function getDangerLabel(level: RiskLevel): string {
    if (level === 'high') return 'DANGER';
    if (level === 'medium') return 'ATTENTION';
    return 'OK';
}

function getDangerClass(level: RiskLevel): string {
    if (level === 'high') return 'bg-[#e8403a]/20 text-[#ffb4b1] border-[#e8403a]/40';
    if (level === 'medium') return 'bg-[#f5a623]/20 text-[#ffd89a] border-[#f5a623]/40';
    return 'bg-[#2ecc71]/20 text-[#c7f4db] border-[#2ecc71]/40';
}

function formatAlertTime(dateStr: string): string {
    if (!dateStr) return 'Date inconnue';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return 'Date inconnue';

    return parsed.toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="rounded-2xl border border-[#e8403a]/40 bg-[#e8403a]/10 p-5 text-[#ffd5d3]">
            <p className="font-semibold">Impossible de charger cette section</p>
            <p className="mt-1 text-sm text-[#fcb9b6]">{message}</p>
            <button
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#fcb9b6]/40 px-3 py-2 text-sm font-medium hover:bg-[#e8403a]/20 transition-colors"
            >
                <RefreshCcw className="h-4 w-4" />
                Reessayer
            </button>
        </div>
    );
}

function ProductQrModal({
    product,
    onClose,
}: {
    product: PublicProduct;
    onClose: () => void;
}) {
    const [generatedQrUrl, setGeneratedQrUrl] = useState('');

    useEffect(() => {
        if (product.qrCodeUrl) return;

        let active = true;

        void QRCode.toDataURL(`${window.location.origin}/product/public/${product.id}`, {
            margin: 2,
            width: 448,
            color: {
                dark: '#0d1b2a',
                light: '#ffffff',
            },
        }).then((url: string) => {
            if (active) setGeneratedQrUrl(url);
        }).catch(() => {
            if (active) setGeneratedQrUrl('');
        });

        return () => {
            active = false;
        };
    }, [product.id, product.qrCodeUrl]);

    const handleDownloadGeneratedQr = () => {
        if (!generatedQrUrl) return;

        const link = document.createElement('a');
        link.href = generatedQrUrl;
        link.download = `qr-${product.name.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.click();
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button
                aria-label="Fermer"
                className="absolute inset-0 bg-black/70"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#162335] p-6 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
                    aria-label="Fermer la fenetre"
                >
                    <X className="h-4 w-4 text-white" />
                </button>

                <p className="text-xs uppercase tracking-wide text-[#94a3b8]">QR Code</p>
                <h3 className="mt-1 text-xl font-semibold font-public-title text-white">{product.name}</h3>
                <p className="mt-1 text-[#00b4a6] font-public-mono">{product.chemicalFormula || 'Formule non disponible'}</p>

                <div className="mt-5 flex justify-center rounded-xl border border-white/10 bg-[#0d1b2a] p-4">
                    {product.qrCodeUrl ? (
                        <img
                            src={product.qrCodeUrl}
                            alt={`QR ${product.name}`}
                            loading="lazy"
                            className="h-56 w-56 rounded-lg object-contain"
                        />
                    ) : generatedQrUrl ? (
                        <img
                            src={generatedQrUrl}
                            alt={`QR ${product.name}`}
                            loading="lazy"
                            className="h-56 w-56 rounded-lg object-contain"
                        />
                    ) : (
                        <div className="flex h-56 w-56 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm text-[#94a3b8]">
                            Generation du QR...
                        </div>
                    )}
                </div>

                <p className="mt-4 text-sm text-[#cbd5e1]">
                    Localisation: <span className="font-medium text-white">{product.location || 'Non renseignee'}</span>
                </p>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {product.qrCodeUrl ? (
                        <a
                            href={product.qrCodeUrl}
                            download
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00b4a6] px-4 py-2.5 text-sm font-semibold text-[#00121f] hover:bg-[#00c7b7] transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            Telecharger QR
                        </a>
                    ) : (
                        <button
                            onClick={handleDownloadGeneratedQr}
                            disabled={!generatedQrUrl}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00b4a6] px-4 py-2.5 text-sm font-semibold text-[#00121f] hover:bg-[#00c7b7] transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            Telecharger QR
                        </button>
                    )}

                    <Link
                        to={`/product/${product.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                    >
                        Voir fiche complete
                        <ExternalLink className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

function ProductDetailsPanel({
    product,
    onClose,
}: {
    product: PublicProduct;
    onClose: () => void;
}) {
    const physicalRows = [
        ['Aspect', product.safety.physicalProperties.appearance],
        ['pH', product.safety.physicalProperties.ph],
        ['Point ebullition', product.safety.physicalProperties.boiling_point],
        ['Point fusion', product.safety.physicalProperties.melting_point],
        ['Densite', product.safety.physicalProperties.density],
        ['Point eclair', product.safety.physicalProperties.flash_point],
        ['Solubilite', product.safety.physicalProperties.solubility_in_water],
        ['Masse molaire', product.safety.physicalProperties.molecular_weight],
    ];

    const storageRules = toStringList(product.safety.storageRules);

    return (
        <div className="fixed inset-0 z-[85]">
            <button
                aria-label="Fermer"
                className="absolute inset-0 bg-black/70"
                onClick={onClose}
            />

            <aside
                className={cn(
                    'absolute bottom-0 left-0 h-[88dvh] w-full overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#102033] p-5 shadow-2xl transition-transform duration-300 sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:w-[560px] sm:rounded-none sm:border-l sm:border-t-0',
                    'translate-y-0 sm:translate-x-0'
                )}
            >
                <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-[#94a3b8]">Detail reactif</p>
                        <h3 className="mt-1 text-2xl font-public-title text-white">{product.name}</h3>
                        <p className="text-[#00b4a6] font-public-mono">{product.chemicalFormula || 'Formule non disponible'}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 hover:bg-white/10"
                        aria-label="Fermer le panneau"
                    >
                        <X className="h-4 w-4 text-white" />
                    </button>
                </div>

                <div className="space-y-4 pb-8">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h4 className="mb-3 font-semibold text-white">Identification</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <p className="text-[#94a3b8]">CAS</p>
                            <p className="text-white">{product.casNumber || 'Non renseigne'}</p>
                            <p className="text-[#94a3b8]">Stock</p>
                            <p className="text-white">{product.quantity} {product.unit}</p>
                            <p className="text-[#94a3b8]">Localisation</p>
                            <p className="text-white">{product.location || 'Non renseignee'}</p>
                            <p className="text-[#94a3b8]">Fournisseur</p>
                            <p className="text-white">{product.supplier || 'Non renseigne'}</p>
                            <p className="text-[#94a3b8]">Expiration</p>
                            <p className="text-white">{formatPublicDate(product.expiryDate)}</p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h4 className="mb-3 font-semibold text-white">Pictogrammes GHS</h4>
                        <div className="space-y-2">
                            {product.safety.pictograms.length > 0 ? (
                                product.safety.pictograms.map((key) => (
                                    <div key={key} className="flex items-center gap-2">
                                        <span className="relative inline-flex h-7 w-7 items-center justify-center">
                                            <span className="absolute inset-0 rotate-45 rounded-[4px] border border-[#f5a623]/60 bg-[#f5a623]/15" />
                                            <span className="relative text-xs">{GHS_DETAILS[key].symbol}</span>
                                        </span>
                                        <span className="text-xs text-[#94a3b8]">{GHS_DETAILS[key].title}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-[#94a3b8]">Aucun pictogramme associe.</p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h4 className="mb-3 font-semibold text-white">EPI requis</h4>
                        <div className="grid grid-cols-1 gap-2">
                            {product.safety.epiRequired.length > 0 ? (
                                product.safety.epiRequired.map((epi) => {
                                    const item = EPI_DETAILS[epi] || { label: epi, icon: '🧷' };
                                    return (
                                        <div key={epi} className="rounded-lg border border-white/10 bg-[#0d1b2a] px-3 py-2 text-sm text-white">
                                            <span className="mr-2">{item.icon}</span>
                                            {item.label}
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-[#94a3b8]">Aucun EPI specifique renseigne.</p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h4 className="mb-3 font-semibold text-white">Proprietes physiques</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-white/10">
                                    {physicalRows.map(([label, value]) => (
                                        <tr key={label as string}>
                                            <td className="py-2 text-[#94a3b8]">{label as string}</td>
                                            <td className="py-2 text-white text-right">{value ? String(value) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h4 className="mb-3 font-semibold text-white">Regles de stockage</h4>
                        {storageRules.length > 0 ? (
                            <ul className="space-y-2 text-sm text-[#dbeafe]">
                                {storageRules.map((rule, index) => (
                                    <li key={`${rule}-${index}`} className="rounded-lg border border-white/10 bg-[#0d1b2a] px-3 py-2">
                                        {rule}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-[#94a3b8]">Aucune regle de stockage disponible.</p>
                        )}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h4 className="mb-3 font-semibold text-white">Procedures d'urgence</h4>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3">
                                <p className="font-semibold text-sky-100">Contact yeux</p>
                                <ul className="mt-2 space-y-1 text-xs text-sky-50">
                                    {product.safety.emergencyProcedures.eyes.map((item, idx) => (
                                        <li key={idx}>• {item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                                <p className="font-semibold text-amber-100">Contact peau</p>
                                <ul className="mt-2 space-y-1 text-xs text-amber-50">
                                    {product.safety.emergencyProcedures.skin.map((item, idx) => (
                                        <li key={idx}>• {item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                                <p className="font-semibold text-orange-100">Inhalation</p>
                                <ul className="mt-2 space-y-1 text-xs text-orange-50">
                                    {product.safety.emergencyProcedures.inhalation.map((item, idx) => (
                                        <li key={idx}>• {item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                                <p className="font-semibold text-red-100">Incendie</p>
                                <ul className="mt-2 space-y-1 text-xs text-red-50">
                                    {product.safety.emergencyProcedures.fire.map((item, idx) => (
                                        <li key={idx}>• {item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        {product.safety.pdfUrl ? (
                            <a
                                href={product.safety.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00b4a6] px-4 py-3 text-sm font-semibold text-[#00121f] hover:bg-[#00c7b7] transition-colors"
                            >
                                <Download className="h-4 w-4" />
                                Telecharger la FDS
                            </a>
                        ) : (
                            <button
                                disabled
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold text-[#94a3b8]"
                            >
                                FDS indisponible
                            </button>
                        )}
                    </div>
                </div>
            </aside>
        </div>
    );
}

function SessionChecklistModal({
    session,
    onClose,
}: {
    session: PublicSession;
    onClose: () => void;
}) {
    const checklistItems = session.checklist.length > 0
        ? session.checklist
        : [
            'Verifier la disponibilite des reactifs de la seance',
            'Preparer le materiel et les postes etudiants',
            'Imprimer les fiches de securite necessaires',
            'Controler les EPI obligatoires',
            'Verifier la ventilation et les regles de securite',
        ];

    return (
        <div className="fixed inset-0 z-[92] flex items-center justify-center p-4">
            <button className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Fermer" />
            <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#162335] p-6">
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
                    aria-label="Fermer"
                >
                    <X className="h-4 w-4 text-white" />
                </button>

                <p className="text-xs uppercase tracking-wide text-[#94a3b8]">Check-list</p>
                <h3 className="mt-1 text-xl font-public-title text-white">{session.title}</h3>

                <ul className="mt-5 space-y-2">
                    {checklistItems.map((item, index) => (
                        <li
                            key={`${item}-${index}`}
                            className="rounded-lg border border-white/10 bg-[#0d1b2a] px-3 py-2 text-sm text-[#e2e8f0]"
                        >
                            • {item}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function SessionQuizModal({
    session,
    onClose,
}: {
    session: PublicSession;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[92] flex items-center justify-center p-4">
            <button className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Fermer" />
            <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#162335] p-6">
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
                    aria-label="Fermer"
                >
                    <X className="h-4 w-4 text-white" />
                </button>

                <p className="text-xs uppercase tracking-wide text-[#94a3b8]">Quiz</p>
                <h3 className="mt-1 text-xl font-public-title text-white">{session.quizTitle}</h3>

                {session.quizCount > 0 ? (
                    <div className="mt-5 rounded-lg border border-white/10 bg-[#0d1b2a] p-4 text-sm text-[#e2e8f0]">
                        Cette session contient <span className="font-semibold text-white">{session.quizCount}</span> question(s).
                        L'espace quiz complet est disponible depuis la plateforme pedagogique.
                    </div>
                ) : (
                    <div className="mt-5 rounded-lg border border-white/10 bg-[#0d1b2a] p-4 text-sm text-[#94a3b8]">
                        Aucun quiz n'est disponible pour cette session.
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PublicWebsitePage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [navbarScrolled, setNavbarScrolled] = useState(false);

    const [products, setProducts] = useState<PublicProduct[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [productsError, setProductsError] = useState('');

    const [sessions, setSessions] = useState<PublicSession[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [sessionsError, setSessionsError] = useState('');

    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState('');

    const [alerts, setAlerts] = useState<PublicAlert[]>([]);
    const [alertsLoading, setAlertsLoading] = useState(true);
    const [alertsError, setAlertsError] = useState('');

    const [productFilter, setProductFilter] = useState<ProductFilter>('all');
    const [productSearch, setProductSearch] = useState('');
    const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_PER_PAGE);

    const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all');
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

    const [qrModalProduct, setQrModalProduct] = useState<PublicProduct | null>(null);
    const [detailsPanelProduct, setDetailsPanelProduct] = useState<PublicProduct | null>(null);
    const [checklistSession, setChecklistSession] = useState<PublicSession | null>(null);
    const [quizSession, setQuizSession] = useState<PublicSession | null>(null);

    const debouncedProductSearch = useDebouncedValue(productSearch, 300);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (!element) return;

        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setMobileMenuOpen(false);
    };

    const loadProducts = useCallback(async () => {
        setProductsLoading(true);
        setProductsError('');

        try {
            const payload = await fetchApiJson<unknown>('/api/products');
            const list = extractList(payload, (item) => normalizeProduct(item));
            setProducts(list);
        } catch (error) {
            setProductsError(error instanceof Error ? error.message : 'Erreur inconnue');
        } finally {
            setProductsLoading(false);
        }
    }, []);

    const loadSessions = useCallback(async () => {
        setSessionsLoading(true);
        setSessionsError('');

        try {
            const payload = await fetchApiJson<unknown>('/api/tp-sessions');
            const list = extractList(payload, (item, index) => normalizeSession(item, index));
            setSessions(list);
        } catch (error) {
            setSessionsError(error instanceof Error ? error.message : 'Erreur inconnue');
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    const loadDashboard = useCallback(async () => {
        setDashboardLoading(true);
        setDashboardError('');

        try {
            const payload = await fetchApiJson<unknown>('/api/dashboard/stats');
            const payloadObj = asObject(payload);
            const source = payloadObj.data ? payloadObj.data : payload;
            setDashboardStats(normalizeDashboardStats(source));
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : 'Erreur inconnue');
        } finally {
            setDashboardLoading(false);
        }
    }, []);

    const loadAlerts = useCallback(async () => {
        setAlertsLoading(true);
        setAlertsError('');

        try {
            const payload = await fetchApiJson<unknown>('/api/alerts?limit=5');
            const list = extractList(payload, (item) => normalizeAlert(item));
            setAlerts(list);
        } catch (error) {
            setAlertsError(error instanceof Error ? error.message : 'Erreur inconnue');
        } finally {
            setAlertsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadProducts();
        void loadSessions();
        void loadDashboard();
        void loadAlerts();
    }, [loadAlerts, loadDashboard, loadProducts, loadSessions]);

    useEffect(() => {
        const onScroll = () => {
            setNavbarScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', onScroll);
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
        if (elements.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const target = entry.target as HTMLElement;
                    const stagger = Number(target.dataset.stagger || 0);
                    target.style.transitionDelay = `${stagger}ms`;
                    target.classList.add('is-visible');
                    observer.unobserve(target);
                });
            },
            { threshold: 0.15 }
        );

        elements.forEach((element) => observer.observe(element));

        return () => observer.disconnect();
    }, [products, sessions, alerts, dashboardStats]);

    useEffect(() => {
        const lockBody = mobileMenuOpen || Boolean(qrModalProduct) || Boolean(detailsPanelProduct) || Boolean(checklistSession) || Boolean(quizSession);
        document.body.style.overflow = lockBody ? 'hidden' : '';

        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen, qrModalProduct, detailsPanelProduct, checklistSession, quizSession]);

    const productsWithFds = useMemo(
        () => products.filter((item) => Boolean(item.safety.pdfUrl)).length,
        [products]
    );

    const heroStats = useMemo(() => {
        const totalProducts = products.length;
        const activeSessions = sessions.filter((session) => session.status !== 'done').length;
        const compliance = totalProducts === 0 ? 0 : Math.round((productsWithFds / totalProducts) * 100);

        return {
            totalProducts,
            activeSessions,
            compliance,
        };
    }, [products, productsWithFds, sessions]);

    const latestProduct = useMemo(() => {
        const sorted = [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return sorted[0] || null;
    }, [products]);

    const nextSession = useMemo(() => {
        const planned = sessions
            .filter((session) => session.status !== 'done' && session.date)
            .sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime());
        return planned[0] || null;
    }, [sessions]);

    const recentAlert = useMemo(() => {
        if (alerts.length === 0) return null;
        return alerts[0];
    }, [alerts]);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const riskLevel = getRiskLevel(product.safety.pictograms);
            const expiryMeta = getExpiryMeta(product.expiryDate);

            const matchesFilter =
                productFilter === 'all'
                    ? true
                    : productFilter === 'expiring'
                        ? expiryMeta.isExpiringSoon
                        : riskLevel === productFilter;

            const normalized = debouncedProductSearch.trim().toLowerCase();
            const matchesSearch =
                normalized.length === 0 ||
                product.name.toLowerCase().includes(normalized) ||
                product.chemicalFormula.toLowerCase().includes(normalized);

            return matchesFilter && matchesSearch;
        });
    }, [debouncedProductSearch, productFilter, products]);

    useEffect(() => {
        setVisibleProductCount(PRODUCTS_PER_PAGE);
    }, [debouncedProductSearch, productFilter]);

    const visibleProducts = filteredProducts.slice(0, visibleProductCount);

    const filteredSessions = useMemo(() => {
        return sessions.filter((session) => {
            if (sessionFilter === 'all') return true;
            return session.status === sessionFilter;
        });
    }, [sessionFilter, sessions]);

    const ghsExamples = useMemo(() => {
        const map: Record<GhsKey, string[]> = {
            explosive: [],
            flammable: [],
            oxidizing: [],
            compressed_gas: [],
            corrosive: [],
            toxic: [],
            harmful: [],
            environmental_hazard: [],
            health_hazard: [],
        };

        products.forEach((product) => {
            product.safety.pictograms.forEach((pictogram) => {
                map[pictogram].push(product.name);
            });
        });

        (Object.keys(map) as GhsKey[]).forEach((key) => {
            map[key] = [...new Set(map[key])].slice(0, 2);
        });

        return map;
    }, [products]);

    const computedDashboard = useMemo<DashboardStats>(() => {
        const expiredProducts = products.filter((product) => {
            const days = getDaysUntil(product.expiryDate);
            return days !== null && days < 0;
        }).length;

        const nearExpiryProducts = products.filter((product) => {
            const days = getDaysUntil(product.expiryDate);
            return days !== null && days >= 0 && days <= 30;
        }).length;

        const missingFds = products.filter((product) => !product.safety.pdfUrl).length;

        const usageMap = new Map<string, number>();
        sessions.forEach((session) => {
            session.reactifs.forEach((reactif) => {
                const current = usageMap.get(reactif.productName) || 0;
                usageMap.set(reactif.productName, current + 1);
            });
        });

        const topUsedProducts = [...usageMap.entries()]
            .map(([productName, usageCount]) => ({ productName, usageCount }))
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 8);

        return {
            totalProducts: products.length,
            expiredProducts,
            nearExpiryProducts,
            missingFds,
            topUsedProducts,
        };
    }, [products, sessions]);

    const dashboardView = useMemo<DashboardStats>(() => {
        if (!dashboardStats) return computedDashboard;

        return {
            totalProducts: dashboardStats.totalProducts || computedDashboard.totalProducts,
            expiredProducts: dashboardStats.expiredProducts || computedDashboard.expiredProducts,
            nearExpiryProducts: dashboardStats.nearExpiryProducts || computedDashboard.nearExpiryProducts,
            missingFds: dashboardStats.missingFds || computedDashboard.missingFds,
            topUsedProducts:
                dashboardStats.topUsedProducts.length > 0
                    ? dashboardStats.topUsedProducts.slice(0, 8)
                    : computedDashboard.topUsedProducts,
        };
    }, [computedDashboard, dashboardStats]);

    const dashboardAlerts = alerts.slice(0, 5);

    const usageChartData = useMemo<ChartData<'bar'>>(
        () => ({
            labels: dashboardView.topUsedProducts.map((item) => item.productName),
            datasets: [
                {
                    label: 'Utilisations',
                    data: dashboardView.topUsedProducts.map((item) => item.usageCount),
                    backgroundColor: '#00b4a6',
                    borderRadius: 6,
                    maxBarThickness: 36,
                },
            ],
        }),
        [dashboardView.topUsedProducts]
    );

    const usageChartOptions = useMemo<ChartOptions<'bar'>>(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: '#0d1b2a',
                    borderColor: 'rgba(148,163,184,0.25)',
                    borderWidth: 1,
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    padding: 10,
                },
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            size: 11,
                        },
                    },
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 1,
                    },
                    grid: {
                        color: 'rgba(148,163,184,0.2)',
                    },
                },
            },
        }),
        []
    );

    const openProductFromReactif = (reactif: SessionReactif) => {
        const product = products.find((item) => item.id === reactif.productId)
            || products.find((item) => item.name.toLowerCase() === reactif.productName.toLowerCase());

        if (!product) return;
        setQrModalProduct(product);
    };

    return (
        <div className="bg-[#0d1b2a] text-[#f8fafc] font-public-body">
            <header
                className={cn(
                    'fixed inset-x-0 top-0 z-50 transition-all duration-300',
                    navbarScrolled
                        ? 'border-b border-white/10 bg-[#0d1b2a]/90 backdrop-blur-xl'
                        : 'bg-transparent'
                )}
            >
                <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
                    <button
                        onClick={() => scrollToSection('accueil')}
                        className="text-left"
                    >
                        <p className="font-semibold text-base sm:text-lg">⚗️ ChimioLab</p>
                        <p className="text-xs text-[#94a3b8]">Laboratoire numerique intelligent</p>
                    </button>

                    <nav className="hidden items-center gap-6 md:flex">
                        {[
                            ['accueil', 'Accueil'],
                            ['reactifs', 'Reactifs'],
                            ['sessions', 'Sessions TP'],
                            ['securite', 'Securite'],
                            ['apropos', 'A propos'],
                        ].map(([id, label]) => (
                            <button
                                key={id}
                                onClick={() => scrollToSection(id)}
                                className="text-sm text-[#cbd5e1] hover:text-white transition-colors"
                            >
                                {label}
                            </button>
                        ))}
                    </nav>

                    <div className="hidden md:block">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 rounded-full border border-[#00b4a6]/40 bg-[#00b4a6]/15 px-4 py-2 text-sm font-semibold text-[#b7fff7] hover:bg-[#00b4a6]/25 transition-colors"
                        >
                            Acceder a la plateforme
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 md:hidden"
                        aria-label="Ouvrir le menu"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[70] bg-[#0d1b2a]/95 backdrop-blur-xl p-6 md:hidden">
                    <div className="flex items-center justify-between">
                        <p className="font-semibold text-lg">Navigation</p>
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10"
                            aria-label="Fermer le menu"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="mt-10 grid gap-3">
                        {[
                            ['accueil', 'Accueil'],
                            ['reactifs', 'Reactifs'],
                            ['sessions', 'Sessions TP'],
                            ['securite', 'Securite'],
                            ['apropos', 'A propos'],
                        ].map(([id, label]) => (
                            <button
                                key={id}
                                onClick={() => scrollToSection(id)}
                                className="rounded-xl border border-white/10 px-4 py-3 text-left text-base font-medium hover:bg-white/10"
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <Link
                        to="/login"
                        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00b4a6] px-4 py-3 font-semibold text-[#00121f]"
                    >
                        Acceder a la plateforme
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            )}

            <section id="accueil" className="relative min-h-screen overflow-hidden pt-24">
                <div className="pointer-events-none absolute inset-0 public-grid-bg opacity-20" />
                <div className="pointer-events-none absolute -right-52 top-1/2 h-[38rem] w-[38rem] -translate-y-1/2 rounded-full bg-[#00b4a6]/30 blur-3xl" />

                <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:pt-16">
                    <div data-reveal className="reveal-fade">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-[#cbd5e1]">
                            <span className="relative inline-flex h-2.5 w-2.5">
                                <span className="absolute inset-0 animate-ping rounded-full bg-[#2ecc71]/70" />
                                <span className="relative rounded-full bg-[#2ecc71] h-2.5 w-2.5" />
                            </span>
                            CRMEF Derb Ghallef — PFE 2026
                        </div>

                        <h1 className="mt-6 max-w-3xl text-4xl font-public-title leading-tight sm:text-5xl lg:text-6xl">
                            Le laboratoire
                            <br />
                            <span className="italic text-[#00b4a6]">numerique</span> de demain
                        </h1>

                        <p className="mt-6 max-w-2xl text-base text-[#cbd5e1] sm:text-lg">
                            Une plateforme publique pour consulter les reactifs, suivre les sessions TP,
                            renforcer la securite chimique et soutenir la formation des enseignants.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <button
                                onClick={() => scrollToSection('reactifs')}
                                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#00b4a6] px-5 py-3 text-sm font-semibold text-[#00121f] hover:bg-[#00c7b7] transition-colors"
                            >
                                ⚗️ Explorer les reactifs
                            </button>
                            <button
                                onClick={() => scrollToSection('sessions')}
                                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                            >
                                📋 Voir les sessions TP
                            </button>
                        </div>

                        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {productsLoading || sessionsLoading ? (
                                [1, 2, 3].map((item) => (
                                    <div key={item} className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/5" />
                                ))
                            ) : (
                                <>
                                    <div className="rounded-xl border border-white/10 bg-[#162335] p-4">
                                        <p className="text-xs text-[#94a3b8]">Produits totaux</p>
                                        <p className="mt-1 text-2xl font-semibold text-white">{heroStats.totalProducts}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-[#162335] p-4">
                                        <p className="text-xs text-[#94a3b8]">Sessions TP actives</p>
                                        <p className="mt-1 text-2xl font-semibold text-white">{heroStats.activeSessions}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-[#162335] p-4">
                                        <p className="text-xs text-[#94a3b8]">Conformite FDS</p>
                                        <p className="mt-1 text-2xl font-semibold text-[#2ecc71]">{heroStats.compliance}%</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div data-reveal data-stagger="90" className="hidden lg:block reveal-fade">
                        <div className="relative">
                            <img
                                src={chemLabImg}
                                alt="Chemistry lab equipment"
                                className="w-full rounded-2xl object-cover shadow-2xl"
                                style={{ maxHeight: '420px' }}
                            />
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-[#00121f]/80 via-[#00121f]/30 to-transparent" />
                        </div>
                        <div className="mt-4 space-y-4">
                            <div style={{ animation: 'public-float 6s ease-in-out infinite' }} className="rounded-2xl border border-white/10 bg-[#162335]/95 p-4 shadow-xl">
                                <p className="text-xs uppercase tracking-wide text-[#94a3b8]">Alerte recente</p>
                                {alertsLoading ? (
                                    <div className="mt-3 h-12 animate-pulse rounded-lg bg-white/10" />
                                ) : recentAlert ? (
                                    <>
                                        <p className="mt-3 text-sm text-white">{recentAlert.message}</p>
                                        <p className="mt-2 text-xs text-[#94a3b8]">{formatAlertTime(recentAlert.createdAt)}</p>
                                    </>
                                ) : (
                                    <p className="mt-3 text-sm text-[#94a3b8]">Aucune alerte disponible.</p>
                                )}
                            </div>

                            <div style={{ animation: 'public-float 7s ease-in-out infinite', animationDelay: '0.3s' }} className="rounded-2xl border border-white/10 bg-[#162335]/95 p-4 shadow-xl">
                                <p className="text-xs uppercase tracking-wide text-[#94a3b8]">Prochaine session TP</p>
                                {sessionsLoading ? (
                                    <div className="mt-3 h-12 animate-pulse rounded-lg bg-white/10" />
                                ) : nextSession ? (
                                    <>
                                        <p className="mt-3 text-sm text-white">{nextSession.title}</p>
                                        <p className="mt-2 text-xs text-[#94a3b8]">{formatPublicDate(nextSession.date)}</p>
                                    </>
                                ) : (
                                    <p className="mt-3 text-sm text-[#94a3b8]">Aucune session planifiee.</p>
                                )}
                            </div>

                            <div style={{ animation: 'public-float 8s ease-in-out infinite', animationDelay: '0.5s' }} className="rounded-2xl border border-white/10 bg-[#162335]/95 p-4 shadow-xl">
                                <p className="text-xs uppercase tracking-wide text-[#94a3b8]">Dernier produit ajoute</p>
                                {productsLoading ? (
                                    <div className="mt-3 h-12 animate-pulse rounded-lg bg-white/10" />
                                ) : latestProduct ? (
                                    <>
                                        <p className="mt-3 text-sm text-white">{latestProduct.name}</p>
                                        <p className="mt-2 text-xs text-[#00b4a6] font-public-mono">{latestProduct.chemicalFormula || 'Formule non disponible'}</p>
                                    </>
                                ) : (
                                    <p className="mt-3 text-sm text-[#94a3b8]">Aucun produit disponible.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="reactifs" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
                <div data-reveal className="mb-8 reveal-fade">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#94a3b8]">// 01 — Inventaire</p>
                    <h2 className="mt-2 text-3xl font-public-title sm:text-4xl">Reactifs & Produits chimiques</h2>
                    <p className="mt-2 text-[#cbd5e1]">Consultez les donnees, scannez les QR codes et accedez aux fiches detaillees.</p>
                </div>

                <div className="mb-5 flex flex-wrap gap-2">
                    {([
                        ['all', 'Tous'],
                        ['high', '🔴 Danger eleve'],
                        ['medium', '🟡 Attention'],
                        ['low', '🟢 Faible risque'],
                        ['expiring', '⏰ Bientot perimes'],
                    ] as Array<[ProductFilter, string]>).map(([value, label]) => (
                        <button
                            key={value}
                            onClick={() => setProductFilter(value)}
                            className={cn(
                                'min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                                productFilter === value
                                    ? 'border-[#00b4a6] bg-[#00b4a6]/20 text-[#b7fff7]'
                                    : 'border-white/15 bg-white/5 text-[#cbd5e1] hover:bg-white/10'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="mb-6 relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                    <input
                        type="text"
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                        placeholder="Rechercher par nom ou formule..."
                        className="h-12 w-full rounded-xl border border-white/15 bg-[#162335] pl-10 pr-4 text-sm text-white placeholder:text-[#94a3b8] focus:border-[#00b4a6] focus:outline-none"
                    />
                </div>

                {productsLoading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="h-64 animate-pulse rounded-2xl border border-white/10 bg-[#162335]" />
                        ))}
                    </div>
                ) : productsError ? (
                    <SectionError message={productsError} onRetry={() => void loadProducts()} />
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {visibleProducts.map((product, index) => {
                                const riskLevel = getRiskLevel(product.safety.pictograms);
                                const expiry = getExpiryMeta(product.expiryDate);

                                return (
                                    <article
                                        key={product.id}
                                        onClick={() => setDetailsPanelProduct(product)}
                                        data-reveal
                                        data-stagger={(index % 6) * 40}
                                        className="group reveal-fade cursor-pointer rounded-2xl border border-white/10 bg-[#162335] p-5 transition-all hover:border-[#00b4a6]/40 hover:shadow-[0_0_0_1px_rgba(0,180,166,0.2)]"
                                    >
                                        <p className="font-public-mono text-xl text-[#00b4a6]">{product.chemicalFormula || '—'}</p>
                                        <h3 className="mt-2 text-lg font-semibold text-white line-clamp-2">{product.name}</h3>
                                        <p className="mt-1 text-xs text-[#94a3b8]">CAS: {product.casNumber || 'Non renseigne'}</p>

                                        <div className="mt-3 flex items-center justify-between">
                                            <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', getDangerClass(riskLevel))}>
                                                {getDangerLabel(riskLevel)}
                                            </span>
                                            <span className="text-xs text-[#94a3b8]">{formatPublicDate(product.expiryDate)}</span>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {product.safety.pictograms.length > 0 ? (
                                                product.safety.pictograms.map((pictogram) => (
                                                    <span key={pictogram} className="relative inline-flex h-6 w-6 items-center justify-center text-[10px]">
                                                        <span className="absolute inset-0 rotate-45 rounded-[4px] border border-[#f5a623]/60 bg-[#f5a623]/10" />
                                                        <span className="relative">{GHS_DETAILS[pictogram].symbol}</span>
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-[#94a3b8]">Aucun pictogramme</span>
                                            )}
                                        </div>

                                        <div className="mt-4">
                                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                                <div
                                                    className={cn('h-full rounded-full transition-all', expiry.barClass)}
                                                    style={{ width: `${expiry.progress}%` }}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-[#94a3b8]">{expiry.label}</p>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-sm">
                                            <p className="text-[#cbd5e1]">Stock: <span className="font-semibold text-white">{product.quantity} {product.unit}</span></p>
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setQrModalProduct(product);
                                                }}
                                                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                                            >
                                                <QrCode className="h-4 w-4" />
                                                QR Code
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {filteredProducts.length > visibleProductCount && (
                            <div className="mt-6 flex justify-center">
                                <button
                                    onClick={() => setVisibleProductCount((current) => current + PRODUCTS_PER_PAGE)}
                                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10"
                                >
                                    Charger plus
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            <section id="sessions" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
                <div data-reveal className="mb-8 reveal-fade">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#94a3b8]">// 02 — Pedagogie</p>
                    <h2 className="mt-2 text-3xl font-public-title sm:text-4xl">Sessions de Travaux Pratiques</h2>
                    <p className="mt-2 text-[#cbd5e1]">Preparation pedagogique, reactifs utilises et suivi des activites.</p>
                </div>

                <div className="mb-6 flex flex-wrap gap-2">
                    {([
                        ['all', 'Toutes'],
                        ['planned', 'Planifiees'],
                        ['in_progress', 'En cours'],
                        ['done', 'Terminees'],
                    ] as Array<[SessionFilter, string]>).map(([value, label]) => (
                        <button
                            key={value}
                            onClick={() => setSessionFilter(value)}
                            className={cn(
                                'min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                                sessionFilter === value
                                    ? 'border-[#00b4a6] bg-[#00b4a6]/20 text-[#b7fff7]'
                                    : 'border-white/15 bg-white/5 text-[#cbd5e1] hover:bg-white/10'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {sessionsLoading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-[#162335]" />
                        ))}
                    </div>
                ) : sessionsError ? (
                    <SectionError message={sessionsError} onRetry={() => void loadSessions()} />
                ) : (
                    <div className="space-y-4">
                        {filteredSessions.map((session, index) => {
                            const expanded = expandedSessionId === session.id;

                            return (
                                <article
                                    key={session.id}
                                    data-reveal
                                    data-stagger={(index % 5) * 45}
                                    className="reveal-fade rounded-2xl border border-white/10 bg-[#162335]"
                                >
                                    <button
                                        onClick={() => setExpandedSessionId(expanded ? null : session.id)}
                                        className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-xs uppercase tracking-wide text-[#94a3b8]">{session.code}</p>
                                            <h3 className="mt-1 text-lg font-semibold text-white">{session.title}</h3>
                                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#cbd5e1]">
                                                <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatPublicDate(session.date)}</span>
                                                <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{session.durationMinutes} min</span>
                                                <span>Niveau {session.level}</span>
                                                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{session.studentCount} etudiants</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                'rounded-full border px-2.5 py-1 text-xs font-semibold',
                                                session.status === 'done'
                                                    ? 'border-[#2ecc71]/40 bg-[#2ecc71]/20 text-[#c7f4db]'
                                                    : session.status === 'in_progress'
                                                        ? 'border-[#f5a623]/40 bg-[#f5a623]/20 text-[#ffd89a]'
                                                        : 'border-[#00b4a6]/40 bg-[#00b4a6]/20 text-[#b7fff7]'
                                            )}>
                                                {session.status === 'done' ? 'Termine' : session.status === 'in_progress' ? 'En cours' : 'Planifie'}
                                            </span>
                                            <ChevronDown className={cn('h-5 w-5 text-[#94a3b8] transition-transform', expanded && 'rotate-180')} />
                                        </div>
                                    </button>

                                    {expanded && (
                                        <div className="border-t border-white/10 px-5 py-4">
                                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                                <div className="rounded-xl border border-white/10 bg-[#0d1b2a] p-4">
                                                    <h4 className="font-semibold text-white">⚗️ Reactifs utilises</h4>
                                                    {session.reactifs.length > 0 ? (
                                                        <div className="mt-3 overflow-x-auto">
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="border-b border-white/10 text-left text-xs text-[#94a3b8]">
                                                                        <th className="pb-2 font-medium">Produit</th>
                                                                        <th className="pb-2 font-medium">Quantite</th>
                                                                        <th className="pb-2 font-medium">Unite</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {session.reactifs.map((reactif, reactifIndex) => (
                                                                        <tr key={`${session.id}-${reactifIndex}`} className="border-b border-white/5 last:border-0">
                                                                            <td className="py-2">
                                                                                <button
                                                                                    onClick={() => openProductFromReactif(reactif)}
                                                                                    className="text-left text-[#7eeae0] hover:text-[#b7fff7] underline-offset-2 hover:underline"
                                                                                >
                                                                                    {reactif.productName}
                                                                                </button>
                                                                            </td>
                                                                            <td className="py-2 text-[#cbd5e1]">{reactif.plannedQuantity}</td>
                                                                            <td className="py-2 text-[#cbd5e1]">{reactif.unit}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <p className="mt-3 text-sm text-[#94a3b8]">Aucun reactif lie a cette session.</p>
                                                    )}
                                                </div>

                                                <div className="rounded-xl border border-white/10 bg-[#0d1b2a] p-4">
                                                    <h4 className="font-semibold text-white">🔬 Materiel necessaire</h4>
                                                    {session.equipment.length > 0 ? (
                                                        <ul className="mt-3 space-y-2 text-sm text-[#dbeafe]">
                                                            {session.equipment.map((item, equipmentIndex) => (
                                                                <li key={`${item}-${equipmentIndex}`}>• {item}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="mt-3 text-sm text-[#94a3b8]">Aucun materiel liste.</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => setChecklistSession(session)}
                                                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                                                >
                                                    📋 Check-list de preparation
                                                </button>
                                                {session.quizCount > 0 && (
                                                    <button
                                                        onClick={() => setQuizSession(session)}
                                                        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#00b4a6]/30 bg-[#00b4a6]/15 px-4 py-2 text-sm font-semibold text-[#b7fff7] hover:bg-[#00b4a6]/25"
                                                    >
                                                        📊 Voir le quiz
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <section id="securite" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
                <div data-reveal className="mb-8 reveal-fade">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#94a3b8]">// 03 — Securite</p>
                    <h2 className="mt-2 text-3xl font-public-title sm:text-4xl">Securite & Conformite GHS/SGH</h2>
                    <p className="mt-2 text-[#cbd5e1]">Referentiel visuel conforme aux standards internationaux de securite chimique.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {(Object.keys(GHS_DETAILS) as GhsKey[]).map((key, index) => {
                        const details = GHS_DETAILS[key];
                        const examples = ghsExamples[key];

                        return (
                            <article
                                key={key}
                                data-reveal
                                data-stagger={(index % 6) * 45}
                                className="reveal-fade rounded-2xl border border-white/10 bg-[#162335] p-5"
                            >
                                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center relative text-xl">
                                    <span className="absolute inset-0 rotate-45 rounded-[10px] border border-[#f5a623]/70 bg-[#f5a623]/15" />
                                    <span className="relative">{details.symbol}</span>
                                </div>
                                <h3 className="text-lg font-semibold text-white">{details.title}</h3>
                                <p className="mt-1 text-sm text-[#cbd5e1]">{details.description}</p>
                                <p className="mt-3 text-xs text-[#94a3b8]">
                                    Exemples: {examples.length > 0 ? examples.join(', ') : 'Aucun produit associe'}
                                </p>
                            </article>
                        );
                    })}
                </div>

                <div className="mt-10 rounded-2xl border border-[#e8403a]/35 bg-[#e8403a]/10 p-5">
                    <h3 className="text-lg font-semibold text-white">⚠️ Regles d'incompatibilite chimique</h3>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {INCOMPATIBILITY_PAIRS.map(([left, right], index) => (
                            <div key={`${left}-${right}-${index}`} className="rounded-xl border border-[#e8403a]/35 bg-[#0d1b2a] px-4 py-3 flex items-center justify-between gap-2">
                                <span className="text-sm text-[#ffd5d3]">{left}</span>
                                <span className="text-[#e8403a] text-lg">✗</span>
                                <span className="text-sm text-[#ffd5d3] text-right">{right}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
                <div data-reveal className="mb-8 reveal-fade">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#94a3b8]">// Apercu dashboard</p>
                    <h2 className="mt-2 text-3xl font-public-title sm:text-4xl">Tableau de bord apercu</h2>
                    <p className="mt-2 text-[#cbd5e1]">Indicateurs cles, produits les plus utilises et alertes recentes.</p>
                </div>

                {dashboardLoading ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-[#162335]" />
                            ))}
                        </div>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="h-80 animate-pulse rounded-2xl border border-white/10 bg-[#162335]" />
                            <div className="h-80 animate-pulse rounded-2xl border border-white/10 bg-[#162335]" />
                        </div>
                    </div>
                ) : dashboardError ? (
                    <SectionError message={dashboardError} onRetry={() => void loadDashboard()} />
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-white/10 bg-[#162335] p-4">
                                <p className="text-xs text-[#94a3b8]">Produits totaux</p>
                                <p className="mt-1 text-3xl font-semibold text-[#00b4a6]">{dashboardView.totalProducts}</p>
                            </div>
                            <div className="rounded-2xl border border-[#e8403a]/35 bg-[#e8403a]/10 p-4">
                                <p className="text-xs text-[#fca5a0]">Produits perimes</p>
                                <p className="mt-1 text-3xl font-semibold text-[#ffd5d3]">{dashboardView.expiredProducts}</p>
                                <p className="mt-1 text-xs text-[#ffc4c1]">Urgent</p>
                            </div>
                            <div className="rounded-2xl border border-[#f5a623]/35 bg-[#f5a623]/10 p-4">
                                <p className="text-xs text-[#f8d090]">Near expiry &lt; 30 jours</p>
                                <p className="mt-1 text-3xl font-semibold text-[#ffe8bf]">{dashboardView.nearExpiryProducts}</p>
                            </div>
                            <div className="rounded-2xl border border-[#e8403a]/35 bg-[#e8403a]/10 p-4">
                                <p className="text-xs text-[#fca5a0]">FDS manquantes</p>
                                <p className="mt-1 text-3xl font-semibold text-[#ffd5d3]">{dashboardView.missingFds}</p>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-[#162335] p-4">
                                <p className="mb-4 text-sm font-semibold text-white">Top 8 produits les plus utilises</p>
                                {dashboardView.topUsedProducts.length > 0 ? (
                                    <div className="h-72">
                                        <ChartBar data={usageChartData} options={usageChartOptions} />
                                    </div>
                                ) : (
                                    <p className="text-sm text-[#94a3b8]">Aucune donnee d'utilisation disponible.</p>
                                )}
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-[#162335] p-4">
                                <p className="mb-4 text-sm font-semibold text-white">Dernieres alertes</p>

                                {alertsLoading ? (
                                    <div className="space-y-2">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <div key={index} className="h-12 animate-pulse rounded-lg bg-white/10" />
                                        ))}
                                    </div>
                                ) : alertsError ? (
                                    <SectionError message={alertsError} onRetry={() => void loadAlerts()} />
                                ) : dashboardAlerts.length > 0 ? (
                                    <div className="space-y-2">
                                        {dashboardAlerts.map((alert) => (
                                            <div key={alert.id} className="rounded-lg border border-white/10 bg-[#0d1b2a] px-3 py-2">
                                                <div className="flex items-start gap-2">
                                                    <span className={cn(
                                                        'mt-1 inline-block h-2.5 w-2.5 rounded-full',
                                                        alert.severity === 'red'
                                                            ? 'bg-[#e8403a]'
                                                            : alert.severity === 'orange'
                                                                ? 'bg-[#f5a623]'
                                                                : 'bg-[#facc15]'
                                                    )} />
                                                    <div>
                                                        <p className="text-sm text-white">{alert.message}</p>
                                                        <p className="text-xs text-[#94a3b8]">{formatAlertTime(alert.createdAt)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-[#94a3b8]">Aucune alerte recente.</p>
                                )}
                            </div>
                        </div>
                    </>
                )}

                <div className="mt-6">
                    <Link
                        to="/login"
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#00b4a6]/35 bg-[#00b4a6]/15 px-5 py-3 text-sm font-semibold text-[#b7fff7] hover:bg-[#00b4a6]/25"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Acceder au tableau de bord complet
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            <section id="apropos" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
                    <div data-reveal className="reveal-fade">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#94a3b8]">// 04 — A propos</p>
                        <h2 className="mt-2 text-3xl font-public-title sm:text-4xl">ChimioLab — CRMEF Derb Ghallef</h2>

                        <div className="mt-5 space-y-4 text-[#dbeafe]">
                            <p>
                                ChimioLab est concu dans le cadre de la formation CRMEF pour accompagner la digitalisation
                                des pratiques de laboratoire en sciences physiques.
                            </p>
                            <p>
                                Le projet repond a un besoin concret: reduire les risques lies a une gestion manuelle des
                                produits chimiques et ameliorer la tracabilite des ressources.
                            </p>
                            <p>
                                La vision pedagogique est de creer un environnement plus sur, plus structure et plus
                                interactif pour les enseignants, les etudiants et les visiteurs.
                            </p>
                        </div>

                        <div className="mt-6 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-[#cbd5e1]">
                            Projet de Fin d'Etudes 2026
                        </div>
                    </div>

                    <div data-reveal data-stagger="100" className="grid grid-cols-1 gap-3 sm:grid-cols-2 reveal-fade">
                        {[
                            ['React + Vite', 'Interface web performante et responsive'],
                            ['Supabase', 'Base de donnees et stockage centralises'],
                            ['QR Code', 'Identification rapide des produits'],
                            ['Normes GHS/SGH', 'Conformite securite internationale'],
                        ].map(([title, desc]) => (
                            <article key={title} className="rounded-2xl border border-white/10 bg-[#162335] p-4">
                                <p className="font-semibold text-white">{title}</p>
                                <p className="mt-1 text-sm text-[#94a3b8]">{desc}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <footer className="border-t border-white/10 bg-[#0b1623]">
                <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3">
                    <div>
                        <p className="text-lg font-semibold">⚗️ ChimioLab</p>
                        <p className="mt-1 text-sm text-[#94a3b8]">Laboratoire numerique intelligent</p>
                        <p className="mt-3 text-sm text-[#cbd5e1]">
                            Plateforme publique de consultation des reactifs, sessions TP et indicateurs de securite.
                        </p>
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-white">Liens rapides</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[#cbd5e1]">
                            <button onClick={() => scrollToSection('reactifs')} className="text-left hover:text-white">Reactifs</button>
                            <button onClick={() => scrollToSection('sessions')} className="text-left hover:text-white">Sessions TP</button>
                            <button onClick={() => scrollToSection('securite')} className="text-left hover:text-white">Securite</button>
                            <Link to="/login" className="hover:text-white">Tableau de bord</Link>
                            <Link to="/login" className="hover:text-white">Se connecter</Link>
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-white">Informations</p>
                        <div className="mt-3 space-y-1 text-sm text-[#cbd5e1]">
                            <p>CRMEF Derb Ghallef</p>
                            <p>Annee 2025-2026</p>
                            <p>PFE — Physique-Chimie</p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-[#94a3b8] sm:px-6">
                    ChimioLab © 2026 — Developpe dans le cadre d'un PFE a CRMEF Derb Ghallef | Tous droits reserves
                </div>
            </footer>

            {qrModalProduct && (
                <ProductQrModal
                    product={qrModalProduct}
                    onClose={() => setQrModalProduct(null)}
                />
            )}

            {detailsPanelProduct && (
                <ProductDetailsPanel
                    product={detailsPanelProduct}
                    onClose={() => setDetailsPanelProduct(null)}
                />
            )}

            {checklistSession && (
                <SessionChecklistModal
                    session={checklistSession}
                    onClose={() => setChecklistSession(null)}
                />
            )}

            {quizSession && (
                <SessionQuizModal
                    session={quizSession}
                    onClose={() => setQuizSession(null)}
                />
            )}
        </div>
    );
}
