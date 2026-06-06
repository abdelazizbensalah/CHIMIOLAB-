import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Material, MaterialCategory, MaterialCondition } from '../types/database';
import { useAuth } from '../context/AuthContext';

type CategoryFilter = 'all' | MaterialCategory;

const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
    { value: 'all', label: 'Tout' },
    { value: 'verrerie', label: 'Verrerie' },
    { value: 'mesure', label: 'Mesure' },
    { value: 'securite', label: 'Sécurité' },
    { value: 'electricite', label: 'Électricité' },
    { value: 'chauffage', label: 'Chauffage' },
];

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
    verrerie: 'Verrerie',
    mesure: 'Mesure',
    securite: 'Sécurité',
    electricite: 'Électricité',
    chauffage: 'Chauffage',
};

const DEFAULT_ICONS: Record<MaterialCategory, string> = {
    verrerie: '🧪',
    mesure: '📏',
    securite: '🛡️',
    electricite: '⚡',
    chauffage: '🔥',
};

const CONDITION_LABELS: Record<MaterialCondition, string> = {
    good: 'Bon état',
    maintenance: 'À entretenir',
    out_of_service: 'Hors service',
};

const CONDITION_CLASSES: Record<MaterialCondition, string> = {
    good: 'bg-green-50 text-green-700 border-green-200',
    maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
    out_of_service: 'bg-red-50 text-red-700 border-red-200',
};

export default function Materials() {
    const { profile } = useAuth();
    const canEdit = profile?.role === 'admin' || profile?.role === 'preparator';

    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

    useEffect(() => {
        void fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('materials')
                .select('*')
                .order('category', { ascending: true })
                .order('name', { ascending: true });

            if (error) throw error;
            setMaterials((data || []) as Material[]);
        } catch (error) {
            console.error('Error fetching materials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce matériel ?')) return;

        try {
            const { error } = await supabase
                .from('materials')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setMaterials((current) => current.filter((item) => item.id !== id));
        } catch (error) {
            console.error('Error deleting material:', error);
            alert('Erreur lors de la suppression');
        }
    };

    const filteredMaterials = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return materials.filter((material) => {
            const matchesCategory = activeCategory === 'all' || material.category === activeCategory;
            const matchesSearch =
                query.length === 0 ||
                material.name.toLowerCase().includes(query) ||
                (material.description || '').toLowerCase().includes(query);

            return matchesCategory && matchesSearch;
        });
    }, [activeCategory, materials, searchQuery]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Matériels</h1>
                    <p className="text-sm text-slate-500 mt-1">Gérez la verrerie, la mesure, la sécurité et les équipements du laboratoire</p>
                </div>

                {canEdit && (
                    <Link
                        to="/materials/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors w-fit"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau matériel
                    </Link>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col gap-4 bg-slate-50">
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                        <div className="relative w-full lg:max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher par nom ou description..."
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Filter className="w-4 h-4" />
                            {filteredMaterials.length} matériel(s)
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {CATEGORY_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setActiveCategory(option.value)}
                                className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                                    activeCategory === option.value
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-slate-600 border-slate-300 hover:border-primary/40 hover:text-primary'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="py-12 text-center text-slate-500">
                            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                            Chargement des matériels...
                        </div>
                    ) : filteredMaterials.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-slate-300 rounded-xl text-slate-500">
                            Aucun matériel trouvé.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredMaterials.map((material) => (
                                <article key={material.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl">
                                                {material.icon || DEFAULT_ICONS[material.category]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                                    {CATEGORY_LABELS[material.category]}
                                                </p>
                                                <h2 className="text-xl font-bold text-slate-800 mt-1">{material.name}</h2>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="mt-4 text-slate-500 min-h-[56px]">
                                        {material.description || 'Aucune description renseignée.'}
                                    </p>

                                    <div className="mt-5 flex items-center justify-between gap-3">
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 font-semibold">
                                            Qté {material.quantity} {material.quantity_unit || ''}
                                        </span>
                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full border font-semibold ${CONDITION_CLASSES[material.condition_status]}`}>
                                            {CONDITION_LABELS[material.condition_status]}
                                        </span>
                                    </div>

                                    {canEdit && (
                                        <div className="mt-5 flex items-center justify-end gap-2">
                                            <Link
                                                to={`/materials/${material.id}/edit`}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                                Modifier
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(material.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Supprimer
                                            </button>
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
