import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { AlertTriangle, Calendar, Clock, Package } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { StatCard } from '../components/dashboard/StatCard';
import { AlertsList } from '../components/dashboard/AlertsList';
import type { Alert, TPSession } from '../types/database';

interface ProductMetricRow {
    id: string;
    quantity: number;
    min_quantity_alert: number;
    expiry_date: string | null;
}

interface SafetySheetRow {
    product_id: string;
    pdf_url: string | null;
}

interface ConsumptionProductRelation {
    name: string;
}

interface ConsumptionLogRelation {
    product_id: string;
    quantity_used: number;
    logged_at: string;
    products: ConsumptionProductRelation | ConsumptionProductRelation[] | null;
}

interface ConsumptionLog {
    product_id: string;
    quantity_used: number;
    logged_at: string;
    products: ConsumptionProductRelation | null;
}

interface DashboardStats {
    totalProducts: number;
    lowStock: number;
    missingFds: number;
    expiringSoon: number;
    sessionsThisWeek: number;
}

const DEFAULT_STATS: DashboardStats = {
    totalProducts: 0,
    lowStock: 0,
    missingFds: 0,
    expiringSoon: 0,
    sessionsThisWeek: 0,
};

function normalizeConsumptionLog(raw: ConsumptionLogRelation): ConsumptionLog {
    const relation = raw.products;
    const product = Array.isArray(relation) ? (relation[0] || null) : relation;

    return {
        product_id: raw.product_id,
        quantity_used: raw.quantity_used,
        logged_at: raw.logged_at,
        products: product,
    };
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [upcomingSessions, setUpcomingSessions] = useState<TPSession[]>([]);
    const [topConsumedData, setTopConsumedData] = useState<Array<{ name: string; used: number }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const now = new Date();
            const todayStart = startOfDay(now);
            const weekEnd = endOfDay(addDays(todayStart, 6));
            const sixtyDaysAhead = addDays(todayStart, 60);
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            const [
                productsRes,
                safetyRes,
                sessionsRes,
                alertsRes,
                consumptionRes,
            ] = await Promise.all([
                supabase
                    .from('products')
                    .select('id, quantity, min_quantity_alert, expiry_date'),
                supabase
                    .from('safety_sheets')
                    .select('product_id, pdf_url'),
                supabase
                    .from('tp_sessions')
                    .select('*')
                    .order('date', { ascending: true }),
                supabase
                    .from('alerts')
                    .select('*')
                    .eq('is_resolved', false)
                    .order('created_at', { ascending: false })
                    .limit(5),
                supabase
                    .from('tp_consumption_logs')
                    .select(`
                        product_id,
                        quantity_used,
                        logged_at,
                        products:product_id (
                            name
                        )
                    `)
                    .order('logged_at', { ascending: false }),
            ]);

            const products = productsRes.error ? [] : ((productsRes.data || []) as ProductMetricRow[]);
            const safetySheets = safetyRes.error ? [] : ((safetyRes.data || []) as SafetySheetRow[]);
            const sessions = sessionsRes.error ? [] : ((sessionsRes.data || []) as TPSession[]);
            const activeAlerts = alertsRes.error ? [] : ((alertsRes.data || []) as Alert[]);
            const consumptionLogs = consumptionRes.error
                ? []
                : ((consumptionRes.data || []) as ConsumptionLogRelation[]).map(normalizeConsumptionLog);

            const fdsByProduct = new Set(
                safetySheets.filter((sheet) => !!sheet.pdf_url).map((sheet) => sheet.product_id)
            );

            const upcomingWeekSessions = sessions.filter((session) => {
                const sessionDate = startOfDay(new Date(session.date));
                return sessionDate >= todayStart && sessionDate <= weekEnd;
            });

            const expiringSoon = products.filter((product) => {
                if (!product.expiry_date) return false;
                const expiry = startOfDay(new Date(product.expiry_date));
                return expiry >= todayStart && expiry <= sixtyDaysAhead;
            }).length;

            const lowStock = products.filter(
                (product) => Number(product.quantity) <= Number(product.min_quantity_alert)
            ).length;

            const missingFds = products.filter((product) => !fdsByProduct.has(product.id)).length;

            const monthConsumptionLogs = consumptionLogs.filter(
                (log) => new Date(log.logged_at) >= monthStart
            );

            const consumptionByProduct = new Map<string, { name: string; used: number }>();
            monthConsumptionLogs.forEach((log) => {
                const productName = log.products?.name || 'Produit';
                const existing = consumptionByProduct.get(log.product_id);
                if (existing) {
                    existing.used += Number(log.quantity_used);
                } else {
                    consumptionByProduct.set(log.product_id, {
                        name: productName,
                        used: Number(log.quantity_used),
                    });
                }
            });

            const topConsumed = Array.from(consumptionByProduct.values())
                .sort((a, b) => b.used - a.used)
                .slice(0, 6)
                .map((item) => ({ name: item.name, used: Number(item.used.toFixed(2)) }));

            setStats({
                totalProducts: products.length,
                lowStock,
                missingFds,
                expiringSoon,
                sessionsThisWeek: upcomingWeekSessions.length,
            });

            setAlerts(activeAlerts);
            setUpcomingSessions(upcomingWeekSessions);
            setTopConsumedData(topConsumed);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
                    <p className="text-slate-500 font-medium">Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            {/* Title + quick actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
                    <p className="text-base text-slate-500 mt-1">Vue d'ensemble de votre laboratoire</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/products/new')}
                        className="px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark font-semibold transition-colors cursor-pointer text-[15px]"
                    >
                        + Nouveau produit
                    </button>
                    <button
                        onClick={() => navigate('/tp-sessions/new')}
                        className="px-5 py-3 bg-white text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 font-semibold transition-colors cursor-pointer text-[15px]"
                    >
                        + Nouvelle séance TP
                    </button>
                </div>
            </div>

            {/* 4 essential stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatCard
                    title="Total Produits"
                    value={stats.totalProducts}
                    icon={Package}
                    colorClass="text-accent"
                    onClick={() => navigate('/products')}
                />
                <StatCard
                    title="Stock faible"
                    value={stats.lowStock}
                    icon={AlertTriangle}
                    colorClass="text-orange-500"
                    onClick={() => navigate('/products?filter=low-stock')}
                />
                <StatCard
                    title="Expire bientôt"
                    value={stats.expiringSoon}
                    icon={Clock}
                    colorClass="text-amber-500"
                    onClick={() => navigate('/alerts')}
                />
                <StatCard
                    title="Séances cette semaine"
                    value={stats.sessionsThisWeek}
                    icon={Calendar}
                    colorClass="text-primary"
                    onClick={() => navigate('/tp-sessions')}
                />
            </div>

            {/* Main content: 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column — sessions + chart */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Upcoming sessions */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-slate-800">Séances TP à venir</h3>
                            <button
                                type="button"
                                onClick={() => navigate('/tp-sessions')}
                                className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
                            >
                                Voir tout →
                            </button>
                        </div>
                        {upcomingSessions.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                                <p className="text-base">Aucune séance prévue cette semaine</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingSessions.slice(0, 5).map((session) => (
                                    <button
                                        key={session.id}
                                        type="button"
                                        onClick={() => navigate(`/tp-sessions/${session.id}`)}
                                        className="w-full text-left flex items-center justify-between px-5 py-4 rounded-xl border border-slate-200 hover:border-primary/40 hover:bg-slate-50 transition-colors"
                                    >
                                        <div>
                                            <p className="font-semibold text-slate-800 text-[15px]">{session.title}</p>
                                            <p className="text-sm text-slate-500 mt-0.5">
                                                {session.level} · {session.student_count} élève(s)
                                            </p>
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                                            {new Date(session.date).toLocaleDateString('fr-FR')}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Consumption chart */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-5">Consommation du mois</h3>
                        {topConsumedData.length === 0 ? (
                            <div className="h-48 flex items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                Aucune consommation enregistrée ce mois-ci
                            </div>
                        ) : (
                            <div className="h-64 w-full">
                                <ResponsiveContainer key={topConsumedData.length} width="100%" height="100%" minHeight={256}>
                                    <BarChart data={topConsumedData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={52} fontSize={13} />
                                        <YAxis axisLine={false} tickLine={false} fontSize={13} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                        <Bar dataKey="used" fill="#3498db" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column — alerts + quick actions */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <AlertsList alerts={alerts} />

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-5">Actions rapides</h3>
                        <div className="flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/products?filter=low-stock')}
                                className="w-full px-5 py-3.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[15px] font-semibold hover:bg-amber-100 transition-colors text-left"
                            >
                                ⚠️ Voir les produits en stock faible
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/products?filter=missing-fds')}
                                className="w-full px-5 py-3.5 bg-red-50 text-red-800 border border-red-200 rounded-xl text-[15px] font-semibold hover:bg-red-100 transition-colors text-left"
                            >
                                📋 Compléter les FDS manquantes ({stats.missingFds})
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/tp-sessions/new')}
                                className="w-full px-5 py-3.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-[15px] font-semibold hover:bg-blue-100 transition-colors text-left"
                            >
                                📝 Préparer une séance TP
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
