import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function loadEnvFile() {
  const envPath = path.join(projectRoot, '.env');
  const raw = await fs.readFile(envPath, 'utf8');
  const values = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    values[key] = value;
  }

  return values;
}

function requireEnv(env, key) {
  const value = process.env[key] || env[key];
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${key}`);
  }
  return value;
}

async function authenticate(supabase) {
  const anonymousAttempt = await supabase.auth.signInAnonymously();
  if (!anonymousAttempt.error && anonymousAttempt.data.session) {
    return {
      mode: 'anonymous',
      userId: anonymousAttempt.data.user?.id ?? null,
    };
  }

  const signupEmail = `codex-seed-${Date.now()}@example.com`;
  const signupPassword = `Codex!${Date.now()}Aa1`;
  const signupAttempt = await supabase.auth.signUp({
    email: signupEmail,
    password: signupPassword,
    options: {
      data: {
        full_name: 'Codex Seed',
      },
    },
  });

  if (signupAttempt.error) {
    throw new Error(
      `Impossible d'obtenir une session authentifiee. Echec anonymous: ${anonymousAttempt.error?.message || 'inconnu'}. Echec signUp: ${signupAttempt.error.message}`
    );
  }

  if (!signupAttempt.data.session) {
    throw new Error(
      `Inscription reussie pour ${signupEmail}, mais aucune session n'a ete retournee. La confirmation email est probablement activee.`
    );
  }

  return {
    mode: 'signup',
    userId: signupAttempt.data.user?.id ?? null,
    email: signupEmail,
  };
}

async function deleteAllRows(supabase, table) {
  const { error } = await supabase.from(table).delete().not('id', 'is', null);
  if (error) {
    throw new Error(`Suppression impossible sur ${table}: ${error.message}`);
  }
}

