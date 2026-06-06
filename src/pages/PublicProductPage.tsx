import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabasePublic } from '../lib/supabasePublic';
import type { Product, SafetySheet, GHSClass, EpiRequired, PhysicalProperties } from '../types/database';
import { useAuth } from '../context/AuthContext';

// ─── GHS Pictogram SVG Components ────────────────────────────────────────────
// Each renders an orange diamond with a black symbol inside

function GHSDiamond({ children, label }: { children: React.ReactNode; label: string }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 sm:w-24 sm:h-24 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <polygon points="50,2 98,50 50,98 2,50" fill="#fff" stroke="#ff0000" strokeWidth="3" />
                    <polygon points="50,8 92,50 50,92 8,50" fill="#fff" stroke="none" />
                    {children}
                </svg>
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-700 text-center leading-tight">{label}</span>
        </div>
    );
}

const GHS_PICTOGRAMS: Record<GHSClass, { label: string; svg: React.ReactNode }> = {
    explosive: {
        label: 'Explosif',
        svg: (
            <g transform="translate(25,20) scale(0.5)">
                <circle cx="50" cy="50" r="12" fill="none" stroke="#000" strokeWidth="4" />
                <line x1="50" y1="20" x2="50" y2="38" stroke="#000" strokeWidth="4" />
                <line x1="50" y1="62" x2="50" y2="80" stroke="#000" strokeWidth="4" />
                <line x1="20" y1="50" x2="38" y2="50" stroke="#000" strokeWidth="4" />
                <line x1="62" y1="50" x2="80" y2="50" stroke="#000" strokeWidth="4" />
                <line x1="29" y1="29" x2="40" y2="40" stroke="#000" strokeWidth="3" />
                <line x1="60" y1="60" x2="71" y2="71" stroke="#000" strokeWidth="3" />
                <line x1="71" y1="29" x2="60" y2="40" stroke="#000" strokeWidth="3" />
                <line x1="40" y1="60" x2="29" y2="71" stroke="#000" strokeWidth="3" />
            </g>
        ),
    },
    flammable: {
        label: 'Inflammable',
        svg: (
            <g transform="translate(30,18) scale(0.4)">
                <path d="M50 10 C30 40, 15 70, 15 90 C15 120, 30 140, 50 150 C40 130, 45 110, 55 100 C55 120, 65 140, 50 150 C70 140, 85 120, 85 90 C85 70, 70 40, 50 10Z" fill="#000" />
            </g>
        ),
    },
    oxidizing: {
        label: 'Comburant',
        svg: (
            <g transform="translate(22,16) scale(0.56)">
                <circle cx="50" cy="35" r="12" fill="#000" />
                <path d="M25 50 Q30 80, 50 90 Q70 80, 75 50 Q60 65, 50 55 Q40 65, 25 50Z" fill="#000" />
            </g>
        ),
    },
    compressed_gas: {
        label: 'Gaz sous pression',
        svg: (
            <g transform="translate(30,15) scale(0.4)">
                <rect x="35" y="10" width="30" height="100" rx="15" fill="none" stroke="#000" strokeWidth="5" />
                <rect x="40" y="5" width="20" height="15" rx="3" fill="#000" />
                <line x1="50" y1="0" x2="50" y2="5" stroke="#000" strokeWidth="4" />
            </g>
        ),
    },
    corrosive: {
        label: 'Corrosif',
        svg: (
            <g transform="translate(20,18) scale(0.6)">
                <path d="M30 25 L45 25 L50 55 L25 55Z" fill="#000" />
                <path d="M55 25 L70 25 L75 55 L50 55Z" fill="#000" />
                <path d="M25 60 C30 80, 40 90, 50 90 C60 90, 70 80, 75 60 L70 60 C65 75, 60 82, 50 82 C40 82, 35 75, 30 60Z" fill="#000" />
            </g>
        ),
    },
    toxic: {
        label: 'Toxique',
        svg: (
            <g transform="translate(25,15) scale(0.5)">
                <circle cx="50" cy="35" r="18" fill="#000" />
                <circle cx="42" cy="32" r="4" fill="#fff" />
                <circle cx="58" cy="32" r="4" fill="#fff" />
                <rect x="48" y="53" width="4" height="35" fill="#000" />
                <rect x="30" y="65" width="40" height="4" fill="#000" />
                <rect x="38" y="55" width="4" height="30" fill="#000" transform="rotate(-20 40 70)" />
                <rect x="58" y="55" width="4" height="30" fill="#000" transform="rotate(20 60 70)" />
            </g>
        ),
    },
    harmful: {
        label: 'Irritant / Nocif',
        svg: (
            <g transform="translate(25,22) scale(0.5)">
                <path d="M50 15 L55 40 L80 40 L60 55 L67 80 L50 65 L33 80 L40 55 L20 40 L45 40Z" fill="#000" fillRule="nonzero" />
            </g>
        ),
    },
    environmental_hazard: {
        label: 'Dangereux pour l\'environnement',
        svg: (
            <g transform="translate(22,20) scale(0.56)">
                <path d="M55 25 C65 25, 75 35, 75 50 C75 65, 60 70, 50 70 C40 70, 25 65, 25 50" fill="none" stroke="#000" strokeWidth="4" />
                <path d="M35 55 C35 45, 50 35, 55 25" fill="none" stroke="#000" strokeWidth="4" />
                <line x1="20" y1="75" x2="80" y2="75" stroke="#000" strokeWidth="4" />
            </g>
        ),
    },
    health_hazard: {
        label: 'Danger pour la santé',
        svg: (
            <g transform="translate(25,18) scale(0.5)">
                <path d="M30 25 L50 25 L50 45 L70 25 L75 30 L55 50 L75 70 L70 75 L50 55 L50 85 L65 100 L58 100 L50 90 L42 100 L35 100 L50 85 L50 55 L30 75 L25 70 L45 50 L25 30Z" fill="#000" />
                <circle cx="55" cy="18" r="8" fill="#000" />
            </g>
        ),
    },
};

