import { Calendar } from 'lucide-react';
import type { TPSession } from '../../types/database';

interface UpcomingSessionsProps {
    sessions: TPSession[];
}

export function UpcomingSessions({ sessions }: UpcomingSessionsProps) {
    if (sessions.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" /> Sessions TP à venir
                </h3>
                <p className="text-sm text-slate-500 text-center py-4">Aucune session programmée.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" /> Sessions TP à venir
                </h3>
                <span className="text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full font-medium">
                    {sessions.length} plannifiées
                </span>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col gap-3">
                    {sessions.map((session) => (
                        <div key={session.id} className="p-3 border border-slate-100 rounded-lg hover:border-primary-light/50 transition-colors group">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-slate-800 group-hover:text-primary transition-colors">{session.title}</h4>
                                <div className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                    {session.level}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{new Date(session.date).toLocaleDateString('fr-FR')}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-medium">{session.duration_minutes} min</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
