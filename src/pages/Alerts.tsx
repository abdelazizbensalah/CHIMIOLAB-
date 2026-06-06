import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Alert } from '../types/database';
import { AlertTriangle, CheckCircle2, Search, Clock, ShieldAlert, PackageMinus } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AlertProductPreview {
    id: string;
    name: string;
    cas_number: string | null;
    location: string | null;
}

interface AlertWithProduct extends Alert {
    products: AlertProductPreview | null;
}

interface ProductAlertSource {
    id: string;
    name: string;
    quantity: number;
    min_quantity_alert: number;
    unit: string;
    expiry_date: string | null;
}

type StatusFilter = 'all' | 'active' | 'resolved';
type TypeFilter = 'all' | Alert['type'];
type SeverityFilter = 'all' | Alert['severity'];

const TYPE_FILTER_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
    { value: 'all', label: 'Tous les types' },
    { value: 'low_stock', label: 'Stock faible' },
    { value: 'missing_fds', label: 'FDS manquante' },
    { value: 'expired', label: 'Péremption' },
    { value: 'incompatibility', label: 'Incompatibilité' },
];

const SEVERITY_FILTER_OPTIONS: Array<{ value: SeverityFilter; label: string }> = [
    { value: 'all', label: 'Toutes gravités' },
    { value: 'red', label: 'Critique (rouge)' },
    { value: 'orange', label: 'Moyenne (orange)' },
    { value: 'yellow', label: 'Faible (jaune)' },
];

