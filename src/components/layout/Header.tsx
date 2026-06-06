import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrateur',
    teacher: 'Enseignant',
    student: 'Étudiant',
};

export function Header() {
    const { profile } = useAuth();

    const displayName = profile?.name || 'Utilisateur';
    const roleLabel = profile?.role ? (ROLE_LABELS[profile.role] || profile.role) : '';

    return (
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-slate-800 hidden sm:block">
                    Bonjour, {displayName} 👋
                </h2>
            </div>

            <div className="flex items-center gap-4">
                <button className="relative p-2.5 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                    <Bell className="w-6 h-6" />
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-danger border-2 border-white"></span>
                </button>

                <div className="flex items-center gap-3 pl-5 border-l border-slate-200">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-slate-700">{displayName}</span>
                        {roleLabel && <span className="text-xs text-slate-500">{roleLabel}</span>}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    );
}
