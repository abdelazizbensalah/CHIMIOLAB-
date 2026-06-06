import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { TPSession } from '../types/database';
import { Calendar as CalendarIcon, Plus, Search, Filter, Edit, Trash2, Clock, CheckCircle2, Circle, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TpSessions() {
    const [sessions, setSessions] = useState<TPSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedSession, setSelectedSession] = useState<TPSession | null>(null);

    // Group sessions by date string for calendar lookup
    const sessionsByDate = useMemo(() => {
        const map: Record<string, TPSession[]> = {};
        sessions.forEach(s => {
            const key = format(new Date(s.date), 'yyyy-MM-dd');
            if (!map[key]) map[key] = [];
            map[key].push(s);
        });
        return map;
    }, [sessions]);

    // Generate calendar grid days
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days: Date[] = [];
        let day = calStart;
        while (day <= calEnd) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    }, [currentMonth]);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('tp_sessions')
                .select('*')
                .order('date', { ascending: true }); // By default, upcoming first

            if (error) throw error;
            setSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette session TP ?')) return;

        try {
            const { error } = await supabase
                .from('tp_sessions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSessions(sessions.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting session:', error);
            alert('Erreur lors de la suppression');
        }
    };

    const toggleStatus = async (session: TPSession) => {
        const newStatus = session.status === 'planned' ? 'done' : 'planned';
        try {
            const { error } = await supabase
                .from('tp_sessions')
                .update({ status: newStatus })
                .eq('id', session.id);

            if (error) throw error;

            setSessions(sessions.map(s =>
                s.id === session.id ? { ...s, status: newStatus } : s
            ));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Erreur lors de la mise à jour du statut');
        }
    };

    const filteredSessions = sessions.filter((session) => {
        const query = searchQuery.toLowerCase();
        return (
            session.title.toLowerCase().includes(query) ||
            session.code.toLowerCase().includes(query) ||
            session.level.toLowerCase().includes(query)
        );
    });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Sessions TP</h1>
                    <p className="text-sm text-slate-500 mt-1">Planifiez et gérez les travaux pratiques</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-white border border-slate-300 rounded-lg p-1 flex">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Liste
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CalendarIcon className="w-4 h-4 inline-block mr-1" />
                            Calendrier
                        </button>
                    </div>

                    <Link
                        to="/tp-sessions/new"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Nouvelle session
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50">
                    <div className="relative w-full sm:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher par code, titre ou niveau..."
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors w-full sm:w-auto">
                        <Filter className="w-4 h-4" />
                        Filtres
                    </button>
                </div>

                {viewMode === 'list' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">Status</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Session</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Heure</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Niveau / Élèves</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-500">
                                            <div className="flex justify-center mb-2">
                                                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                                            </div>
                                            Chargement des sessions...
                                        </td>
                                    </tr>
                                ) : filteredSessions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-500">
                                            Aucune session TP trouvée.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSessions.map((session) => (
                                        <tr key={session.id} className={`transition-colors ${session.status === 'done' ? 'bg-slate-50 opacity-75' : 'hover:bg-slate-50'}`}>
                                            <td className="py-4 px-4 text-center">
                                                <button
                                                    onClick={() => toggleStatus(session)}
                                                    className="focus:outline-none"
                                                    title={session.status === 'done' ? 'Marquer comme planifié' : 'Marquer comme terminé'}
                                                >
                                                    {session.status === 'done' ? (
                                                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                                                    ) : (
                                                        <Circle className="w-6 h-6 text-slate-300 hover:text-green-500 transition-colors" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/10">
                                                        {session.code}
                                                    </span>
                                                    <div className="font-semibold text-slate-800 text-base">{session.title}</div>
                                                </div>
                                                {session.objectives && (
                                                    <div className="text-sm text-slate-500 truncate max-w-xs md:max-w-md mt-0.5" title={session.objectives}>
                                                        {session.objectives}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center text-slate-700 text-sm mb-1">
                                                    <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                                                    {format(new Date(session.date), 'dd MMMM yyyy', { locale: fr })}
                                                </div>
                                                <div className="flex items-center text-slate-500 text-sm mb-1">
                                                    <Clock className="w-4 h-4 mr-2 text-slate-400" />
                                                    {session.start_time ? session.start_time.slice(0, 5) : ''} - {session.end_time ? session.end_time.slice(0, 5) : ''} ({session.duration_minutes} min)
                                                </div>
                                                {session.room && (
                                                    <div className="flex items-center text-slate-500 text-sm">
                                                        <span className="w-4 h-4 mr-2 inline-flex items-center justify-center text-slate-400">🏫</span>
                                                        {session.room}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="text-sm text-slate-600 capitalize font-medium">
                                                    Niveau {session.level}
                                                </div>
                                                <div className="text-sm text-slate-500 mt-1">
                                                    {session.student_count} élève(s)
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        to={`/tp-sessions/${session.id}`}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
                                                        title="Voir la séance complète"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        Voir
                                                    </Link>
                                                    <Link
                                                        to={`/tp-sessions/${session.id}`}
                                                        className="p-1.5 text-slate-400 hover:text-primary transition-colors rounded"
                                                        title="Gerer la seance"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(session.id)}
                                                        className="p-1.5 text-slate-400 hover:text-danger transition-colors rounded"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-4">
                        {/* Calendar Header with Navigation */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                                <h2 className="text-lg font-bold text-slate-800 capitalize ml-2">
                                    {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                                </h2>
                            </div>
                            <button
                                onClick={() => setCurrentMonth(new Date())}
                                className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                            >
                                Aujourd'hui
                            </button>
                        </div>

                        {/* Day-of-week headers */}
                        <div className="grid grid-cols-7 mb-1">
                            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                                <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 border-t border-l border-slate-200">
                            {calendarDays.map((day, idx) => {
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const daySessions = sessionsByDate[dateKey] || [];
                                const inCurrentMonth = isSameMonth(day, currentMonth);
                                const today = isToday(day);
                                const isSelected = selectedSession && isSameDay(new Date(selectedSession.date), day);

                                return (
                                    <div
                                        key={idx}
                                        className={`
                                            min-h-[100px] border-r border-b border-slate-200 p-1.5 transition-colors
                                            ${!inCurrentMonth ? 'bg-slate-50/60' : 'bg-white'}
                                            ${today ? 'bg-blue-50/50' : ''}
                                            ${isSelected ? 'ring-2 ring-inset ring-primary/40' : ''}
                                        `}
                                    >
                                        {/* Day number */}
                                        <div className={`
                                            text-sm font-medium mb-1 flex items-center justify-center w-7 h-7 rounded-full
                                            ${today ? 'bg-primary text-white' : ''}
                                            ${!inCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                                        `}>
                                            {format(day, 'd')}
                                        </div>

                                        {/* Session pills */}
                                        <div className="flex flex-col gap-0.5">
                                            {daySessions.slice(0, 3).map(session => (
                                                <button
                                                    key={session.id}
                                                    onClick={() => setSelectedSession(selectedSession?.id === session.id ? null : session)}
                                                    className={`
                                                        w-full text-left px-1.5 py-0.5 rounded text-xs truncate font-medium transition-all cursor-pointer
                                                        ${session.status === 'done'
                                                            ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200'
                                                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200'
                                                        }
                                                        ${selectedSession?.id === session.id ? 'ring-1 ring-offset-1 ring-primary' : ''}
                                                    `}
                                                    title={session.title}
                                                >
                                                    {session.title}
                                                </button>
                                            ))}
                                            {daySessions.length > 3 && (
                                                <span className="text-xs text-slate-400 pl-1">+{daySessions.length - 3} de plus</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Selected session detail panel */}
                        {selectedSession && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-800">{selectedSession.title}</h3>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/10">
                                                {selectedSession.code}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <CalendarIcon className="w-4 h-4 text-slate-400" />
                                                {format(new Date(selectedSession.date), 'dd MMMM yyyy', { locale: fr })}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                                {selectedSession.start_time ? selectedSession.start_time.slice(0, 5) : ''} - {selectedSession.end_time ? selectedSession.end_time.slice(0, 5) : ''}
                                            </span>
                                            {selectedSession.room && (
                                                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                                    🏫 {selectedSession.room}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-sm text-slate-600 capitalize">Niveau {selectedSession.level}</span>
                                            <span className="text-sm text-slate-600">{selectedSession.student_count} élève(s)</span>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedSession.status === 'done'
                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                }`}>
                                                {selectedSession.status === 'done' ? '✓ Terminé' : '○ Planifié'}
                                            </span>
                                        </div>
                                        {selectedSession.objectives && (
                                            <p className="mt-2 text-sm text-slate-500">{selectedSession.objectives}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-4 shrink-0">
                                        <Link
                                            to={`/tp-sessions/${selectedSession.id}`}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-white transition-colors"
                                            title="Voir la séance complète"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            Voir
                                        </Link>
                                        <button
                                            onClick={() => toggleStatus(selectedSession)}
                                            className="p-2 text-slate-400 hover:text-green-500 transition-colors rounded-lg hover:bg-white"
                                            title={selectedSession.status === 'done' ? 'Marquer comme planifié' : 'Marquer comme terminé'}
                                        >
                                            {selectedSession.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5" />}
                                        </button>
                                        <Link
                                            to={`/tp-sessions/${selectedSession.id}`}
                                            className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-white"
                                            title="Gerer la seance"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </Link>
                                        <button
                                            onClick={() => {
                                                handleDelete(selectedSession.id);
                                                setSelectedSession(null);
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-white"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'list' && !loading && filteredSessions.length > 0 && (
                    <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 bg-slate-50">
                        <div>
                            Affichage de <span className="font-medium text-slate-900">{filteredSessions.length}</span> session(s)
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
