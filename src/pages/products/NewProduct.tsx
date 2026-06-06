import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Beaker, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { EpiRequired, GHSClass, PhysicalProperties } from '../../types/database';

const GHS_OPTIONS: Array<{ value: GHSClass; label: string }> = [
    { value: 'explosive', label: 'Explosif' },
    { value: 'flammable', label: 'Inflammable' },
    { value: 'oxidizing', label: 'Comburant' },
    { value: 'compressed_gas', label: 'Gaz sous pression' },
    { value: 'corrosive', label: 'Corrosif' },
    { value: 'toxic', label: 'Toxique' },
    { value: 'harmful', label: 'Irritant / Nocif' },
    { value: 'environmental_hazard', label: 'Dangereux environnement' },
    { value: 'health_hazard', label: 'Danger pour la sante' },
];

const EPI_OPTIONS: Array<{ value: EpiRequired; label: string }> = [
    { value: 'gloves', label: 'Gants' },
    { value: 'safety_glasses', label: 'Lunettes' },
    { value: 'lab_coat', label: 'Blouse' },
    { value: 'face_shield', label: 'Ecran facial' },
    { value: 'fume_hood', label: 'Sous hotte' },
    { value: 'respirator', label: 'Masque respiratoire' },
];

const optionalNumericField = z
    .string()
    .optional()
    .refine((value) => {
        if (!value || value.trim() === '') return true;
        const normalized = value.replace(',', '.');
        return Number.isFinite(Number(normalized));
    }, 'Valeur numerique invalide');

const productSchema = z.object({
    name: z.string().min(1, 'Le nom est requis'),
    chemical_formula: z.string().optional(),
    cas_number: z.string().optional(),
    quantity: z.number().min(0, 'La quantité doit être positive'),
    unit: z.enum(['g', 'ml', 'L', 'kg', 'mol']),
    min_quantity_alert: z.number().min(0, 'La quantité d\'alerte doit être positive'),
    expiry_date: z.string().optional(),
    location: z.string().optional(),
    supplier: z.string().optional(),
    pictograms: z.array(z.enum(['explosive', 'flammable', 'oxidizing', 'compressed_gas', 'corrosive', 'toxic', 'harmful', 'environmental_hazard', 'health_hazard'])).optional(),
    epi_required: z.array(z.enum(['gloves', 'safety_glasses', 'lab_coat', 'face_shield', 'fume_hood', 'respirator'])).optional(),
    storage_rules: z.string().optional(),
    appearance: z.string().optional(),
    ph: optionalNumericField,
    melting_point: optionalNumericField,
    boiling_point: optionalNumericField,
    density: optionalNumericField,
    flash_point: optionalNumericField,
    molecular_weight: optionalNumericField,
    solubility_in_water: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

function toOptionalNumber(value?: string): number | undefined {
    if (!value || value.trim() === '') return undefined;
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : undefined;
}

function getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
        const maybeMessage = (error as { message?: unknown }).message;
        if (typeof maybeMessage === 'string' && maybeMessage.length > 0) return maybeMessage;
    }
    return 'Une erreur est survenue lors de la creation du produit';
}