function mustGet(map, key, label) {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Reference introuvable pour ${label}: ${key}`);
  }
  return value;
}

async function main() {
  const env = await loadEnvFile();
  const supabaseUrl = requireEnv(env, 'VITE_SUPABASE_URL');
  const supabaseKey = requireEnv(env, 'VITE_SUPABASE_ANON_KEY');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const authInfo = await authenticate(supabase);
  console.log(`Session obtenue via ${authInfo.mode}.`);

  const deletionOrder = [
    'quiz_results',
    'tp_consumption_logs',
    'tp_checklist_items',
    'quiz',
    'alerts',
    'activity_logs',
    'tp_materials',
    'tp_reactifs',
    'tp_sessions',
    'safety_sheets',
    'products',
    'materials',
  ];

  for (const table of deletionOrder) {
    await deleteAllRows(supabase, table);
  }

  const productsPayload = [
    {
      name: 'Acide chlorhydrique 37%',
      chemical_formula: 'HCl',
      cas_number: '7647-01-0',
      quantity: 500,
      unit: 'ml',
      min_quantity_alert: 100,
      expiry_date: '2027-06-30',
      location: 'A3-E2',
      supplier: 'Sigma-Aldrich',
      qr_code_url: null,
    },
    {
      name: 'Hydroxyde de sodium 0.1 mol/L',
      chemical_formula: 'NaOH',
      cas_number: '1310-73-2',
      quantity: 1000,
      unit: 'ml',
      min_quantity_alert: 200,
      expiry_date: '2028-02-15',
      location: 'A3-E4',
      supplier: 'Merck',
      qr_code_url: null,
    },
    {
      name: 'Ethanol 95%',
      chemical_formula: 'C2H5OH',
      cas_number: '64-17-5',
      quantity: 2,
      unit: 'L',
      min_quantity_alert: 0.5,
      expiry_date: '2027-11-20',
      location: 'A2-E3',
      supplier: 'Carlo Erba',
      qr_code_url: null,
    },
  ];

  const { data: createdProducts, error: productsError } = await supabase
    .from('products')
    .insert(productsPayload)
    .select('id, name');

  if (productsError || !createdProducts) {
    throw new Error(`Insertion des produits impossible: ${productsError?.message || 'aucune donnee retournee'}`);
  }

  const productByName = new Map(createdProducts.map((item) => [item.name, item.id]));

  const safetySheetsPayload = [
    {
      product_id: mustGet(productByName, 'Acide chlorhydrique 37%', 'safety_sheets.product_id'),
      pictograms: ['corrosive', 'toxic', 'harmful'],
      epi_required: ['gloves', 'safety_glasses', 'lab_coat'],
      storage_rules: 'Conserver dans une armoire acides, bien fermee et ventilee.',
      physical_properties: {
        appearance: 'Liquide incolore',
        density: 1.19,
        boiling_point: 48,
        solubility_in_water: 'Miscible',
      },
      pdf_url: null,
      ghs_class: 'corrosive',
    },
    {
      product_id: mustGet(productByName, 'Hydroxyde de sodium 0.1 mol/L', 'safety_sheets.product_id'),
      pictograms: ['corrosive', 'harmful'],
      epi_required: ['gloves', 'safety_glasses', 'lab_coat'],
      storage_rules: 'Conserver separe des acides et dans un recipient bien ferme.',
      physical_properties: {
        appearance: 'Solution incolore',
        ph: 13.5,
        density: 1.01,
        solubility_in_water: 'Miscible',
      },
      pdf_url: null,
      ghs_class: 'corrosive',
    },
    {
      product_id: mustGet(productByName, 'Ethanol 95%', 'safety_sheets.product_id'),
      pictograms: ['flammable', 'harmful'],
      epi_required: ['gloves', 'safety_glasses', 'lab_coat'],
      storage_rules: 'Stocker loin des sources de chaleur et dans une zone ventilee.',
      physical_properties: {
        appearance: 'Liquide limpide',
        density: 0.789,
        boiling_point: 78.3,
        flash_point: 13,
        solubility_in_water: 'Miscible',
      },
      pdf_url: null,
      ghs_class: 'flammable',
    },
  ];

  const { error: safetyError } = await supabase.from('safety_sheets').insert(safetySheetsPayload);
  if (safetyError) {
    throw new Error(`Insertion des fiches de securite impossible: ${safetyError.message}`);
  }

  const materialsPayload = [
    {
      name: 'Erlenmeyer 250 ml',
      category: 'verrerie',
      description: 'Flacon conique en verre borosilicate pour titrages et melanges.',
      quantity: 24,
      quantity_unit: 'pieces',
      condition_status: 'good',
      icon: '🧪',
    },
    {
      name: 'Burette graduee 50 ml',
      category: 'verrerie',
      description: 'Burette avec robinet, precision ±0.05 ml.',
      quantity: 12,
      quantity_unit: 'pieces',
      condition_status: 'good',
      icon: '🔬',
    },
    {
      name: 'pH-metre numerique',
      category: 'mesure',
      description: 'Plage 0-14 avec electrode en verre pour mesures de pH.',
      quantity: 6,
      quantity_unit: 'appareils',
      condition_status: 'maintenance',
      icon: '📏',
    },
  ];

  const { data: createdMaterials, error: materialsError } = await supabase
    .from('materials')
    .insert(materialsPayload)
    .select('id, name');

  if (materialsError || !createdMaterials) {
    throw new Error(`Insertion des materiels impossible: ${materialsError?.message || 'aucune donnee retournee'}`);
  }

  const materialByName = new Map(createdMaterials.map((item) => [item.name, item.id]));

  const sessionsPayload = [
    {
      code: 'TP-001',
      title: 'Dosage acido-basique',
      level: 'lycée',
      subject: null,
      date: '2026-03-10',
      duration_minutes: 120,
      student_count: 24,
      teacher_id: null,
      objectives: "Determiner la concentration d'HCl par titrage avec NaOH.",
      status: 'planned',
    },
    {
      code: 'TP-002',
      title: 'Mesure du pH de solutions aqueuses',
      level: 'collège',
      subject: null,
      date: '2026-03-17',
      duration_minutes: 90,
      student_count: 30,
      teacher_id: null,
      objectives: 'Comparer le pH de solutions acides, basiques et neutres.',
      status: 'planned',
    },
    {
      code: 'TP-003',
      title: 'Chromatographie sur papier',
      level: 'CRMEF',
      subject: null,
      date: '2026-03-05',
      duration_minutes: 120,
      student_count: 18,
      teacher_id: null,
      objectives: 'Separer des pigments et interpreter un resultat de chromatographie.',
      status: 'done',
    },
  ];

  const { data: createdSessions, error: sessionsError } = await supabase
    .from('tp_sessions')
    .insert(sessionsPayload)
    .select('id, code');

  if (sessionsError || !createdSessions) {
    throw new Error(`Insertion des sessions TP impossible: ${sessionsError?.message || 'aucune donnee retournee'}`);
  }

  const sessionByCode = new Map(createdSessions.map((item) => [item.code, item.id]));

  const reactifsPayload = [
    {
      tp_session_id: mustGet(sessionByCode, 'TP-001', 'tp_reactifs.tp_session_id'),
      product_id: mustGet(productByName, 'Acide chlorhydrique 37%', 'tp_reactifs.product_id'),
      planned_quantity: 100,
      used_quantity: null,
      unit: 'ml',
    },
    {
      tp_session_id: mustGet(sessionByCode, 'TP-001', 'tp_reactifs.tp_session_id'),
      product_id: mustGet(productByName, 'Hydroxyde de sodium 0.1 mol/L', 'tp_reactifs.product_id'),
      planned_quantity: 200,
      used_quantity: null,
      unit: 'ml',
    },
    {
      tp_session_id: mustGet(sessionByCode, 'TP-002', 'tp_reactifs.tp_session_id'),
      product_id: mustGet(productByName, 'Acide chlorhydrique 37%', 'tp_reactifs.product_id'),
      planned_quantity: 50,
      used_quantity: null,
      unit: 'ml',
    },
    {
      tp_session_id: mustGet(sessionByCode, 'TP-002', 'tp_reactifs.tp_session_id'),
      product_id: mustGet(productByName, 'Hydroxyde de sodium 0.1 mol/L', 'tp_reactifs.product_id'),
      planned_quantity: 50,
      used_quantity: null,
      unit: 'ml',
    },
    {
      tp_session_id: mustGet(sessionByCode, 'TP-003', 'tp_reactifs.tp_session_id'),
      product_id: mustGet(productByName, 'Acide chlorhydrique 37%', 'tp_reactifs.product_id'),
      planned_quantity: 20,
      used_quantity: 20,
      unit: 'ml',
    },
    {
      tp_session_id: mustGet(sessionByCode, 'TP-003', 'tp_reactifs.tp_session_id'),
      product_id: mustGet(productByName, 'Ethanol 95%', 'tp_reactifs.product_id'),
      planned_quantity: 200,
      used_quantity: 180,
      unit: 'ml',
    },
  ];

  const { error: reactifsError } = await supabase.from('tp_reactifs').insert(reactifsPayload);
  if (reactifsError) {
    throw new Error(`Insertion des reactifs TP impossible: ${reactifsError.message}`);
  }

  const tpMaterialsPayload = [
    {
      tp_session_id: mustGet(sessionByCode, 'TP-001', 'tp_materials.tp_session_id'),
      material_id: mustGet(materialByName, 'Burette graduee 50 ml', 'tp_materials.material_id'),
      required_quantity: 6,
    },
    {
      tp_session_id: mustGet(sessionByCode, 'TP-001', 'tp_materials.tp_session_id'),
      material_id: mustGet(materialByName, 'Erlenmeyer 250 ml', 'tp_materials.material_id'),
      required_quantity: 12,
    },
    {
      tp_session_id: mustGet(sessionByCode, 'TP-002', 'tp_materials.tp_session_id'),
      material_id: mustGet(materialByName, 'pH-metre numerique', 'tp_materials.material_id'),
      required_quantity: 6,
    },
    {
      tp_session_id: mustGet(sessionByCode, 'TP-003', 'tp_materials.tp_session_id'),
      material_id: mustGet(materialByName, 'Erlenmeyer 250 ml', 'tp_materials.material_id'),
      required_quantity: 6,
    },
  ];

  const { error: tpMaterialsError } = await supabase.from('tp_materials').insert(tpMaterialsPayload);
  if (tpMaterialsError) {
    throw new Error(`Insertion des materiels TP impossible: ${tpMaterialsError.message}`);
  }

  console.log('Jeu de donnees d exemple charge avec succes.');
  console.log(
    JSON.stringify(
      {
        products: productsPayload.map((item) => item.name),
        materials: materialsPayload.map((item) => item.name),
        tpSessions: sessionsPayload.map((item) => `${item.code} - ${item.title}`),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
