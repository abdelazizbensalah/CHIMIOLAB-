import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, ArrowLeft, Calendar as CalendarIcon, Plus, Save, Trash2, Wrench } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Level, Material, Product, TPSessionStatus, Unit } from '../../types/database';

const sessionSchema = z.object({
    code: z.string().min(1, 'Le code est requis'),
    title: z.string().min(1, 'Le titre est requis'),
    level: z.enum(['collège', 'lycée', 'CRMEF']),
    date: z.string().min(1, 'La date est requise'),
    room: z.string().min(1, 'La salle est requise'),
    start_time: z.string().min(1, 'L\'heure de début est requise'),
    end_time: z.string().min(1, 'L\'heure de fin est requise'),
    student_count: z.number().min(1, 'Le nombre d’élèves doit être supérieur à 0'),
    objectives: z.string().optional(),
    status: z.enum(['planned', 'done']),
});

type SessionFormData = z.infer<typeof sessionSchema>;
type ProductLite = Pick<Product, 'id' | 'name' | 'chemical_formula' | 'cas_number' | 'unit'>;
type MaterialLite = Pick<Material, 'id' | 'name' | 'category'>;

interface ReactifDraft {
    key: string;
    product_id: string;
    planned_quantity: string;
    unit: Unit;
}

interface MaterialDraft {
    key: string;
    material_id: string;
    required_quantity: string;
}

interface NormalizedReactif {
    product_id: string;
    planned_quantity: number;
    unit: Unit;
}

interface NormalizedMaterial {
    material_id: string;
    required_quantity: number;
}

const UNIT_OPTIONS: Unit[] = ['g', 'kg', 'ml', 'L', 'mol'];

const LEVEL_LABELS: Record<Level, string> = {
    collège: 'Collège',
    lycée: 'Lycée',
    CRMEF: 'CRMEF',
};

const STATUS_LABELS: Record<TPSessionStatus, string> = {
    planned: 'Planifié',
    done: 'Terminé',
};

function makeKey(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createReactifDraft(): ReactifDraft {
    return {
        key: makeKey(),
        product_id: '',
        planned_quantity: '',
        unit: 'ml',
    };
}

function createMaterialDraft(): MaterialDraft {
    return {
        key: makeKey(),
        material_id: '',
        required_quantity: '',
    };
}

function parsePositiveNumber(value: string): number | null {
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
}

function parsePositiveInteger(value: string): number | null {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.length > 0) return message;
    }
    return fallback;
}