// ─── EPI Icon Components ─────────────────────────────────────────────────────

const EPI_CONFIG: Record<EpiRequired, { label: string; icon: string; color: string; bgColor: string }> = {
    gloves: { label: 'Gants de protection', icon: '🧤', color: 'text-blue-800', bgColor: 'bg-blue-50 border-blue-200' },
    safety_glasses: { label: 'Lunettes de protection', icon: '👓', color: 'text-amber-800', bgColor: 'bg-amber-50 border-amber-200' },
    lab_coat: { label: 'Blouse de laboratoire', icon: '🥼', color: 'text-green-800', bgColor: 'bg-green-50 border-green-200' },
    fume_hood: { label: 'Utiliser sous hotte aspirante', icon: '💨', color: 'text-purple-800', bgColor: 'bg-purple-50 border-purple-200' },
    respirator: { label: 'Masque respiratoire', icon: '😷', color: 'text-red-800', bgColor: 'bg-red-50 border-red-200' },
    face_shield: { label: 'Écran facial', icon: '🛡️', color: 'text-indigo-800', bgColor: 'bg-indigo-50 border-indigo-200' },
};

// ─── Helper functions ────────────────────────────────────────────────────────

type DangerLevel = 'high' | 'medium' | 'low';

function getDangerLevel(pictograms: GHSClass[]): DangerLevel {
    const highDanger: GHSClass[] = ['toxic', 'corrosive', 'explosive', 'flammable'];
    const medDanger: GHSClass[] = ['harmful', 'oxidizing', 'health_hazard'];
    if (pictograms.some(p => highDanger.includes(p))) return 'high';
    if (pictograms.some(p => medDanger.includes(p))) return 'medium';
    return 'low';
}

const DANGER_STYLES: Record<DangerLevel, { bg: string; text: string; label: string }> = {
    high: { bg: 'bg-red-600', text: 'text-white', label: '⚠️ DANGER ÉLEVÉ' },
    medium: { bg: 'bg-amber-500', text: 'text-white', label: '⚠️ ATTENTION' },
    low: { bg: 'bg-green-600', text: 'text-white', label: '✅ FAIBLE RISQUE' },
};

