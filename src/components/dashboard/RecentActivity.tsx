import type { ActivityLog } from '../../types/database';

interface RecentActivityProps {
    logs: ActivityLog[];
}

export function RecentActivity({ logs }: RecentActivityProps) {
    if (logs.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Activité récente</h3>
                <p className="text-sm text-slate-500 text-center py-4">Aucune activité récente.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-semibold text-slate-800">Activité récente</h3>
            </div>
            <div className="p-0">
                <div className="divide-y divide-slate-100">
                    {logs.map((log) => (
                        <div key={log.id} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                            <div>
                                <p className="text-sm text-slate-800">
                                    <span className="font-semibold">{log.user_id}</span> {log.action}{' '}
                                    {log.details && <span className="text-slate-500">{log.details}</span>}
                                </p>
                                <span className="text-xs text-slate-400 mt-1 block">
                                    {new Date(log.created_at).toLocaleString('fr-FR')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
