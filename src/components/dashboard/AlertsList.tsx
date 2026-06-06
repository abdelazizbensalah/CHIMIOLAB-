import { AlertTriangle, Clock, ServerCrash } from 'lucide-react';
import type { Alert } from '../../types/database';

interface AlertsListProps {
    alerts: Alert[];
}

export function AlertsList({ alerts }: AlertsListProps) {
    if (alerts.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Alertes actives</h3>
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p>Aucune alerte pour le moment. Tout va bien !</p>
                </div>
            </div>
        );
    }

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'expired': return <Clock className="w-5 h-5 text-red-500" />;
            case 'missing_fds': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'incompatibility': return <ServerCrash className="w-5 h-5 text-red-600" />;
            case 'low_stock': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
            default: return <AlertTriangle className="w-5 h-5 text-slate-500" />;
        }
    };

    const getAlertBg = (severity: string) => {
        if (severity === 'red') return 'bg-red-50 border-red-100';
        if (severity === 'orange') return 'bg-orange-50 border-orange-100';
        return 'bg-yellow-50 border-yellow-100';
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Alertes actives
                </h3>
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">{alerts.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                <div className="flex flex-col gap-2">
                    {alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`p-4 rounded-lg border ${getAlertBg(alert.severity)} flex gap-3 items-start transition-colors`}
                        >
                            <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                            <div>
                                <p className={`text-sm font-medium ${alert.severity === 'red' ? 'text-red-800' :
                                        alert.severity === 'orange' ? 'text-orange-800' : 'text-yellow-800'
                                    }`}>
                                    {alert.message}
                                </p>
                                <span className="text-xs text-slate-500 mt-1 block">
                                    {new Date(alert.created_at).toLocaleDateString('fr-FR')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
