import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Beaker, ClipboardList, HelpCircle, Plus, Save, Trash2, Users, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import type { Material, Product, Quiz, TPMaterial, TPReactif, TPSession, Unit } from '../../types/database';

type ProductLite = Pick<Product, 'id' | 'name' | 'chemical_formula' | 'cas_number' | 'quantity' | 'unit'>;

interface TPReactifWithProduct extends TPReactif {
    products: ProductLite | null;
}

interface TPReactifWithProductRelation extends TPReactif {
    products: ProductLite | ProductLite[] | null;
}

type MaterialLite = Pick<Material, 'id' | 'name' | 'category' | 'quantity' | 'quantity_unit' | 'condition_status'>;

interface TPMaterialWithMaterial extends TPMaterial {
    materials: MaterialLite | null;
}

interface TPMaterialWithMaterialRelation extends TPMaterial {
    materials: MaterialLite | MaterialLite[] | null;
}

interface TPChecklistItem {
    id: string;
    tp_session_id: string;
    label: string;
    is_done: boolean;
    order_index: number;
    done_at: string | null;
    done_by: string | null;
}

interface ProductLogRelation {
    name: string;
    chemical_formula: string | null;
}

interface TPConsumptionLog {
    id: string;
    tp_session_id: string;
    tp_reactif_id: string;
    product_id: string;
    quantity_used: number;
    unit: Unit;
    note: string | null;
    logged_by: string | null;
    logged_at: string;
    products: ProductLogRelation | null;
}

interface TPConsumptionLogRelation extends Omit<TPConsumptionLog, 'products'> {
    products: ProductLogRelation | ProductLogRelation[] | null;
}

type RowEditState = Record<string, { plannedQuantity: string; unit: Unit }>;

const UNIT_OPTIONS: Unit[] = ['g', 'kg', 'ml', 'L', 'mol'];

function getErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.length > 0) return message;
    }
    return fallback;
}

function parsePositiveNumber(value: string): number | null {
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
}

function normalizeReactif(raw: TPReactifWithProductRelation): TPReactifWithProduct {
    const relation = raw.products;
    const product = Array.isArray(relation) ? (relation[0] || null) : relation;

    return {
        ...raw,
        products: product,
    };
}

function normalizeMaterial(raw: TPMaterialWithMaterialRelation): TPMaterialWithMaterial {
    const relation = raw.materials;
    const material = Array.isArray(relation) ? (relation[0] || null) : relation;

    return {
        ...raw,
        materials: material,
    };
}

function normalizeConsumptionLog(raw: TPConsumptionLogRelation): TPConsumptionLog {
    const relation = raw.products;
    const product = Array.isArray(relation) ? (relation[0] || null) : relation;
    return {
        ...raw,
        products: product,
    };
}

