import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Beaker } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
    const navigate = useNavigate();
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name
                        }
                    }
                });

                if (signUpError) throw signUpError;
                setMessage('Compte créé ! Vous allez être connecté...');
                // We don't need to manually navigate if auth state change handles it, but let's wait a bit
                setTimeout(() => navigate('/'), 1500);
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) throw signInError;
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Erreur d\'authentification');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-accent flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="bg-primary/5 p-8 flex flex-col items-center justify-center border-b border-slate-100">
                    <div className="w-16 h-16 bg-primary text-white rounded-xl shadow-lg flex items-center justify-center mb-4">
                        <Beaker className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight text-center">ChimioLab</h1>
                    <p className="text-sm text-slate-500 text-center mt-1">Plateforme Didactique de Gestion des Produits Chimiques</p>
                </div>

                <form onSubmit={handleAuth} className="p-8 pb-8 flex flex-col gap-5">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    
                    {message && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{message}</span>
                        </div>
                    )}

                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="name">Nom complet</label>
                            <div className="relative">
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900 placeholder-slate-400"
                                    placeholder="Prénom Nom"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="email">Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900 placeholder-slate-400"
                                placeholder="prenom.nom@crmef.ma"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="password">Mot de passe</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900 placeholder-slate-400"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-2 w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? 'Chargement...' : (isSignUp ? 'Créer le compte' : 'Se connecter')}
                    </button>

                    <div className="flex flex-col gap-2 text-center text-sm mt-2">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="font-medium text-slate-600 hover:text-primary transition-colors"
                        >
                            {isSignUp ? 'Vous avez déjà un compte ? Se connecter' : 'Nouveau professeur ? S\'inscrire'}
                        </button>
                        
                        <a
                            href="/chimiolab/index.html"
                            className="font-medium text-slate-400 hover:text-slate-600"
                        >
                            Continuer en mode visiteur
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}
