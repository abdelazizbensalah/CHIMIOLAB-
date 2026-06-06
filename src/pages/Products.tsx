import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/database';
import { Search, Plus, Filter, Edit, Trash2, Upload, FileCheck, Loader2, ExternalLink } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type QuickFilter = 'all' | 'low-stock' | 'missing-fds';

export default function Products() {
    const { profile } = useAuth();
    const canEdit = profile?.role === 'admin' || profile?.role === 'preparator';
    
    const [searchParams] = useSearchParams();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [fdsReady, setFdsReady] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [fdsMap, setFdsMap] = useState<Record<string, string>>({}); // product_id -> pdf_url
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadProductIdRef = useRef<string | null>(null);
    const quickFilterFromUrl = searchParams.get('filter');
    const activeQuickFilter: QuickFilter =
        quickFilterFromUrl === 'low-stock' || quickFilterFromUrl === 'missing-fds'
            ? quickFilterFromUrl
            : 'all';

    useEffect(() => {
        fetchProducts();
        fetchFdsStatus();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFdsStatus = async () => {
        try {
            const { data, error } = await supabase
                .from('safety_sheets')
                .select('product_id, pdf_url');

            if (error) throw error;
            const map: Record<string, string> = {};
            (data || []).forEach(row => {
                if (row.pdf_url) map[row.product_id] = row.pdf_url;
            });
            setFdsMap(map);
        } catch (error) {
            console.error('Error fetching FDS status:', error);
        } finally {
            setFdsReady(true);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setProducts(products.filter(p => p.id !== id));
            // Also clean up FDS map
            const newMap = { ...fdsMap };
            delete newMap[id];
            setFdsMap(newMap);
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Erreur lors de la suppression');
        }
    };

    const triggerUpload = (productId: string) => {
        uploadProductIdRef.current = productId;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const productId = uploadProductIdRef.current;
        if (!file || !productId) return;

        // Validate file type
        if (file.type !== 'application/pdf') {
            alert('Veuillez sélectionner un fichier PDF.');
            e.target.value = '';
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Le fichier ne doit pas dépasser 10 Mo.');
            e.target.value = '';
            return;
        }

        setUploadingId(productId);

        try {
            const fileName = `fds_${productId}_${Date.now()}.pdf`;
            const filePath = `fds/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('fds-pdfs')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // Get the public URL
            const { data: urlData } = supabase.storage
                .from('fds-pdfs')
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;

            // Check if safety_sheet exists for this product
            const { data: existing } = await supabase
                .from('safety_sheets')
                .select('id')
                .eq('product_id', productId)
                .single();

            if (existing) {
                // Update existing record
                const { error: updateError } = await supabase
                    .from('safety_sheets')
                    .update({ pdf_url: publicUrl })
                    .eq('product_id', productId);
                if (updateError) throw updateError;
            } else {
                // Create new safety_sheet record
                const { error: insertError } = await supabase
                    .from('safety_sheets')
                    .insert([{ product_id: productId, pdf_url: publicUrl }]);
                if (insertError) throw insertError;
            }

            // Update local state
            setFdsMap(prev => ({ ...prev, [productId]: publicUrl }));
            alert('✅ Fiche FDS uploadée avec succès !');
        } catch (error: any) {
            console.error('Error uploading FDS:', error);
            alert(`Erreur lors de l'upload : ${error.message || 'Erreur inconnue'}`);
        } finally {
            setUploadingId(null);
            e.target.value = ''; // Reset input
        }
    };

    const filteredProducts = products.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.cas_number?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;
        if (activeQuickFilter === 'low-stock') return p.quantity <= p.min_quantity_alert;
        if (activeQuickFilter === 'missing-fds') return fdsReady ? !fdsMap[p.id] : false;
        return true;
    });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Produits</h1>
                    <p className="text-sm text-slate-500 mt-1">Gérez votre inventaire de produits chimiques</p>
                </div>
                {canEdit && (
                    <Link
                        to="/products/new"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors cursor-pointer w-fit"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau produit
                    </Link>
                )}
            </div>

            {/* Hidden file input for FDS upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
            />

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50">
                    <div className="relative w-full sm:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher par nom ou numéro CAS..."
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
                {activeQuickFilter !== 'all' && (
                    <div className="px-4 py-2 border-b border-slate-200 bg-blue-50 text-blue-700 text-sm">
                        Filtre actif: {activeQuickFilter === 'low-stock' ? 'Stock faible' : 'FDS manquantes'}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nom</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">CAS</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantité</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Localisation</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">FDS</th>
                                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                                {canEdit && <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-500">
                                        <div className="flex justify-center mb-2">
                                            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                                        </div>
                                        Chargement des produits...
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-500">
                                        Aucun produit trouvé.
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => {
                                    const isLowStock = product.quantity <= product.min_quantity_alert;
                                    const hasFds = !!fdsMap[product.id];
                                    const isUploading = uploadingId === product.id;

                                    return (
                                        <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-slate-900">{product.name}</div>
                                                {product.chemical_formula && <div className="text-xs text-slate-500">{product.chemical_formula}</div>}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-600">
                                                {product.cas_number || '-'}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-900 font-medium">
                                                {product.quantity} {product.unit}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-600">
                                                {product.location || '-'}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {isUploading ? (
                                                    <span className="inline-flex items-center justify-center" title="Upload en cours...">
                                                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                    </span>
                                                ) : hasFds ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <a
                                                            href={fdsMap[product.id]}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-l-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                                                            title="Ouvrir la FDS"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                            Voir
                                                        </a>
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => triggerUpload(product.id)}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-r-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 border-l-0 hover:bg-green-100 transition-colors cursor-pointer"
                                                                title="Remplacer la FDS"
                                                            >
                                                                <FileCheck className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    canEdit ? (
                                                        <button
                                                            onClick={() => triggerUpload(product.id)}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                                                            title="Cliquer pour uploader la FDS"
                                                        >
                                                            <Upload className="w-3.5 h-3.5" />
                                                            Ajouter
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 font-medium px-2 py-1 border border-slate-100 rounded-full bg-slate-50">Non dispo.</span>
                                                    )
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {isLowStock ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                                        Stock faible
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                        En stock
                                                    </span>
                                                )}
                                            </td>
                                            {canEdit && (
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link
                                                            to={`/products/${product.id}/edit`}
                                                            className="p-1.5 text-slate-400 hover:text-primary transition-colors rounded"
                                                            title="Modifier le produit"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(product.id)}
                                                            className="p-1.5 text-slate-400 hover:text-danger transition-colors rounded"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination placeholder */}
                {!loading && filteredProducts.length > 0 && (
                    <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 bg-slate-50">
                        <div>
                            Affichage de <span className="font-medium text-slate-900">{filteredProducts.length}</span> produit(s)
                        </div>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 border border-slate-300 rounded hover:bg-white disabled:opacity-50">Précédent</button>
                            <button className="px-3 py-1 border border-slate-300 rounded hover:bg-white disabled:opacity-50">Suivant</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