function getExpiryStatus(dateStr: string | null): 'ok' | 'warning' | 'expired' {
    if (!dateStr) return 'ok';
    const expiry = new Date(dateStr);
    const now = new Date();
    if (expiry < now) return 'expired';
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    if (expiry.getTime() - now.getTime() < sixtyDaysMs) return 'warning';
    return 'ok';
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function Skeleton() {
    return (
        <div className="min-h-screen bg-slate-100 animate-pulse">
            <div className="h-32 bg-slate-300" />
            <div className="max-w-2xl mx-auto p-4 space-y-6">
                <div className="bg-white rounded-xl p-6 space-y-4">
                    <div className="h-6 bg-slate-200 rounded w-2/3" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-4 bg-slate-200 rounded w-2/5" />
                </div>
                <div className="bg-white rounded-xl p-6 space-y-4">
                    <div className="h-6 bg-slate-200 rounded w-1/3" />
                    <div className="flex gap-4">
                        <div className="h-20 w-20 bg-slate-200 rounded" />
                        <div className="h-20 w-20 bg-slate-200 rounded" />
                        <div className="h-20 w-20 bg-slate-200 rounded" />
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 space-y-4">
                    <div className="h-6 bg-slate-200 rounded w-1/2" />
                    <div className="grid grid-cols-2 gap-3">
                        <div className="h-16 bg-slate-200 rounded" />
                        <div className="h-16 bg-slate-200 rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Not Found Page ──────────────────────────────────────────────────────────

function NotFound() {
    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
                <div className="text-6xl mb-4">🔍</div>
                <h1 className="text-xl font-bold text-slate-800 mb-2">Produit introuvable</h1>
                <p className="text-slate-500 mb-6">
                    Ce produit n'existe pas ou a été supprimé de l'inventaire.
                </p>
                <div className="flex flex-col gap-3">
                    <a
                        href="/chimiolab/index.html"
                        className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                    >
                        Retour au site public
                    </a>
                    <Link
                        to="/login"
                        className="inline-block px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                    >
                        Accéder à ChimioLab
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─── Section Card Component ──────────────────────────────────────────────────

function SectionCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-base sm:text-lg font-bold text-slate-800">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function PublicProductPage() {
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [safety, setSafety] = useState<SafetySheet | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Route is wrapped by AuthProvider in App.tsx, so useAuth is always available.
    const { user } = useAuth();
    const isLoggedIn = !!user;

    useEffect(() => {
        if (!id) { setNotFound(true); setLoading(false); return; }

        const fetchData = async () => {
            try {
                setLoading(true);

                const { data: productData, error: productError } = await supabasePublic
                    .from('products')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (productError || !productData) {
                    setNotFound(true);
                    return;
                }
                setProduct(productData);

                const { data: safetyData } = await supabasePublic
                    .from('safety_sheets')
                    .select('*')
                    .eq('product_id', id)
                    .maybeSingle();

                setSafety(safetyData || null);
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Update page title
    useEffect(() => {
        if (product) {
            document.title = `${product.name} | ChimioLab`;
        }
        return () => { document.title = 'ChimioLab'; };
    }, [product]);

    if (loading) return <Skeleton />;
    if (notFound || !product) return <NotFound />;

    const pictograms: GHSClass[] = safety?.pictograms || [];
    const epiList: EpiRequired[] = safety?.epi_required || [];
    const physProps: PhysicalProperties = safety?.physical_properties || {};
    const dangerLevel = getDangerLevel(pictograms);
    const dangerStyle = DANGER_STYLES[dangerLevel];
    const expiryStatus = getExpiryStatus(product.expiry_date);

    return (
        <div className="min-h-screen bg-slate-100">

            {/* ───── TOP BANNER ───── */}
            <div className={`${dangerStyle.bg} ${dangerStyle.text} px-4 py-6 sm:py-8`}>
                <div className="max-w-2xl mx-auto text-center">
                    <div className="text-sm sm:text-base font-bold uppercase tracking-wider mb-2 opacity-90">
                        {dangerStyle.label}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold mb-1">{product.name}</h1>
                    {product.chemical_formula && (
                        <div className="text-lg sm:text-xl font-mono opacity-90">{product.chemical_formula}</div>
                    )}
                </div>
            </div>

            {/* ───── CONTENT ───── */}
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

                {/* SECTION 1: Product Identity */}
                <SectionCard title="🧪 Identification du Produit">
                    <table className="w-full text-sm sm:text-base">
                        <tbody className="divide-y divide-slate-100">
                            <tr><td className="py-2.5 pr-4 font-semibold text-slate-500 whitespace-nowrap">Nom</td><td className="py-2.5 font-bold text-slate-900 text-lg">{product.name}</td></tr>
                            <tr><td className="py-2.5 pr-4 font-semibold text-slate-500 whitespace-nowrap">Formule</td><td className="py-2.5 font-mono text-slate-800">{product.chemical_formula || '—'}</td></tr>
                            <tr><td className="py-2.5 pr-4 font-semibold text-slate-500 whitespace-nowrap">N° CAS</td><td className="py-2.5 text-slate-800">{product.cas_number || '—'}</td></tr>
                            <tr><td className="py-2.5 pr-4 font-semibold text-slate-500 whitespace-nowrap">Fournisseur</td><td className="py-2.5 text-slate-800">{product.supplier || '—'}</td></tr>
                            <tr><td className="py-2.5 pr-4 font-semibold text-slate-500 whitespace-nowrap">Localisation</td><td className="py-2.5 text-slate-800">{product.location || '—'}</td></tr>
                            <tr>
                                <td className="py-2.5 pr-4 font-semibold text-slate-500 whitespace-nowrap">Stock restant</td>
                                <td className="py-2.5 text-slate-800 font-semibold">
                                    {product.quantity} {product.unit}
                                    {product.quantity <= product.min_quantity_alert && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">⚠️ Stock faible</span>
                                    )}
                                </td>
                            </tr>
                            <tr>
                                <td className="py-2.5 pr-4 font-semibold text-slate-500 whitespace-nowrap">Date d'expiration</td>
                                <td className="py-2.5 text-slate-800">
                                    {formatDate(product.expiry_date)}
                                    {expiryStatus === 'expired' && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">🔴 PÉRIMÉ</span>
                                    )}
                                    {expiryStatus === 'warning' && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">⚠️ Expire bientôt</span>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </SectionCard>

                {/* SECTION 2: GHS Hazard Pictograms */}
                <SectionCard title="☣️ Pictogrammes de Danger GHS">
                    {pictograms.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                            {pictograms.map(p => {
                                const config = GHS_PICTOGRAMS[p];
                                if (!config) return null;
                                return (
                                    <GHSDiamond key={p} label={config.label}>
                                        {config.svg}
                                    </GHSDiamond>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-200">
                                ✅ Faible risque — Aucun pictogramme de danger
                            </span>
                        </div>
                    )}
                </SectionCard>

                {/* SECTION 3: Required PPE */}
                <SectionCard title="⚠️ Équipements de Protection Obligatoires">
                    {epiList.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {epiList.map(epi => {
                                const config = EPI_CONFIG[epi];
                                if (!config) return null;
                                return (
                                    <div
                                        key={epi}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${config.bgColor} transition-transform hover:scale-105`}
                                    >
                                        <span className="text-3xl sm:text-4xl">{config.icon}</span>
                                        <span className={`text-xs sm:text-sm font-bold ${config.color} text-center leading-tight`}>{config.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-slate-500">
                            Aucun équipement de protection spécifique requis.
                        </div>
                    )}
                </SectionCard>

                {/* SECTION 4: Physical & Chemical Properties */}
                <SectionCard title="⚗️ Propriétés Physiques et Chimiques">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm sm:text-base">
                            <tbody className="divide-y divide-slate-100">
                                {[
                                    ['Aspect / Couleur', physProps.appearance],
                                    ['pH', physProps.ph],
                                    ['Point d\'ébullition (°C)', physProps.boiling_point],
                                    ['Point de fusion (°C)', physProps.melting_point],
                                    ['Densité (g/ml)', physProps.density],
                                    ['Solubilité dans l\'eau', physProps.solubility_in_water],
                                    ['Point d\'éclair (°C)', physProps.flash_point],
                                    ['Masse molaire (g/mol)', physProps.molecular_weight],
                                ].map(([label, value]) => (
                                    <tr key={label as string}>
                                        <td className="py-2.5 pr-4 font-semibold text-slate-500 whitespace-nowrap">{label as string}</td>
                                        <td className="py-2.5 text-slate-800 font-medium">{value != null && value !== '' ? String(value) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>

                {/* SECTION 5: Storage Rules */}
                <SectionCard title="📦 Règles de Stockage">
                    {safety?.storage_rules ? (
                        <div className="space-y-2 text-sm sm:text-base">
                            {safety.storage_rules.split('\n').filter(Boolean).map((line, i) => {
                                const isNeg = line.startsWith('❌') || line.toLowerCase().includes('ne pas') || line.toLowerCase().includes('interdit');
                                const isWarn = line.startsWith('⚠') || line.toLowerCase().includes('attention') || line.toLowerCase().includes('incompatible');
                                const icon = isNeg ? '❌' : isWarn ? '⚠️' : '✅';
                                const color = isNeg ? 'text-red-700 bg-red-50 border-red-200' : isWarn ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-green-700 bg-green-50 border-green-200';
                                // Strip common leading markers safely (lint-friendly).
                                const cleanLine = line.replace(/^[✅❌⚠]\s*/, '');
                                return (
                                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${color}`}>
                                        <span className="text-lg shrink-0">{icon}</span>
                                        <span className="font-medium">{cleanLine || line}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-slate-500">
                            Aucune règle de stockage spécifiée.
                        </div>
                    )}
                </SectionCard>

                {/* SECTION 6: Emergency Procedures */}
                <SectionCard title="🚨 En Cas d'Accident">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Eyes */}
                        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">👁️</span>
                                <h3 className="font-extrabold text-blue-900 text-sm sm:text-base uppercase">Contact Yeux</h3>
                            </div>
                            <ul className="space-y-1.5 text-sm text-blue-800">
                                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5">→</span> Rincer abondamment à l'eau pendant 15 minutes</li>
                                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5">→</span> Consulter un médecin immédiatement</li>
                            </ul>
                        </div>

                        {/* Skin */}
                        <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">🖐️</span>
                                <h3 className="font-extrabold text-yellow-900 text-sm sm:text-base uppercase">Contact Peau</h3>
                            </div>
                            <ul className="space-y-1.5 text-sm text-yellow-800">
                                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5">→</span> Enlever les vêtements contaminés</li>
                                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5">→</span> Rincer à l'eau savonneuse</li>
                            </ul>
                        </div>

                        {/* Inhalation */}
                        <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">😮</span>
                                <h3 className="font-extrabold text-orange-900 text-sm sm:text-base uppercase">Inhalation</h3>
                            </div>
                            <ul className="space-y-1.5 text-sm text-orange-800">
                                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5">→</span> Transporter à l'air frais immédiatement</li>
                                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5">→</span> Consulter un médecin si symptômes persistent</li>
                            </ul>
                        </div>

                        {/* Fire */}
                        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">🔥</span>
                                <h3 className="font-extrabold text-red-900 text-sm sm:text-base uppercase">En Cas d'Incendie</h3>
                            </div>
                            <ul className="space-y-1.5 text-sm text-red-800">
                                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5">→</span> Utiliser CO₂ ou poudre sèche</li>
                                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5">→</span> Ne jamais utiliser d'eau sur acides concentrés</li>
                            </ul>
                        </div>
                    </div>
                </SectionCard>

                {/* ───── BOTTOM ACTIONS ───── */}
                <div className="flex flex-col gap-3">
                    {safety?.pdf_url ? (
                        <a
                            href={safety.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-bold text-base hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            📥 Télécharger la Fiche FDS complète
                        </a>
                    ) : (
                        <button
                            disabled
                            className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-slate-300 text-slate-500 rounded-xl font-bold text-base cursor-not-allowed"
                        >
                            📥 Fiche FDS — Non disponible
                        </button>
                    )}

                    <a
                        href="/chimiolab/index.html"
                        className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-primary/10 text-primary rounded-xl font-bold text-base hover:bg-primary/20 transition-colors"
                    >
                        🧭 Retour au site public
                    </a>

                    {isLoggedIn && (
                        <Link
                            to="/products"
                            className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-slate-200 text-slate-700 rounded-xl font-bold text-base hover:bg-slate-300 transition-colors"
                        >
                            🔙 Retour à l'inventaire
                        </Link>
                    )}
                </div>

                {/* ───── FOOTER ───── */}
                <footer className="text-center text-xs text-slate-400 pb-6 pt-2 space-y-1">
                    <p className="font-semibold">ChimioLab — CRMEF Derb Ghallef</p>
                    <p>Informations mises à jour automatiquement</p>
                    <p>Dernière mise à jour : {new Date(product.created_at).toLocaleString('fr-FR')}</p>
                </footer>
            </div>
        </div>
    );
}
