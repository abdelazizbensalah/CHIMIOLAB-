import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    colorClass: string;
    onClick?: () => void;
}

export function StatCard({ title, value, icon: Icon, colorClass, onClick }: StatCardProps) {
    const baseClass = "bg-white rounded-2xl border border-slate-200 p-7 flex items-center gap-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.08)]";
    const interactiveClass = onClick ? "w-full text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : "";

    return (
        <button
            type="button"
            className={`${baseClass} ${interactiveClass}`}
            onClick={onClick}
            disabled={!onClick}
        >
            <div className={`p-4 rounded-xl bg-opacity-10 ${colorClass.replace('text-', 'bg-')} ${colorClass}`}>
                <Icon className="w-7 h-7" />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1.5">{title}</p>
                <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
            </div>
        </button>
    );
}