export default function NewProduct() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id);
    const [submitting, setSubmitting] = useState(false);
    const [loadingInitialData, setLoadingInitialData] = useState(isEditMode);
    const [error, setError] = useState('');

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            quantity: 0,
            unit: 'g',
            min_quantity_alert: 0,
            pictograms: [],
            epi_required: [],
        }
    });

    useEffect(() => {
        if (!isEditMode || !id) return;

        const loadProduct = async () => {
            setLoadingInitialData(true);
            try {
                const { data: productData, error: productError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (productError || !productData) throw productError || new Error('Produit introuvable');

                const { data: safetyData } = await supabase
                    .from('safety_sheets')
                    .select('*')
                    .eq('product_id', id)
                    .maybeSingle();

                const props = (safetyData?.physical_properties || {}) as PhysicalProperties;
                const toFieldValue = (value?: number | string) => (value == null ? '' : String(value));

                reset({
                    name: productData.name || '',
                    chemical_formula: productData.chemical_formula || '',
                    cas_number: productData.cas_number || '',
                    quantity: Number(productData.quantity) || 0,
                    unit: productData.unit || 'g',
                    min_quantity_alert: Number(productData.min_quantity_alert) || 0,
                    expiry_date: productData.expiry_date || '',
                    location: productData.location || '',
                    supplier: productData.supplier || '',
                    pictograms: safetyData?.pictograms || [],
                    epi_required: safetyData?.epi_required || [],
                    storage_rules: safetyData?.storage_rules || '',
                    appearance: toFieldValue(props.appearance),
                    ph: toFieldValue(props.ph),
                    melting_point: toFieldValue(props.melting_point),
                    boiling_point: toFieldValue(props.boiling_point),
                    density: toFieldValue(props.density),
                    flash_point: toFieldValue(props.flash_point),
                    molecular_weight: toFieldValue(props.molecular_weight),
                    solubility_in_water: toFieldValue(props.solubility_in_water),
                });
            } catch (loadError) {
                console.error('Error loading product for edit:', loadError);
                setError('Impossible de charger ce produit pour modification');
            } finally {
                setLoadingInitialData(false);
            }
        };

        loadProduct();
    }, [id, isEditMode, reset]);

    const onSubmit = async (data: ProductFormData) => {
        setSubmitting(true);
        setError('');

        try {
            const payload = {
                name: data.name,
                chemical_formula: data.chemical_formula || null,
                cas_number: data.cas_number || null,
                quantity: data.quantity,
                unit: data.unit,
                min_quantity_alert: data.min_quantity_alert,
                expiry_date: data.expiry_date || null,
                location: data.location || null,
                supplier: data.supplier || null,
            };

            let productId = id;
            if (isEditMode && id) {
                const { error: updateError } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', id);
                if (updateError) throw updateError;
            } else {
                const { data: createdProduct, error: dbError } = await supabase
                    .from('products')
                    .insert([payload])
                    .select('id')
                    .single();

                if (dbError) throw dbError;
                if (!createdProduct) throw new Error('Produit cree mais ID introuvable');
                productId = createdProduct.id;
            }

            if (!productId) throw new Error('ID produit manquant');

            const physicalProperties: PhysicalProperties = {
                appearance: data.appearance?.trim() || undefined,
                ph: toOptionalNumber(data.ph),
                melting_point: toOptionalNumber(data.melting_point),
                boiling_point: toOptionalNumber(data.boiling_point),
                density: toOptionalNumber(data.density),
                flash_point: toOptionalNumber(data.flash_point),
                molecular_weight: toOptionalNumber(data.molecular_weight),
                solubility_in_water: data.solubility_in_water?.trim() || undefined,
            };

            const hasPhysicalProperties = Object.values(physicalProperties).some((value) => {
                if (typeof value === 'string') return value.trim().length > 0;
                return value !== undefined && value !== null;
            });

            const hasSafetyData =
                (data.pictograms?.length ?? 0) > 0 ||
                (data.epi_required?.length ?? 0) > 0 ||
                !!data.storage_rules?.trim() ||
                hasPhysicalProperties;

            if (isEditMode) {
                const { data: existingSafety } = await supabase
                    .from('safety_sheets')
                    .select('id')
                    .eq('product_id', productId)
                    .maybeSingle();

                if (existingSafety) {
                    const { error: safetyUpdateError } = await supabase
                        .from('safety_sheets')
                        .update({
                            pictograms: data.pictograms ?? [],
                            epi_required: data.epi_required ?? [],
                            storage_rules: data.storage_rules?.trim() || null,
                            physical_properties: physicalProperties,
                        })
                        .eq('id', existingSafety.id);
                    if (safetyUpdateError) {
                        console.error('Error updating safety sheet:', safetyUpdateError);
                        alert('Produit modifie, mais la fiche technique n\'a pas ete mise a jour.');
                    }
                } else if (hasSafetyData) {
                    const { error: safetyInsertError } = await supabase
                        .from('safety_sheets')
                        .insert([{
                            product_id: productId,
                            pictograms: data.pictograms ?? [],
                            epi_required: data.epi_required ?? [],
                            storage_rules: data.storage_rules?.trim() || null,
                            physical_properties: physicalProperties,
                        }]);

                    if (safetyInsertError) {
                        console.error('Error creating safety sheet:', safetyInsertError);
                        alert('Produit modifie, mais la fiche technique n\'a pas ete enregistree.');
                    }
                }
            } else if (hasSafetyData) {
                const { error: safetyCreateError } = await supabase
                    .from('safety_sheets')
                    .insert([{
                        product_id: productId,
                        pictograms: data.pictograms ?? [],
                        epi_required: data.epi_required ?? [],
                        storage_rules: data.storage_rules?.trim() || null,
                        physical_properties: physicalProperties,
                    }]);

                if (safetyCreateError) {
                    console.error('Error creating safety sheet:', safetyCreateError);
                    alert('Produit cree, mais la fiche technique n\'a pas ete enregistree (verifiez les policies RLS de safety_sheets).');
                }
            }

            navigate('/products');
        } catch (err: unknown) {
            console.error('Error creating product:', err);
            setError(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
            {loadingInitialData ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center text-slate-500">
                    Chargement des donnees produit...
                </div>
            ) : (
                <>
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/products')}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {isEditMode ? 'Modifier le produit' : 'Nouveau produit'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {isEditMode
                            ? 'Mettre a jour les informations du produit et sa fiche technique'
                            : 'Ajouter un nouveau produit chimique a l\'inventaire'}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-4">
                            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 flex items-center gap-2">
                                <Beaker className="w-5 h-5 text-primary" />
                                Informations générales
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom du produit *</label>
                                    <input
                                        type="text"
                                        {...register('name')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                        placeholder="Ex: Éthanol absolu"
                                    />
                                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Formule chimique</label>
                                    <input
                                        type="text"
                                        {...register('chemical_formula')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                        placeholder="Ex: C2H6O"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Numéro CAS</label>
                                    <input
                                        type="text"
                                        {...register('cas_number')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                        placeholder="Ex: 64-17-5"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Fournisseur</label>
                                    <input
                                        type="text"
                                        {...register('supplier')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                        placeholder="Ex: Sigma-Aldrich"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mt-4">Stock & Localisation</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="lg:col-span-2 flex gap-4">
                                    <div className="flex-grow">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantité initiale *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            {...register('quantity', { valueAsNumber: true })}
                                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                        />
                                        {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity.message}</p>}
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Unité *</label>
                                        <select
                                            {...register('unit')}
                                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                        >
                                            <option value="g">g</option>
                                            <option value="kg">kg</option>
                                            <option value="ml">ml</option>
                                            <option value="L">L</option>
                                            <option value="mol">mol</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Seuil d'alerte de stock minimum *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        {...register('min_quantity_alert', { valueAsNumber: true })}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                    />
                                    {errors.min_quantity_alert && <p className="mt-1 text-sm text-red-500">{errors.min_quantity_alert.message}</p>}
                                </div>

                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Localisation (Armoire, Étagère)</label>
                                    <input
                                        type="text"
                                        {...register('location')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                        placeholder="Ex: Armoire 1, Étagère B"
                                    />
                                </div>

                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Date de péremption</label>
                                    <input
                                        type="date"
                                        {...register('expiry_date')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mt-4">Fiche technique (dynamique page QR)</h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Pictogrammes GHS</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {GHS_OPTIONS.map((option) => (
                                        <label key={option.value} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                                            <input
                                                type="checkbox"
                                                value={option.value}
                                                {...register('pictograms')}
                                                className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                                            />
                                            <span className="text-sm text-slate-700">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">EPI obligatoires</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {EPI_OPTIONS.map((option) => (
                                        <label key={option.value} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                                            <input
                                                type="checkbox"
                                                value={option.value}
                                                {...register('epi_required')}
                                                className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                                            />
                                            <span className="text-sm text-slate-700">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Regles de stockage</label>
                                <textarea
                                    rows={4}
                                    {...register('storage_rules')}
                                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900 resize-none"
                                    placeholder={`Ex:\n- Conserver a l'abri de la chaleur\n- Ne pas melanger avec les oxydants`}
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Aspect / Couleur</label>
                                    <input
                                        type="text"
                                        {...register('appearance')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">pH</label>
                                    <input
                                        type="text"
                                        {...register('ph')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                    />
                                    {errors.ph && <p className="mt-1 text-sm text-red-500">{errors.ph.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Point de fusion (degC)</label>
                                    <input
                                        type="text"
                                        {...register('melting_point')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                    />
                                    {errors.melting_point && <p className="mt-1 text-sm text-red-500">{errors.melting_point.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Point d'ebullition (degC)</label>
                                    <input
                                        type="text"
                                        {...register('boiling_point')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                    />
                                    {errors.boiling_point && <p className="mt-1 text-sm text-red-500">{errors.boiling_point.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Densite (g/ml)</label>
                                    <input
                                        type="text"
                                        {...register('density')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                    />
                                    {errors.density && <p className="mt-1 text-sm text-red-500">{errors.density.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Point d'eclair (degC)</label>
                                    <input
                                        type="text"
                                        {...register('flash_point')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                    />
                                    {errors.flash_point && <p className="mt-1 text-sm text-red-500">{errors.flash_point.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Masse molaire (g/mol)</label>
                                    <input
                                        type="text"
                                        {...register('molecular_weight')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                    />
                                    {errors.molecular_weight && <p className="mt-1 text-sm text-red-500">{errors.molecular_weight.message}</p>}
                                </div>
                                <div className="md:col-span-2 lg:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Solubilite dans l'eau</label>
                                    <input
                                        type="text"
                                        {...register('solubility_in_water')}
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                        placeholder="Ex: Soluble, Insoluble, Partiellement soluble"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t mt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/products')}
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
                            {submitting
                                ? 'Enregistrement...'
                                : isEditMode
                                    ? 'Enregistrer les modifications'
                                    : 'Enregistrer le produit'}
                        </button>
                    </div>
                </form>
            </div>
                </>
            )}
        </div>
    );
}
