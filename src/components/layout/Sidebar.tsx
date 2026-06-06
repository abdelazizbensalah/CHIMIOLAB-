import { NavLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import {
    Home,
    Package,
    Wrench,
    AlertTriangle,
    Calendar,
    Settings,
    QrCode,
    LogOut,
    DoorOpen,
    MessageSquare,
    GraduationCap,
    Beaker
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

const generalItems = [
    { name: 'Tableau de bord', to: '/', icon: Home, roles: ['admin', 'teacher', 'preparator'] },
];

const profItems = [
    { name: 'Sessions TP', to: '/tp-sessions', icon: Calendar, roles: ['admin', 'teacher', 'preparator'] },
    { name: 'Réclamations', to: '/requests', icon: MessageSquare, roles: ['admin', 'teacher', 'preparator'] },
];

const prepItems = [
    { name: 'Produits chimiques', to: '/products', icon: Package, roles: ['admin', 'teacher', 'preparator'] },
    { name: 'Matériels', to: '/materials', icon: Wrench, roles: ['admin', 'teacher', 'preparator'] },
    { name: 'Générateur QR', to: '/qr-generator', icon: QrCode, roles: ['admin', 'preparator'] },
    { name: 'Salles', to: '/rooms', icon: DoorOpen, roles: ['admin', 'preparator'] },
    { name: 'Alertes', to: '/alerts', icon: AlertTriangle, roles: ['admin', 'preparator'] },
];

const adminItems = [
    { name: 'Paramètres', to: '/settings', icon: Settings, roles: ['admin'] }
];

export function Sidebar() {
    const navigate = useNavigate();
    const { signOut, profile } = useAuth();

    const role = profile?.role || 'teacher';

    const handleSignOut = async () => {
        await signOut();
        navigate('/login', { replace: true });
    };

    const renderNavItems = (items: typeof generalItems) => {
        return items.filter(item => item.roles.includes(role)).map((item) => (
            <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive }) =>
                    cn(
                        "flex items-center gap-4 px-4 py-3 rounded-xl transition-colors duration-200 text-[15px]",
                        isActive
                            ? "bg-primary-light text-white font-semibold shadow-sm"
                            : "text-slate-300 hover:bg-primary-light/40 hover:text-white"
                    )
                }
            >
                <item.icon className="w-5.5 h-5.5 flex-shrink-0" />
                <span>{item.name}</span>
            </NavLink>
        ));
    };

    const visibleProfItems = profItems.filter(item => item.roles.includes(role));
    const visiblePrepItems = prepItems.filter(item => item.roles.includes(role));
    const visibleAdminItems = adminItems.filter(item => item.roles.includes(role));

    return (
        <div className="flex flex-col w-72 bg-primary text-white h-screen border-r border-primary-dark shadow-sm">
            <div className="flex items-center justify-center p-7 border-b border-primary-light">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <BoxIcon />
                    </div>
                    <span className="text-2xl font-bold tracking-wide">ChimioLab</span>
                </div>
            </div>

            <div className="flex-1 py-6 px-4 flex flex-col gap-1.5 overflow-y-auto">
                {renderNavItems(generalItems)}

                {visibleProfItems.length > 0 && (
                    <>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-4 mt-6 mb-2 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-secondary" />
                            <span>Professeur</span>
                        </div>
                        {renderNavItems(profItems)}
                    </>
                )}

                {visiblePrepItems.length > 0 && (
                    <>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-4 mt-6 mb-2 flex items-center gap-2">
                            <Beaker className="w-4 h-4 text-secondary" />
                            <span>Préparateur</span>
                        </div>
                        {renderNavItems(prepItems)}
                    </>
                )}

                {visibleAdminItems.length > 0 && (
                    <>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-4 mt-6 mb-2 flex items-center gap-2">
                            <Settings className="w-4 h-4 text-secondary" />
                            <span>Configuration</span>
                        </div>
                        {renderNavItems(adminItems)}
                    </>
                )}
            </div>

            <div className="p-4 border-t border-primary-light">
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-200 text-[15px]"
                >
                    <LogOut className="w-5.5 h-5.5" />
                    <span>Déconnexion</span>
                </button>
            </div>
        </div>
    );
}

function BoxIcon() {
    return (
        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
        </svg>
    );
}

