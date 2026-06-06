import { useState, useEffect } from 'react';
import { Plus, MessageSquare, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Request, RequestType, RequestStatus } from '../types/database';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RequestWithUser extends Request {
    users: { name: string } | null;
}

const TYPE_LABELS: Record<RequestType, string> = {
    product: 'Produit Chimique',
    material: 'Matériel',
    other: 'Autre'
};

const STATUS_LABELS: Record<RequestStatus, string> = {
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    completed: 'Traité'
};

const STATUS_COLORS: Record<RequestStatus, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    approved: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200'
};

export default function Requests() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<RequestWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    
    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<RequestType>('product');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('requests')
                .select(`
                    *,
                    users:teacher_id (name)
                `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            
            // Normalize data (Supabase might return an array for users depending on relation logic, but should be single object)
            const normalizedData = (data || []).map(item => ({
                ...item,
                users: Array.isArray(item.users) ? item.users[0] : item.users
            })) as RequestWithUser[];

            setRequests(normalizedData);
        } catch (err) {
            console.error('Error fetching requests:', err);
            setError('Impossible de charger les réclamations');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        try {
            setSubmitting(true);
            setError('');

            const newRequest = {
                teacher_id: user.id,
                title: title.trim(),
                description: description.trim() || null,
                request_type: type,
                status: 'pending' as RequestStatus
            };

            const { data, error: insertError } = await supabase
                .from('requests')
                .insert([newRequest])
                .select(`*, users:teacher_id(name)`)
                .single();

            if (insertError) throw insertError;

            const normalized = {
                ...data,
                users: Array.isArray(data.users) ? data.users[0] : data.users
            } as RequestWithUser;

            setRequests(prev => [normalized, ...prev]);
            setShowModal(false);
            setTitle('');
            setDescription('');
            setType('product');
        } catch (err: any) {
            console.error('Error creating request:', err);
            setError(err.message || 'Erreur lors de la création de la réclamation');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (requestId: string, newStatus: RequestStatus) => {
        try {
            const { error: updateError } = await supabase
                .from('requests')
                .update({ status: newStatus })
                .eq('id', requestId);

            if (updateError) throw updateError;

            setRequests(prev => prev.map(req => 
                req.id === requestId ? { ...req, status: newStatus } : req
            ));
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Erreur lors de la mise à jour du statut');
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Réclamations & Besoins</h1>
                    <p className="text-sm text-slate-500 mt-1">Déclarez vos besoins en matériel ou produits chimiques</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nouvelle demande
                </button>
            </div>

            {error && !showModal && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <MessageSquare className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-lg font-medium text-slate-700">Aucune demande</p>
                        <p className="text-sm">Il n'y a actuellement aucune réclamation ou besoin exprimé.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {requests.map((request) => (
                            <div key={request.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-base font-bold text-slate-800">{request.title}</h3>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                            {TYPE_LABELS[request.request_type]}
                                        </span>
                                    </div>
                                    {request.description && (
                                        <p className="text-sm text-slate-600 mb-2 whitespace-pre-wrap">{request.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span>Demandé par : <strong className="text-slate-600">{request.users?.name || 'Inconnu'}</strong></span>
                                        <span>•</span>
                                        <span>{format(new Date(request.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[request.status]}`}>
                                        {request.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                                        {request.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                        {request.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                                        {STATUS_LABELS[request.status]}
                                    </span>
                                    <select
                                        value={request.status}
                                        onChange={(e) => handleStatusChange(request.id, e.target.value as RequestStatus)}
                                        className="text-xs border-slate-200 rounded text-slate-600 py-1 pl-2 pr-6"
                                    >
                                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de création */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-full">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Formuler un besoin</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateRequest} className="p-6 flex flex-col gap-4 overflow-y-auto">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type de besoin *</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as RequestType)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                                    required
                                >
                                    {Object.entries(TYPE_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Titre court *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ex: Pénurie de tubes à essai"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Détails (Optionnel)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Précisez la quantité requise ou les références..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary h-24 resize-none"
                                />
                            </div>

                            <div className="mt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    disabled={submitting}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={!title.trim() || submitting}
                                    className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Envoi...' : 'Soumettre'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