export default function NewTpSession() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [products, setProducts] = useState<ProductLite[]>([]);
    const [materials, setMaterials] = useState<MaterialLite[]>([]);
    const [rooms, setRooms] = useState<{ id: string, name: string }[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [reactifs, setReactifs] = useState<ReactifDraft[]>([createReactifDraft()]);
    const [materialRows, setMaterialRows] = useState<MaterialDraft[]>([createMaterialDraft()]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SessionFormData>({
        resolver: zodResolver(sessionSchema),
        defaultValues: {
            code: 'TP-001',
            level: 'lycée',
            room: '',
            start_time: '14:00',
            end_time: '16:00',
            student_count: 24,
            status: 'planned',
        },
    });

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                setLoadingOptions(true);
                const [productsRes, materialsRes, roomsRes] = await Promise.all([
                    supabase
                        .from('products')
                        .select('id, name, chemical_formula, cas_number, unit')
                        .order('name', { ascending: true }),
                    supabase
                        .from('materials')
                        .select('id, name, category')
                        .order('category', { ascending: true })
                        .order('name', { ascending: true }),
                    supabase
                        .from('rooms')
                        .select('id, name')
                        .order('name', { ascending: true }),
                ]);

                if (productsRes.error) throw productsRes.error;
                if (materialsRes.error) throw materialsRes.error;
                if (roomsRes.error) throw roomsRes.error;

                setProducts((productsRes.data || []) as ProductLite[]);
                setMaterials((materialsRes.data || []) as MaterialLite[]);
                setRooms(roomsRes.data || []);
            } catch (fetchError) {
                console.error('Error fetching TP form options:', fetchError);
                setError(getErrorMessage(fetchError, 'Impossible de charger les produits et matériels'));
            } finally {
                setLoadingOptions(false);
            }
        };

        void fetchOptions();
    }, []);

    const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

    const updateReactif = (key: string, patch: Partial<ReactifDraft>) => {
        setReactifs((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    };

    const removeReactif = (key: string) => {
        setReactifs((prev) => {
            const next = prev.filter((row) => row.key !== key);
            return next.length > 0 ? next : [createReactifDraft()];
        });
    };

    const updateMaterial = (key: string, patch: Partial<MaterialDraft>) => {
        setMaterialRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    };

    const removeMaterial = (key: string) => {
        setMaterialRows((prev) => {
            const next = prev.filter((row) => row.key !== key);
            return next.length > 0 ? next : [createMaterialDraft()];
        });
    };

    const onSubmit = async (data: SessionFormData) => {
        if (!user) {
            setError('Vous devez être connecté pour créer une session.');
            return;
        }

        setSubmitting(true);
        setError('');

        let createdSessionId: string | null = null;

        try {
            const normalizedReactifs: NormalizedReactif[] = [];
            const selectedProductIds = new Set<string>();

            for (const row of reactifs) {
                const hasContent = !!row.product_id || row.planned_quantity.trim().length > 0;
                if (!hasContent) continue;

                if (!row.product_id) throw new Error('Chaque réactif doit avoir un produit sélectionné');
                if (selectedProductIds.has(row.product_id)) {
                    throw new Error('Un produit ne peut être ajouté qu’une seule fois dans la même séance');
                }

                const plannedQuantity = parsePositiveNumber(row.planned_quantity);
                if (plannedQuantity === null) throw new Error('Chaque quantité prévue de réactif doit être supérieure à 0');

                selectedProductIds.add(row.product_id);
                normalizedReactifs.push({
                    product_id: row.product_id,
                    planned_quantity: plannedQuantity,
                    unit: row.unit,
                });
            }

            if (normalizedReactifs.length === 0) {
                throw new Error('Ajoutez au moins un réactif à la séance');
            }

            const normalizedMaterials: NormalizedMaterial[] = [];
            const selectedMaterialIds = new Set<string>();

            for (const row of materialRows) {
                const hasContent = !!row.material_id || row.required_quantity.trim().length > 0;
                if (!hasContent) continue;

                if (!row.material_id) throw new Error('Chaque ligne matériel doit contenir un matériel sélectionné');
                if (selectedMaterialIds.has(row.material_id)) {
                    throw new Error('Un matériel ne peut être ajouté qu’une seule fois dans la même séance');
                }

                const requiredQuantity = parsePositiveInteger(row.required_quantity);
                if (requiredQuantity === null) throw new Error('Chaque quantité de matériel doit être un entier supérieur à 0');

                selectedMaterialIds.add(row.material_id);
                normalizedMaterials.push({
                    material_id: row.material_id,
                    required_quantity: requiredQuantity,
                });
            }

            if (normalizedMaterials.length === 0) {
                throw new Error('Ajoutez au moins un matériel nécessaire à la séance');
            }

            const [startH, startM] = data.start_time.split(':').map(Number);
            const [endH, endM] = data.end_time.split(':').map(Number);
            let duration_minutes = (endH * 60 + endM) - (startH * 60 + startM);
            if (duration_minutes <= 0) {
                duration_minutes += 24 * 60;
            }

            // Conflict check
            const { data: conflicts, error: conflictError } = await supabase
                .from('tp_sessions')
                .select('id, start_time, end_time')
                .eq('date', data.date)
                .eq('room', data.room)
                .neq('status', 'done');

            if (conflictError) throw conflictError;

            if (conflicts && conflicts.length > 0) {
                const hasOverlap = conflicts.some(c => {
                    if (!c.start_time || !c.end_time) return false;
                    const cStart = c.start_time.slice(0, 5); // "HH:MM"
                    const cEnd = c.end_time.slice(0, 5);
                    return data.start_time < cEnd && data.end_time > cStart;
                });
                if (hasOverlap) {
                    throw new Error(`La salle ${data.room} est déjà réservée sur ce créneau horaire.`);
                }
            }

            const sessionPayload = {
                code: data.code.trim().toUpperCase(),
                title: data.title.trim(),
                level: data.level,
                subject: null,
                date: data.date,
                room: data.room,
                start_time: data.start_time,
                end_time: data.end_time,
                duration_minutes: duration_minutes,
                student_count: data.student_count,
                teacher_id: user.id,
                objectives: data.objectives?.trim() || null,
                status: data.status,
            };

            const { data: createdSession, error: sessionError } = await supabase
                .from('tp_sessions')
                .insert([sessionPayload])
                .select('id')
                .single();

            if (sessionError) throw sessionError;
            if (!createdSession) throw new Error('Session créée mais ID introuvable');
            createdSessionId = createdSession.id;

            const { error: reactifsError } = await supabase
                .from('tp_reactifs')
                .insert(
                    normalizedReactifs.map((item) => ({
                        tp_session_id: createdSessionId,
                        product_id: item.product_id,
                        planned_quantity: item.planned_quantity,
                        used_quantity: null,
                        unit: item.unit,
                    }))
                );

            if (reactifsError) throw reactifsError;

            const { error: materialsError } = await supabase
                .from('tp_materials')
                .insert(
                    normalizedMaterials.map((item) => ({
                        tp_session_id: createdSessionId,
                        material_id: item.material_id,
                        required_quantity: item.required_quantity,
                    }))
                );

            if (materialsError) throw materialsError;

            navigate(`/tp-sessions/${createdSessionId}`);
        } catch (submitError) {
            console.error('Error creating TP session:', submitError);
            if (createdSessionId) {
                await supabase.from('tp_sessions').delete().eq('id', createdSessionId);
            }
            setError(getErrorMessage(submitError, 'Une erreur est survenue lors de la création de la séance'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => navigate('/tp-sessions')}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Nouvelle Session TP</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Saisissez uniquement les informations visibles sur la fiche TP: code, titre, statut, réactifs et matériels.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-8">
                    {error && (
                        <div className="bg-red-50 text-danger p-4 rounded-lg text-sm flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            Informations générales
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Code TP *</label>
                                <input
                                    type="text"
                                    {...register('code')}
                                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                    placeholder="TP-001"
                                />
                                {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Statut *</label>
                                <select
                                    {...register('status')}
                                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                >
                                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Titre de la session *</label>
                                <input
                                    type="text"
                                    {...register('title')}
                                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                    placeholder="Ex: Dosage acido-basique — HCl / NaOH"
                                />
                                {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
                                <input
                                    type="date"
                                    {...register('date')}
                                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                />
                                {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Salle *</label>
                                <select
                                    {...register('room')}
                                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                >
                                    <option value="" disabled>Sélectionner une salle...</option>
                                    {rooms.map((room) => (
                                        <option key={room.id} value={room.name}>{room.name}</option>
                                    ))}
                                </select>
                                {errors.room && <p className="mt-1 text-sm text-red-500">{errors.room.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Heure de début *</label>
                                <input
                                    type="time"
                                    {...register('start_time')}
                                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                />
                                {errors.start_time && <p className="mt-1 text-sm text-red-500">{errors.start_time.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Heure de fin *</label>
                                <input
                                    type="time"
                                    {...register('end_time')}
                                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                />
                                {errors.end_time && <p className="mt-1 text-sm text-red-500">{errors.end_time.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Niveau *</label>
                                <select
                                    {...register('level')}
                                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                >
                                    {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                {errors.level && <p className="mt-1 text-sm text-red-500">{errors.level.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre d’élèves *</label>
                                <input
                                    type="number"
                                    min="1"
                                    {...register('student_count', { valueAsNumber: true })}
                                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                />
                                {errors.student_count && <p className="mt-1 text-sm text-red-500">{errors.student_count.message}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Objectif</label>
                                <textarea
                                    {...register('objectives')}
                                    rows={3}
                                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900 resize-none"
                                    placeholder="Ex: Déterminer la concentration d'HCl par titrage"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="text-lg font-semibold text-slate-800">Réactifs utilisés</h3>
                            <button
                                type="button"
                                onClick={() => setReactifs((prev) => [...prev, createReactifDraft()])}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Ajouter réactif
                            </button>
                        </div>

                        {loadingOptions ? (
                            <div className="text-sm text-slate-500">Chargement des produits...</div>
                        ) : products.length === 0 ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
                                Aucun produit disponible.
                                <Link to="/products/new" className="ml-2 underline font-medium">Créer un produit</Link>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {reactifs.map((row) => (
                                    <div key={row.key} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border border-slate-200 rounded-lg">
                                        <div className="md:col-span-7">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Produit</label>
                                            <select
                                                value={row.product_id}
                                                onChange={(event) => {
                                                    const selectedId = event.target.value;
                                                    const product = productsById.get(selectedId);
                                                    updateReactif(row.key, {
                                                        product_id: selectedId,
                                                        unit: product?.unit ?? row.unit,
                                                    });
                                                }}
                                                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                                            >
                                                <option value="">Sélectionner...</option>
                                                {products.map((product) => (
                                                    <option key={product.id} value={product.id}>
                                                        {product.name} {product.chemical_formula ? `(${product.chemical_formula})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Quantité prévue</label>
                                            <input
                                                type="text"
                                                value={row.planned_quantity}
                                                onChange={(event) => updateReactif(row.key, { planned_quantity: event.target.value })}
                                                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                                                placeholder="Ex: 100"
                                            />
                                        </div>

                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Unité</label>
                                            <select
                                                value={row.unit}
                                                onChange={(event) => updateReactif(row.key, { unit: event.target.value as Unit })}
                                                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                                            >
                                                {UNIT_OPTIONS.map((unit) => (
                                                    <option key={unit} value={unit}>{unit}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="md:col-span-1 flex items-end justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeReactif(row.key)}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <Wrench className="w-5 h-5 text-primary" />
                                Matériels nécessaires
                            </h3>
                            <button
                                type="button"
                                onClick={() => setMaterialRows((prev) => [...prev, createMaterialDraft()])}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Ajouter matériel
                            </button>
                        </div>

                        {loadingOptions ? (
                            <div className="text-sm text-slate-500">Chargement des matériels...</div>
                        ) : materials.length === 0 ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
                                Aucun matériel disponible.
                                <Link to="/materials/new" className="ml-2 underline font-medium">Créer un matériel</Link>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {materialRows.map((row) => (
                                    <div key={row.key} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border border-slate-200 rounded-lg">
                                        <div className="md:col-span-9">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Matériel</label>
                                            <select
                                                value={row.material_id}
                                                onChange={(event) => updateMaterial(row.key, { material_id: event.target.value })}
                                                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                                            >
                                                <option value="">Sélectionner...</option>
                                                {materials.map((material) => (
                                                    <option key={material.id} value={material.id}>
                                                        {material.name} ({material.category})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Quantité</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={row.required_quantity}
                                                onChange={(event) => updateMaterial(row.key, { required_quantity: event.target.value })}
                                                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                                                placeholder="Ex: 6"
                                            />
                                        </div>

                                        <div className="md:col-span-1 flex items-end justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeMaterial(row.key)}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4 border-t mt-2">
                        <button
                            type="button"
                            onClick={() => navigate('/tp-sessions')}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors mr-3"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {submitting ? 'Enregistrement...' : 'Créer la séance'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
