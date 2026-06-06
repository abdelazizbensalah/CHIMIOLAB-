import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { MaterialCategory, MaterialCondition } from '../../types/database';

const materialSchema = z.object({
    name: z.string().min(1, 'Le nom est requis'),
    category: z.enum(['verrerie', 'mesure', 'securite', 'electricite', 'chauffage']),
    description: z.string().optional(),
    quantity: z.number().min(0, 'La quantité doit être positive'),
    quantity_unit: z.string().optional(),
    condition_status: z.enum(['good', 'maintenance', 'out_of_service']),
    icon: z.string().max(8, 'Utilisez un emoji court').optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
    verrerie: 'Verrerie',
    mesure: 'Mesure',
    securite: 'Sécurité',
    electricite: 'Électricité',
    chauffage: 'Chauffage',
};

const CONDITION_LABELS: Record<MaterialCondition, string> = {
    good: 'Bon état',
    maintenance: 'À entretenir',
    out_of_service: 'Hors service',
};

function getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
        const maybeMessage = (error as { message?: unknown }).message;
        if (typeof maybeMessage === 'string' && maybeMessage.length > 0) return maybeMessage;
    }
    return 'Une erreur est survenue lors de l’enregistrement du matériel';
}

export default function NewMaterial() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id);
    const [loadingInitialData, setLoadingInitialData] = useState(isEditMode);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<MaterialFormData>({
        resolver: zodResolver(materialSchema),
        defaultValues: {
            category: 'verrerie',
            quantity: 0,
            quantity_unit: '',
            condition_status: 'good',
            icon: '',
        },
    });

    useEffect(() => {
        if (!isEditMode || !id) return;

        const loadMaterial = async () => {
            setLoadingInitialData(true);
            try {
                const { data, error: fetchError } = await supabase
                    .from('materials')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (fetchError || !data) throw fetchError || new Error('Matériel introuvable');

                reset({
                    name: data.name || '',
                    category: data.category,
                    description: data.description || '',
                    quantity: Number(data.quantity) || 0,
                    quantity_unit: data.quantity_unit || '',
                    condition_status: data.condition_status,
                    icon: data.icon || '',
                });
            } catch (loadError) {
                console.error('Error loading material:', loadError);
                setError('Impossible de charger ce matériel pour modification');
            } finally {
                setLoadingInitialData(false);
            }
        };

        void loadMaterial();
    }, [id, isEditMode, reset]);

    const onSubmit = async (data: MaterialFormData) => {
        setSubmitting(true);
        setError('');

        try {
            const payload = {
                name: data.name.trim(),
                category: data.category,
                description: data.description?.trim() || null,
                quantity: data.quantity,
                quantity_unit: data.quantity_unit?.trim() || null,
                condition_status: data.condition_status,
                icon: data.icon?.trim() || null,
            };

            if (isEditMode && id) {
                const { error: updateError } = await supabase
                    .from('materials')
                    .update(payload)
                    .eq('id', id);

                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('materials')
                    .insert([payload]);

                if (insertError) throw insertError;
            }

            navigate('/materials');
        } catch (submitError) {
            console.error('Error saving material:', submitError);
            setError(getErrorMessage(submitError));
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingInitialData) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => navigate('/materials')}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {isEditMode ? 'Modifier le matériel' : 'Nouveau matériel'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Renseignez les informations affichées dans les cartes de matériels du laboratoire.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-6">
                    {error && (
                        <div className="bg-red-50 text-danger p-4 rounded-lg text-sm flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom du matériel *</label>
                            <input
                                type="text"
                                {...register('name')}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                                placeholder="Ex: Burette graduée 50 ml"
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Catégorie *</label>
                            <select
                                {...register('category')}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                            >
                                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                            {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">État *</label>
                            <select
                                {...register('condition_status')}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                            >
                                {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                            {errors.condition_status && <p className="mt-1 text-sm text-red-500">{errors.condition_status.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantité *</label>
                            <input
                                type="number"
                                min="0"
                                {...register('quantity', { valueAsNumber: true })}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                            />
                            {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Unité de quantité</label>
                            <input
                                type="text"
                                {...register('quantity_unit')}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                                placeholder="Ex: paires, unités"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                            <textarea
                                rows={4}
                                {...register('description')}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 resize-none"
                                placeholder="Ex: Burette verre avec robinet, précision ±0.05 ml."
                            ></textarea>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Icône / emoji (optionnel)</label>
                            <input
                                type="text"
                                {...register('icon')}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                                placeholder="Ex: 🔬"
                            />
                            {errors.icon && <p className="mt-1 text-sm text-red-500">{errors.icon.message}</p>}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t mt-2">
                        <button
                            type="button"
                            onClick={() => navigate('/materials')}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors mr-3"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {submitting ? 'Enregistrement...' : isEditMode ? 'Mettre à jour' : 'Créer le matériel'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
