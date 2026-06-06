import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types/database';

interface AllowedEmail {
    id: string;
    email: string;
    role: UserRole;
    created_at: string;
}

export default function Settings() {
    const [emails, setEmails] = useState<AllowedEmail[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('teacher');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchEmails();
    }, []);

    const fetchEmails = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('allowed_emails')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEmails(data || []);
        } catch (err) {
            console.error('Error fetching emails:', err);
            setError('Impossible de charger les e-mails autorisés.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEmail = newEmail.trim().toLowerCase();
        if (!trimmedEmail) return;

        try {
            setAdding(true);
            setError('');
            
            const { data, error } = await supabase
                .from('allowed_emails')
                .insert([{ email: trimmedEmail, role: newRole }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    throw new Error('Cet e-mail est déjà autorisé.');
                }
                throw error;
            }

            setEmails(prev => [data as AllowedEmail, ...prev]);
            setNewEmail('');
            setNewRole('teacher');
        } catch (err: any) {
            console.error('Error adding email:', err);
            setError(err.message || 'Erreur lors de l\'ajout de l\'e-mail.');
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteEmail = async (id: string, email: string) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir bloquer l'e-mail "${email}" ? Ils ne pourront plus se connecter s'ils n'ont pas encore créé leur profil.`)) return;

        try {
            const { error } = await supabase
                .from('allowed_emails')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setEmails(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            console.error('Error deleting email:', err);
            setError('Erreur lors de la suppression de l\'e-mail.');
        }
    };

    const roleLabel = (role: UserRole) => {
        if (role === 'admin') return 'Administrateur';
        if (role === 'preparator') return 'Préparateur';
        return 'Professeur';
    };

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Paramètres d'Administration</h1>
                <p className="text-sm text-slate-500 mt-1">Gérez les accès à la plateforme en invitant des enseignants et des préparateurs.</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Comptes Autorisés</h2>
                        <p className="text-sm text-slate-500">Ajoutez les e-mails des personnes autorisées à s'inscrire</p>
                    </div>
                </div>

                <form onSubmit={handleAddEmail} className="flex flex-col sm:flex-row gap-3 mb-6">
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Adresse e-mail (ex: prenom.nom@crmef.ma)"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                        disabled={adding}
                        required
                    />
                    <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                        disabled={adding}
                    >
                        <option value="teacher">Professeur</option>
                        <option value="preparator">Préparateur</option>
                        <option value="admin">Administrateur</option>
                    </select>
                    <button
                        type="submit"
                        disabled={!newEmail.trim() || adding}
                        className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Autoriser
                    </button>
                </form>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                        </div>
                    ) : emails.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                            Aucun e-mail autorisé pour le moment.
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {emails.map((item) => (
                                <li key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-200 transition-colors shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-800">{item.email}</span>
                                        <span className="text-xs font-semibold text-slate-500">
                                            Rôle : {roleLabel(item.role)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteEmail(item.id, item.email)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                        title="Révoquer l'autorisation"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 leading-relaxed">
                    <strong>Note importante :</strong> L'ajout d'une adresse e-mail ici ne crée pas immédiatement le compte, mais place cet e-mail sur une "liste blanche". Le professeur ou préparateur devra se rendre sur la page de connexion, cliquer sur "S'inscrire", entrer cette adresse e-mail et choisir son mot de passe. C'est à ce moment-là que le système lui accordera le rôle configuré.
                </div>
            </div>
        </div>
    );
}