export default function Alerts() {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<AlertWithProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

    useEffect(() => {
        void refreshAlerts();
    }, []);

    const fetchAlertsList = async () => {
        try {
            const { data, error } = await supabase
                .from('alerts')
                .select(`
                    *,
                    products (
                        id,
                        name,
                        cas_number,
                        location
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAlerts((data as AlertWithProduct[]) || []);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        }
    };

    const syncSystemAlerts = async () => {
        setSyncing(true);
        try {
            const [productsRes, safetyRes, alertsRes] = await Promise.all([
                supabase
                    .from('products')
                    .select('id, name, quantity, min_quantity_alert, unit, expiry_date'),
                supabase
                    .from('safety_sheets')
                    .select('product_id, pdf_url'),
                supabase
                    .from('alerts')
                    .select('id, product_id, type, severity, message, is_resolved'),
            ]);

            if (productsRes.error) throw productsRes.error;
            if (safetyRes.error) throw safetyRes.error;
            if (alertsRes.error) throw alertsRes.error;

            const products = (productsRes.data || []) as ProductAlertSource[];
            const safetySheets = safetyRes.data || [];
            const existingAlerts = (alertsRes.data || []) as Array<Pick<Alert, 'id' | 'product_id' | 'type' | 'severity' | 'message' | 'is_resolved'>>;

            const fdsByProduct = new Set(
                safetySheets.filter((sheet) => !!sheet.pdf_url).map((sheet) => sheet.product_id)
            );

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const desiredAlerts = new Map<string, { product_id: string; type: Alert['type']; severity: Alert['severity']; message: string }>();

            products.forEach((product) => {
                const quantity = Number(product.quantity);
                const minQuantity = Number(product.min_quantity_alert);

                if (quantity <= minQuantity) {
                    desiredAlerts.set(`low_stock:${product.id}`, {
                        product_id: product.id,
                        type: 'low_stock',
                        severity: 'orange',
                        message: `Stock faible: ${product.name} (${quantity} ${product.unit}) sous le seuil (${minQuantity} ${product.unit})`,
                    });
                }

                if (!fdsByProduct.has(product.id)) {
                    desiredAlerts.set(`missing_fds:${product.id}`, {
                        product_id: product.id,
                        type: 'missing_fds',
                        severity: 'yellow',
                        message: `FDS manquante pour ${product.name}`,
                    });
                }

                if (product.expiry_date) {
                    const expiry = new Date(product.expiry_date);
                    expiry.setHours(0, 0, 0, 0);
                    if (expiry < today) {
                        desiredAlerts.set(`expired:${product.id}`, {
                            product_id: product.id,
                            type: 'expired',
                            severity: 'red',
                            message: `Produit périmé: ${product.name} (date: ${product.expiry_date})`,
                        });
                    }
                }
            });

            const systemAlertTypes: Alert['type'][] = ['low_stock', 'missing_fds', 'expired'];
            const existingByKey = new Map<string, Array<Pick<Alert, 'id' | 'product_id' | 'type' | 'severity' | 'message' | 'is_resolved'>>>();

            existingAlerts
                .filter((alert) => systemAlertTypes.includes(alert.type))
                .forEach((alert) => {
                    const key = `${alert.type}:${alert.product_id}`;
                    const list = existingByKey.get(key) || [];
                    list.push(alert);
                    existingByKey.set(key, list);
                });

            for (const [key, desired] of desiredAlerts.entries()) {
                const existing = existingByKey.get(key) || [];
                const active = existing.find((alert) => !alert.is_resolved);

                if (active) {
                    if (active.message !== desired.message || active.severity !== desired.severity) {
                        await supabase
                            .from('alerts')
                            .update({
                                message: desired.message,
                                severity: desired.severity,
                            })
                            .eq('id', active.id);
                    }

                    const duplicates = existing.filter((alert) => alert.id !== active.id && !alert.is_resolved);
                    for (const duplicate of duplicates) {
                        await supabase.from('alerts').update({ is_resolved: true }).eq('id', duplicate.id);
                    }
                    continue;
                }

                const resolved = existing.find((alert) => alert.is_resolved);
                if (resolved) {
                    await supabase
                        .from('alerts')
                        .update({
                            is_resolved: false,
                            message: desired.message,
                            severity: desired.severity,
                        })
                        .eq('id', resolved.id);
                    continue;
                }

                await supabase.from('alerts').insert([desired]);
            }

            for (const [key, existing] of existingByKey.entries()) {
                if (desiredAlerts.has(key)) continue;
                const activeToResolve = existing.filter((alert) => !alert.is_resolved);
                for (const alert of activeToResolve) {
                    await supabase.from('alerts').update({ is_resolved: true }).eq('id', alert.id);
                }
            }
        } catch (error) {
            console.error('Error syncing system alerts:', error);
        } finally {
            setSyncing(false);
        }
    };

    const refreshAlerts = async () => {
        setLoading(true);
        try {
            await syncSystemAlerts();
            await fetchAlertsList();
        } finally {
            setLoading(false);
        }
    };

    const markAsResolved = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('alerts')
                .update({ is_resolved: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            setAlerts((prev) =>
                prev.map((alert) =>
                    alert.id === id ? { ...alert, is_resolved: !currentStatus } : alert
                )
            );
            await refreshAlerts();
        } catch (error) {
            console.error('Error resolving alert:', error);
            alert('Erreur lors de la mise à jour de l\'alerte');
        }
    };

    const deleteAlert = async (id: string) => {
        if (!window.confirm('Voulez-vous vraiment supprimer cette alerte définitivement ?')) return;
        try {
            const { error } = await supabase
                .from('alerts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setAlerts((prev) => prev.filter((alert) => alert.id !== id));
            await refreshAlerts();
        } catch (error) {
            console.error('Error deleting alert:', error);
            alert('Erreur lors de la suppression de l\'alerte');
        }
    };

    const summary = useMemo(() => {
        const active = alerts.filter((alert) => !alert.is_resolved);
        return {
            activeCount: active.length,
            redCount: active.filter((alert) => alert.severity === 'red').length,
            missingFdsCount: active.filter((alert) => alert.type === 'missing_fds').length,
            lowStockCount: active.filter((alert) => alert.type === 'low_stock').length,
        };
    }, [alerts]);

    const filteredAlerts = alerts.filter((alert) => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const matchesSearch =
            normalizedQuery.length === 0 ||
            alert.message.toLowerCase().includes(normalizedQuery) ||
            alert.products?.name.toLowerCase().includes(normalizedQuery) ||
            alert.products?.cas_number?.toLowerCase().includes(normalizedQuery) ||
            alert.products?.location?.toLowerCase().includes(normalizedQuery);

        if (!matchesSearch) return false;
        if (statusFilter === 'active' && alert.is_resolved) return false;
        if (statusFilter === 'resolved' && !alert.is_resolved) return false;
        if (typeFilter !== 'all' && alert.type !== typeFilter) return false;
        if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
        return true;
    });

    const getAlertIcon = (type: Alert['type']) => {
        switch (type) {
            case 'expired': return <Clock className="w-5 h-5" />;
            case 'low_stock': return <PackageMinus className="w-5 h-5" />;
            case 'missing_fds': return <ShieldAlert className="w-5 h-5" />;
            case 'incompatibility': return <AlertTriangle className="w-5 h-5" />;
            default: return <AlertTriangle className="w-5 h-5" />;
        }
    };

    const getAlertColor = (severity: Alert['severity'], isResolved: boolean) => {
        if (isResolved) return 'bg-slate-50 text-slate-500 border-slate-200';
        switch (severity) {
            case 'red': return 'bg-red-50 text-red-700 border-red-200';
            case 'orange': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'yellow': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const getAlertIconColor = (severity: Alert['severity'], isResolved: boolean) => {
        if (isResolved) return 'text-slate-400';
        switch (severity) {
            case 'red': return 'text-red-500';
            case 'orange': return 'text-orange-500';
            case 'yellow': return 'text-yellow-500';
            default: return 'text-slate-500';
        }
    };

    const getAlertLabel = (type: Alert['type']) => {
        switch (type) {
            case 'expired': return 'Péremption';
            case 'low_stock': return 'Stock faible';
            case 'missing_fds': return 'FDS manquante';
            case 'incompatibility': return 'Incompatibilité';
            default: return 'Alerte';
        }
    };

    const getSeverityLabel = (severity: Alert['severity']) => {
        if (severity === 'red') return 'Critique';
        if (severity === 'orange') return 'Moyenne';
        return 'Faible';
    };

    const getRecommendedAction = (type: Alert['type']) => {
        switch (type) {
            case 'low_stock': return 'Action: ajuster le stock ou commander le réactif';
            case 'missing_fds': return 'Action: ajouter ou remplacer la FDS';
            case 'expired': return 'Action: isoler le produit et traiter le périmé';
            case 'incompatibility': return 'Action: vérifier et corriger le stockage';
            default: return 'Action: vérifier le produit concerné';
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Alertes et Notifications</h1>
                    <p className="text-sm text-slate-500 mt-1">Priorisez les actions de sécurité et de préparation laboratoire</p>
                </div>
                <button
                    type="button"
                    onClick={() => void refreshAlerts()}
                    disabled={syncing || loading}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {syncing ? 'Synchronisation...' : 'Synchroniser'}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Actives</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{summary.activeCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Critiques</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{summary.redCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">FDS manquantes</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{summary.missingFdsCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Stocks faibles</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">{summary.lowStockCount}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
                <div className="p-4 border-b border-slate-200 flex flex-col gap-4 bg-slate-50">
                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${statusFilter === 'active' ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`}
                        >
                            Alertes actives ({summary.activeCount})
                        </button>
                        <button
                            onClick={() => setStatusFilter('resolved')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${statusFilter === 'resolved' ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`}
                        >
                            Résolues
                        </button>
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${statusFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`}
                        >
                            Toutes
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="relative md:col-span-2">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher message, produit, CAS, localisation..."
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>

                        <select
                            value={typeFilter}
                            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                        >
                            {TYPE_FILTER_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={severityFilter}
                            onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                        >
                            {SEVERITY_FILTER_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                            <p>Chargement des alertes...</p>
                        </div>
                    ) : filteredAlerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                            <CheckCircle2 className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="text-lg font-medium text-slate-700">Aucune alerte trouvée</p>
                            <p className="text-sm mt-1">Ajuste les filtres ou vérifie les dernières données.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredAlerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-all ${getAlertColor(alert.severity, alert.is_resolved)} ${!alert.is_resolved ? 'shadow-sm' : 'opacity-75'}`}
                                >
                                    <div className={`p-3 rounded-full bg-white shadow-sm ${getAlertIconColor(alert.severity, alert.is_resolved)}`}>
                                        {getAlertIcon(alert.type)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <span className="font-semibold text-sm uppercase tracking-wider opacity-80">
                                                {getAlertLabel(alert.type)}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/70 border border-current/20">
                                                {getSeverityLabel(alert.severity)}
                                            </span>
                                            <span className="text-xs opacity-70">
                                                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: fr })}
                                            </span>
                                            <span className="text-xs opacity-60">
                                                ({format(new Date(alert.created_at), 'dd MMM yyyy, HH:mm', { locale: fr })})
                                            </span>
                                        </div>

                                        <p className={`font-medium text-base mb-1 ${alert.is_resolved ? 'line-through opacity-70' : ''}`}>
                                            {alert.message}
                                        </p>

                                        {alert.products && (
                                            <div className="text-sm opacity-90 flex flex-wrap items-center gap-2 mb-1">
                                                <span className="font-semibold text-slate-900 bg-white/60 px-2 py-0.5 rounded text-xs border border-slate-200/60">
                                                    {alert.products.name}
                                                </span>
                                                <span className="font-mono text-xs">CAS: {alert.products.cas_number || 'N/A'}</span>
                                                <span className="text-xs">Localisation: {alert.products.location || 'N/A'}</span>
                                            </div>
                                        )}

                                        <p className="text-xs opacity-80">
                                            {getRecommendedAction(alert.type)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-4 sm:flex-col sm:items-end">
                                        {alert.product_id && (
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/products/${alert.product_id}/edit`)}
                                                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border w-full sm:w-auto bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                                            >
                                                Voir produit
                                            </button>
                                        )}
                                        <button
                                            onClick={() => markAsResolved(alert.id, alert.is_resolved)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border w-full sm:w-auto ${alert.is_resolved
                                                ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                                                : 'bg-white border-green-200 text-green-700 hover:bg-green-50 shadow-sm'
                                                }`}
                                        >
                                            {alert.is_resolved ? 'Réactiver' : 'Marquer résolu'}
                                        </button>
                                        {alert.is_resolved && (
                                            <button
                                                onClick={() => deleteAlert(alert.id)}
                                                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-colors w-full sm:w-auto"
                                            >
                                                Supprimer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