export default function TpSessionDetail() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [session, setSession] = useState<TPSession | null>(null);
    const [reactifs, setReactifs] = useState<TPReactifWithProduct[]>([]);
    const [sessionMaterials, setSessionMaterials] = useState<TPMaterialWithMaterial[]>([]);
    const [checklistItems, setChecklistItems] = useState<TPChecklistItem[]>([]);
    const [quizItems, setQuizItems] = useState<Quiz[]>([]);
    const [consumptionLogs, setConsumptionLogs] = useState<TPConsumptionLog[]>([]);
    const [products, setProducts] = useState<ProductLite[]>([]);
    const [rowEdits, setRowEdits] = useState<RowEditState>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [newProductId, setNewProductId] = useState('');
    const [newPlannedQuantity, setNewPlannedQuantity] = useState('');
    const [newUnit, setNewUnit] = useState<Unit>('g');
    const [addingReactif, setAddingReactif] = useState(false);
    const [savingRowId, setSavingRowId] = useState<string | null>(null);
    const [deletingRowId, setDeletingRowId] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            setError('Session TP introuvable');
            return;
        }

        const loadData = async () => {
            setLoading(true);
            setError('');

            try {
                const [sessionRes, reactifsRes, materialsRes, productsRes] = await Promise.all([
                    supabase.from('tp_sessions').select('*').eq('id', id).single(),
                    supabase
                        .from('tp_reactifs')
                        .select(`
                            id,
                            tp_session_id,
                            product_id,
                            planned_quantity,
                            used_quantity,
                            unit,
                            products:product_id (
                                id,
                                name,
                                chemical_formula,
                                cas_number,
                                quantity,
                                unit
                            )
                        `)
                        .eq('tp_session_id', id)
                        .order('id', { ascending: true }),
                    supabase
                        .from('tp_materials')
                        .select(`
                            id,
                            tp_session_id,
                            material_id,
                            required_quantity,
                            materials:material_id (
                                id,
                                name,
                                category,
                                quantity,
                                quantity_unit,
                                condition_status
                            )
                        `)
                        .eq('tp_session_id', id)
                        .order('id', { ascending: true }),
                    supabase
                        .from('products')
                        .select('id, name, chemical_formula, cas_number, quantity, unit')
                        .order('name', { ascending: true }),
                ]);

                if (sessionRes.error) throw sessionRes.error;
                if (reactifsRes.error) throw reactifsRes.error;
                if (materialsRes.error) throw materialsRes.error;
                if (productsRes.error) throw productsRes.error;

                const sessionData = sessionRes.data as TPSession | null;
                if (!sessionData) throw new Error('Session introuvable');

                const reactifsData = ((reactifsRes.data || []) as TPReactifWithProductRelation[]).map(normalizeReactif);
                const materialsData = ((materialsRes.data || []) as TPMaterialWithMaterialRelation[]).map(normalizeMaterial);
                const productsData = (productsRes.data || []) as ProductLite[];

                setSession(sessionData);
                setReactifs(reactifsData);
                setSessionMaterials(materialsData);
                setProducts(productsData);

                const nextEdits: RowEditState = {};
                reactifsData.forEach((item) => {
                    nextEdits[item.id] = {
                        plannedQuantity: String(item.planned_quantity),
                        unit: item.unit,
                    };
                });
                setRowEdits(nextEdits);

                const [checklistRes, quizRes, logsRes] = await Promise.all([
                    supabase
                        .from('tp_checklist_items')
                        .select('id, tp_session_id, label, is_done, order_index, done_at, done_by')
                        .eq('tp_session_id', id)
                        .order('order_index', { ascending: true }),
                    supabase
                        .from('quiz')
                        .select('*')
                        .eq('tp_session_id', id),
                    supabase
                        .from('tp_consumption_logs')
                        .select(`
                            id,
                            tp_session_id,
                            tp_reactif_id,
                            product_id,
                            quantity_used,
                            unit,
                            note,
                            logged_by,
                            logged_at,
                            products:product_id (
                                name,
                                chemical_formula
                            )
                        `)
                        .eq('tp_session_id', id)
                        .order('logged_at', { ascending: false }),
                ]);

                if (!checklistRes.error) {
                    setChecklistItems((checklistRes.data || []) as TPChecklistItem[]);
                } else {
                    console.warn('Checklist not available:', checklistRes.error.message);
                    setChecklistItems([]);
                }

                if (!quizRes.error) {
                    setQuizItems((quizRes.data || []) as Quiz[]);
                } else {
                    console.warn('Quiz not available:', quizRes.error.message);
                    setQuizItems([]);
                }

                if (!logsRes.error) {
                    const logs = ((logsRes.data || []) as TPConsumptionLogRelation[]).map(normalizeConsumptionLog);
                    setConsumptionLogs(logs);
                } else {
                    console.warn('Consumption logs not available:', logsRes.error.message);
                    setConsumptionLogs([]);
                }
            } catch (loadError) {
                console.error('Error loading TP session detail:', loadError);
                setError(getErrorMessage(loadError, 'Impossible de charger les donnees de la seance'));
            } finally {
                setLoading(false);
            }
        };

        void loadData();
    }, [id]);

    const selectedProduct = useMemo(
        () => products.find((product) => product.id === newProductId) || null,
        [products, newProductId]
    );

    const selectableProducts = useMemo(() => {
        const selectedIds = new Set(reactifs.map((reactif) => reactif.product_id));
        return products.filter((product) => !selectedIds.has(product.id));
    }, [products, reactifs]);

    useEffect(() => {
        if (selectedProduct) {
            setNewUnit(selectedProduct.unit);
        }
    }, [selectedProduct]);

    const addReactif = async () => {
        if (!id) return;
        if (!newProductId) {
            alert('Selectionnez un produit');
            return;
        }

        const plannedQuantity = parsePositiveNumber(newPlannedQuantity);
        if (plannedQuantity === null) {
            alert('La quantite prevue doit etre superieure a 0');
            return;
        }

        setAddingReactif(true);
        try {
            const { data, error: insertError } = await supabase
                .from('tp_reactifs')
                .insert([{
                    tp_session_id: id,
                    product_id: newProductId,
                    planned_quantity: plannedQuantity,
                    used_quantity: null,
                    unit: newUnit,
                }])
                .select(`
                    id,
                    tp_session_id,
                    product_id,
                    planned_quantity,
                    used_quantity,
                    unit,
                    products:product_id (
                        id,
                        name,
                        chemical_formula,
                        cas_number,
                        quantity,
                        unit
                    )
                `)
                .single();

            if (insertError) throw insertError;

            const created = normalizeReactif(data as TPReactifWithProductRelation);
            setReactifs((prev) => [...prev, created]);
            setRowEdits((prev) => ({
                ...prev,
                [created.id]: {
                    plannedQuantity: String(created.planned_quantity),
                    unit: created.unit,
                },
            }));
            setNewProductId('');
            setNewPlannedQuantity('');
            setNewUnit('g');
        } catch (insertErr) {
            console.error('Error adding reactif:', insertErr);
            alert(getErrorMessage(insertErr, 'Erreur lors de l\'ajout du reactif'));
        } finally {
            setAddingReactif(false);
        }
    };

    const saveReactif = async (reactifId: string) => {
        const edit = rowEdits[reactifId];
        if (!edit) return;

        const plannedQuantity = parsePositiveNumber(edit.plannedQuantity);
        if (plannedQuantity === null) {
            alert('La quantite prevue doit etre superieure a 0');
            return;
        }

        setSavingRowId(reactifId);
        try {
            const { error: updateError } = await supabase
                .from('tp_reactifs')
                .update({
                    planned_quantity: plannedQuantity,
                    unit: edit.unit,
                })
                .eq('id', reactifId);

            if (updateError) throw updateError;

            setReactifs((prev) =>
                prev.map((reactif) =>
                    reactif.id === reactifId
                        ? { ...reactif, planned_quantity: plannedQuantity, unit: edit.unit }
                        : reactif
                )
            );
        } catch (updateErr) {
            console.error('Error updating reactif:', updateErr);
            alert(getErrorMessage(updateErr, 'Erreur lors de la mise a jour du reactif'));
        } finally {
            setSavingRowId(null);
        }
    };

    const deleteReactif = async (reactifId: string) => {
        if (!window.confirm('Supprimer ce reactif de la seance ?')) return;

        setDeletingRowId(reactifId);
        try {
            const { error: deleteError } = await supabase
                .from('tp_reactifs')
                .delete()
                .eq('id', reactifId);

            if (deleteError) throw deleteError;

            setReactifs((prev) => prev.filter((reactif) => reactif.id !== reactifId));
            setRowEdits((prev) => {
                const next = { ...prev };
                delete next[reactifId];
                return next;
            });
        } catch (deleteErr) {
            console.error('Error deleting reactif:', deleteErr);
            alert(getErrorMessage(deleteErr, 'Erreur lors de la suppression du reactif'));
        } finally {
            setDeletingRowId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-600">
                <p className="font-medium">{error || 'Session TP introuvable'}</p>
                <button
                    type="button"
                    onClick={() => navigate('/tp-sessions')}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                    Retour aux sessions
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => navigate('/tp-sessions')}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/10">
                            {session.code}
                        </span>
                        <h1 className="text-2xl font-bold text-slate-800">{session.title}</h1>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Niveau {session.level} • {format(new Date(session.date), 'dd MMMM yyyy', { locale: fr })}
                        {session.start_time && session.end_time && ` • ${session.start_time.slice(0, 5)} - ${session.end_time.slice(0, 5)}`}
                        {` • ${session.duration_minutes} min`}
                    </p>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {session.student_count} élève(s) • {session.status === 'done' ? 'Terminé' : 'Planifié'}
                        {session.room && ` • 🏫 ${session.room}`}
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                    <Wrench className="w-5 h-5 text-primary" />
                    Matériels nécessaires
                </h2>
                {sessionMaterials.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun matériel associé à cette séance.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sessionMaterials.map((item) => (
                            <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-medium text-slate-800">{item.materials?.name || 'Matériel supprimé'}</p>
                                        <p className="text-xs text-slate-500 capitalize">{item.materials?.category || 'Matériel'}</p>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-800 font-semibold">
                                        ×{item.required_quantity}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Beaker className="w-5 h-5 text-primary" />
                        Reactifs de la seance
                    </h2>
                    <Link
                        to="/products"
                        className="text-sm text-primary hover:text-primary-dark transition-colors"
                    >
                        Voir les produits
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5">
                    <div className="md:col-span-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Produit</label>
                        <select
                            value={newProductId}
                            onChange={(event) => setNewProductId(event.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                            disabled={addingReactif}
                        >
                            <option value="">Selectionner un reactif...</option>
                            {selectableProducts.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name} {product.cas_number ? `(${product.cas_number})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantite prevue</label>
                        <input
                            type="text"
                            value={newPlannedQuantity}
                            onChange={(event) => setNewPlannedQuantity(event.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                            placeholder="Ex: 25"
                            disabled={addingReactif}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Unite</label>
                        <select
                            value={newUnit}
                            onChange={(event) => setNewUnit(event.target.value as Unit)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-900"
                            disabled={addingReactif}
                        >
                            {UNIT_OPTIONS.map((unit) => (
                                <option key={unit} value={unit}>{unit}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1 flex items-end">
                        <button
                            type="button"
                            onClick={addReactif}
                            disabled={addingReactif || selectableProducts.length === 0}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-4 h-4" />
                            Ajouter
                        </button>
                    </div>
                </div>

                {reactifs.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 border border-dashed border-slate-300 rounded-lg">
                        Aucun reactif associe a cette seance pour le moment.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reactif</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock actuel</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantite prevue</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Consomme</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {reactifs.map((reactif) => {
                                    const edit = rowEdits[reactif.id];
                                    const plannedQuantity = Number(edit?.plannedQuantity ?? reactif.planned_quantity);
                                    const stock = Number(reactif.products?.quantity ?? 0);
                                    const insufficient = !!reactif.products && Number.isFinite(plannedQuantity) && plannedQuantity > stock;

                                    return (
                                        <tr key={reactif.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-slate-900">{reactif.products?.name || 'Produit supprime'}</div>
                                                <div className="text-xs text-slate-500">
                                                    {reactif.products?.chemical_formula || ''} {reactif.products?.cas_number ? `• CAS ${reactif.products.cas_number}` : ''}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-700">
                                                {reactif.products ? `${stock} ${reactif.products.unit}` : '-'}
                                                {insufficient && (
                                                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Insuffisant
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={edit?.plannedQuantity ?? String(reactif.planned_quantity)}
                                                        onChange={(event) =>
                                                            setRowEdits((prev) => ({
                                                                ...prev,
                                                                [reactif.id]: {
                                                                    plannedQuantity: event.target.value,
                                                                    unit: prev[reactif.id]?.unit ?? reactif.unit,
                                                                },
                                                            }))
                                                        }
                                                        className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900"
                                                    />
                                                    <select
                                                        value={edit?.unit ?? reactif.unit}
                                                        onChange={(event) =>
                                                            setRowEdits((prev) => ({
                                                                ...prev,
                                                                [reactif.id]: {
                                                                    plannedQuantity: prev[reactif.id]?.plannedQuantity ?? String(reactif.planned_quantity),
                                                                    unit: event.target.value as Unit,
                                                                },
                                                            }))
                                                        }
                                                        className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900"
                                                    >
                                                        {UNIT_OPTIONS.map((unit) => (
                                                            <option key={unit} value={unit}>{unit}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-700">
                                                {reactif.used_quantity == null ? '-' : `${reactif.used_quantity} ${reactif.unit}`}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => saveReactif(reactif.id)}
                                                        disabled={savingRowId === reactif.id}
                                                        className="p-1.5 text-slate-400 hover:text-primary transition-colors rounded"
                                                        title="Enregistrer"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteReactif(reactif.id)}
                                                        disabled={deletingRowId === reactif.id}
                                                        className="p-1.5 text-slate-400 hover:text-danger transition-colors rounded"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    Check-list de preparation
                </h2>
                {checklistItems.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun item de checklist pour cette seance.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {checklistItems.map((item) => (
                            <div
                                key={item.id}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                                    item.is_done
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                            >
                                <span className="text-sm font-medium">{item.label}</span>
                                <span className="text-xs font-semibold">
                                    {item.is_done ? 'Fait' : 'A preparer'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    Quiz court de comprehension
                </h2>
                {quizItems.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune question de quiz pour cette seance.</p>
                ) : (
                    <div className="space-y-4">
                        {quizItems.map((question, index) => (
                            <div key={question.id} className="border border-slate-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-800 mb-3">
                                    Q{index + 1}. {question.question}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    {([
                                        ['a', question.option_a],
                                        ['b', question.option_b],
                                        ['c', question.option_c],
                                        ['d', question.option_d],
                                    ] as Array<[Quiz['correct_answer'], string]>).map(([key, text]) => (
                                        <div
                                            key={`${question.id}-${key}`}
                                            className={`px-3 py-2 rounded border ${
                                                question.correct_answer === key
                                                    ? 'bg-green-50 border-green-200 text-green-800'
                                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                            }`}
                                        >
                                            <span className="font-semibold uppercase mr-1">{key}.</span>
                                            {text}
                                        </div>
                                    ))}
                                </div>
                                {question.explanation && (
                                    <p className="mt-3 text-sm text-slate-600">
                                        <span className="font-medium">Explication:</span> {question.explanation}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                    <Beaker className="w-5 h-5 text-primary" />
                    Suivi de consommation
                </h2>
                {consumptionLogs.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune consommation enregistree pour cette seance.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                                    <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Produit</th>
                                    <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Quantite</th>
                                    <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Note</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {consumptionLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2.5 px-3 text-sm text-slate-700">
                                            {format(new Date(log.logged_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                        </td>
                                        <td className="py-2.5 px-3 text-sm text-slate-700">
                                            {log.products?.name || 'Produit'}
                                            {log.products?.chemical_formula ? (
                                                <span className="text-xs text-slate-500 ml-2">{log.products.chemical_formula}</span>
                                            ) : null}
                                        </td>
                                        <td className="py-2.5 px-3 text-sm font-medium text-slate-800">
                                            {log.quantity_used} {log.unit}
                                        </td>
                                        <td className="py-2.5 px-3 text-sm text-slate-600">
                                            {log.note || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
