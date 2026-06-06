import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/database';
import { QrCode, Search, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function QrGenerator() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchProducts();
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

    const toggleProductSelection = (product: Product) => {
        if (selectedProducts.find(p => p.id === product.id)) {
            setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
        } else {
            setSelectedProducts([...selectedProducts, product]);
        }
    };

    const selectAllFiltered = () => {
        // Find products in filtered list not yet selected
        const newSelections = filteredProducts.filter(
            fp => !selectedProducts.find(sp => sp.id === fp.id)
        );
        setSelectedProducts([...selectedProducts, ...newSelections]);
    };

    const clearSelection = () => {
        setSelectedProducts([]);
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const originalContents = document.body.innerHTML;
        const printStyles = `
            <style>
                @media print {
                    @page { margin: 0; }
                    body { margin: 1cm; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
                    .qr-card { border: 1px solid #ccc; padding: 15px; text-align: center; page-break-inside: avoid; border-radius: 8px; }
                    .qr-title { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
                    .qr-subtitle { font-size: 10px; color: #666; margin-bottom: 10px; }
                }
            </style>
        `;

        document.body.innerHTML = printStyles + printContent.innerHTML;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload(); // Reload to restore React state bindings after innerHTML manipulation
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.cas_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Générateur de QR Codes</h1>
                    <p className="text-sm text-slate-500 mt-1">Sélectionnez des produits pour générer et imprimer leurs étiquettes QR</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        disabled={selectedProducts.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimer {selectedProducts.length > 0 && `(${selectedProducts.length})`}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                {/* Left side: Product Selection (2/3 width) */}
                <div className="lg:col-span-2 flex flex-col gap-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4 max-h-[calc(100vh-12rem)]">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full sm:w-80">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher un produit..."
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={selectAllFiltered}
                                className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors flex-1 sm:flex-none"
                            >
                                Tout sélectionner
                            </button>
                            <button
                                onClick={clearSelection}
                                className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors flex-1 sm:flex-none"
                            >
                                Tout vider
                            </button>
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 border border-slate-200 rounded-lg">
                        {loading ? (
                            <div className="flex justify-center items-center h-32 text-slate-500">
                                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
                                Chargement...
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                                    <tr>
                                        <th className="py-2 px-4 w-12 text-center"></th>
                                        <th className="py-2 px-4 text-xs font-semibold text-slate-500 uppercase">Produit</th>
                                        <th className="py-2 px-4 text-xs font-semibold text-slate-500 uppercase">CAS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredProducts.map(product => {
                                        const isSelected = selectedProducts.some(p => p.id === product.id);
                                        return (
                                            <tr
                                                key={product.id}
                                                onClick={() => toggleProductSelection(product)}
                                                className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-slate-50'}`}
                                            >
                                                <td className="py-2 px-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        readOnly
                                                        className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                                                    />
                                                </td>
                                                <td className="py-2 px-4">
                                                    <div className="font-medium text-slate-900 text-sm">{product.name}</div>
                                                    {product.chemical_formula && <div className="text-xs text-slate-500">{product.chemical_formula}</div>}
                                                </td>
                                                <td className="py-2 px-4 text-sm text-slate-600">
                                                    {product.cas_number || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                        {!loading && filteredProducts.length === 0 && (
                            <div className="flex justify-center items-center h-32 text-slate-500">
                                Aucun produit trouvé
                            </div>
                        )}
                    </div>
                </div>

                {/* Right side: Preview (1/3 width) */}
                <div className="lg:col-span-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 max-h-[calc(100vh-12rem)]">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-primary" />
                            Aperçu des étiquettes ({selectedProducts.length})
                        </h3>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1 bg-slate-100">
                        {selectedProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center gap-3">
                                <QrCode className="w-12 h-12 stroke-1" />
                                <p className="text-sm">Sélectionnez des produits à gauche pour générer leurs codes QR</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {selectedProducts.map(product => (
                                    <div key={product.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
                                        <div className="bg-white p-2 border border-slate-100 rounded">
                                            <QRCodeSVG
                                                value={`${window.location.origin}/product/public/${product.id}`}
                                                size={80}
                                                level="M"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 text-base truncate" title={product.name}>{product.name}</h4>
                                            <p className="text-xs text-slate-500 font-mono mt-1">{product.chemical_formula || 'Pas de formule'}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">CAS: {product.cas_number || 'N/A'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Hidden Print Container */}
            <div className="hidden">
                <div ref={printRef}>
                    <div className="qr-grid">
                        {selectedProducts.map(product => (
                            <div key={product.id} className="qr-card">
                                <div className="qr-title">{product.name}</div>
                                <div className="qr-subtitle">
                                    {product.chemical_formula && <span>{product.chemical_formula} • </span>}
                                    CAS: {product.cas_number || 'N/A'}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <QRCodeSVG
                                        value={`${window.location.origin}/product/public/${product.id}`}
                                        size={100}
                                        level="M"
                                    />
                                </div>
                                <div style={{ fontSize: '8px', color: '#999', marginTop: '5px' }}>ChimioLab ID: {product.id.split('-')[0]}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
