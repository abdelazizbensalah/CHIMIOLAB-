import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Building } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Room } from '../types/database';

export default function Rooms() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [newRoomName, setNewRoomName] = useState('');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setRooms(data || []);
        } catch (err) {
            console.error('Error fetching rooms:', err);
            setError('Impossible de charger les salles');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newRoomName.trim();
        if (!trimmedName) return;

        try {
            setAdding(true);
            setError('');
            
            const { data, error } = await supabase
                .from('rooms')
                .insert([{ name: trimmedName }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    throw new Error('Une salle avec ce nom existe déjà.');
                }
                throw error;
            }

            setRooms(prev => [...prev, data as Room].sort((a, b) => a.name.localeCompare(b.name)));
            setNewRoomName('');
        } catch (err: any) {
            console.error('Error adding room:', err);
            setError(err.message || 'Erreur lors de l\'ajout de la salle');
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteRoom = async (id: string, name: string) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la salle "${name}" ?`)) return;

        try {
            const { error } = await supabase
                .from('rooms')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setRooms(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            console.error('Error deleting room:', err);
            setError('Erreur lors de la suppression de la salle');
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Salles du Centre</h1>
                <p className="text-sm text-slate-500 mt-1">Gérez les salles pour attribuer des lieux aux séances TP</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <Building className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Liste des salles</h2>
                        <p className="text-sm text-slate-500">Ajouter ou supprimer les salles disponibles</p>
                    </div>
                </div>

                <form onSubmit={handleAddRoom} className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="Nom de la salle (ex: Salle Physique 1)"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                        disabled={adding}
                    />
                    <button
                        type="submit"
                        disabled={!newRoomName.trim() || adding}
                        className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Ajouter
                    </button>
                </form>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-200 rounded-lg">
                            Aucune salle n'est actuellement configurée.
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {rooms.map((room) => (
                                <li key={room.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-slate-200 transition-colors">
                                    <span className="font-medium text-slate-700">{room.name}</span>
                                    <button
                                        onClick={() => handleDeleteRoom(room.id, room.name)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded transition-all"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
