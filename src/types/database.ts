export type UserRole = 'admin' | 'teacher' | 'preparator';

export interface User {
    id: string; // UUID from Auth
    name: string;
    email: string;
    role: UserRole;
    created_at: string;
}

export type Unit = 'g' | 'ml' | 'L' | 'kg' | 'mol';
export type GHSClass = 'explosive' | 'flammable' | 'oxidizing' | 'compressed_gas' | 'corrosive' | 'toxic' | 'harmful' | 'environmental_hazard' | 'health_hazard';
export type EpiRequired = 'gloves' | 'safety_glasses' | 'lab_coat' | 'face_shield' | 'fume_hood' | 'respirator';
export type MaterialCategory = 'verrerie' | 'mesure' | 'securite' | 'electricite' | 'chauffage';
export type MaterialCondition = 'good' | 'maintenance' | 'out_of_service';

export interface Room {
    id: string;
    name: string;
    created_at: string;
}

export type RequestType = 'product' | 'material' | 'other';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface Request {
    id: string;
    teacher_id: string;
    title: string;
    description: string | null;
    request_type: RequestType;
    status: RequestStatus;
    created_at: string;
}

export interface Product {
    id: string;
    name: string;
    chemical_formula: string;
    cas_number: string | null;
    quantity: number;
    unit: Unit;
    min_quantity_alert: number;
    expiry_date: string | null;
    location: string; // e.g., 'A1-Shelf2'
    supplier: string | null;
    qr_code_url: string | null;
    created_at: string;
}

export interface PhysicalProperties {
    molecular_weight?: number;
    melting_point?: number;
    boiling_point?: number;
    ph?: number;
    density?: number;
    flash_point?: number;
    solubility_in_water?: string;
    appearance?: string;
}

export interface SafetySheet {
    id: string;
    product_id: string;
    pictograms: GHSClass[]; // JSON array
    epi_required: EpiRequired[]; // JSON array
    storage_rules: string | null;
    physical_properties: PhysicalProperties | null; // JSONB
    pdf_url: string | null;
    ghs_class: string | null;
}

export interface Material {
    id: string;
    name: string;
    category: MaterialCategory;
    description: string | null;
    quantity: number;
    quantity_unit: string | null;
    condition_status: MaterialCondition;
    icon: string | null;
    created_at: string;
}

export type Level = 'collège' | 'lycée' | 'CRMEF';
export type TPSessionStatus = 'planned' | 'done';

export interface TPSession {
    id: string;
    code: string;
    title: string;
    level: Level;
    subject: string | null;
    date: string;
    duration_minutes: number;
    student_count: number;
    teacher_id: string | null;
    room: string | null;
    start_time: string | null;
    end_time: string | null;
    objectives: string | null;
    status: TPSessionStatus;
    created_at: string;
}

export interface TPReactif {
    id: string;
    tp_session_id: string;
    product_id: string;
    planned_quantity: number;
    used_quantity: number | null;
    unit: Unit;
}

export interface TPMaterial {
    id: string;
    tp_session_id: string;
    material_id: string;
    required_quantity: number;
}

export interface Quiz {
    id: string;
    tp_session_id: string;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: 'a' | 'b' | 'c' | 'd';
    explanation: string | null;
}

export interface QuizResult {
    id: string;
    quiz_id: string;
    student_id: string;
    answer: 'a' | 'b' | 'c' | 'd';
    is_correct: boolean;
    answered_at: string;
}

export type AlertType = 'expired' | 'low_stock' | 'missing_fds' | 'incompatibility';
export type AlertSeverity = 'red' | 'orange' | 'yellow';

export interface Alert {
    id: string;
    product_id: string;
    type: AlertType;
    message: string;
    severity: AlertSeverity;
    is_resolved: boolean;
    created_at: string;
}

export interface ActivityLog {
    id: string;
    user_id: string;
    action: string;
    product_id: string | null;
    tp_session_id: string | null;
    details: string | null;
    created_at: string;
}
