export type RiskLevel = 'high' | 'medium' | 'low';

type GhsClass =
    | 'explosive'
    | 'flammable'
    | 'oxidizing'
    | 'compressed_gas'
    | 'corrosive'
    | 'toxic'
    | 'harmful'
    | 'environmental_hazard'
    | 'health_hazard';

export function getRiskLevel(pictograms: GhsClass[] | null | undefined): RiskLevel {
    if (!pictograms || pictograms.length === 0) return 'low';

    const highRisk: GhsClass[] = ['toxic', 'corrosive', 'explosive', 'flammable'];
    const mediumRisk: GhsClass[] = ['harmful', 'oxidizing', 'health_hazard'];

    if (pictograms.some((item) => highRisk.includes(item))) return 'high';
    if (pictograms.some((item) => mediumRisk.includes(item))) return 'medium';
    return 'low';
}

export function formatPublicDate(dateStr: string | null): string {
    if (!dateStr) return 'Non precise';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return 'Non precise';

    return parsed.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

