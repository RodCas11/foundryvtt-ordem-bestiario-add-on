const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hasMojibake, repairMojibakeString, repairMojibakeDeep } = require('./encoding-utils');

const root = path.resolve(__dirname, '..');
const examplePath = path.join(root, 'input', 'zumbidesangue.json');
const creaturesPath = path.join(root, 'input', 'creatures.normalized.json');
const overridesPath = path.join(root, 'input', 'token-overrides.json');
const outputDir = path.join(root, 'output');
const actorsPath = path.join(outputDir, 'foundry-actors.json');
const reportPath = path.join(outputDir, 'report.md');
const tokenReportPath = path.join(outputDir, 'token-report.md');
const tokenVariantsReportPath = path.join(outputDir, 'token-variants-report.md');
const resistancesReportPath = path.join(outputDir, 'resistances-report.md');
const abilitiesReportPath = path.join(outputDir, 'abilities-report.md');
const skillsReportPath = path.join(outputDir, 'skills-report.md');
const tokensNormalizedDir = path.join(root, 'assets', 'tokens-normalized');
const tokensOriginalDir = path.join(root, 'assets', 'tokens');
const foundryTokenBaseNormalized = 'modules/ordem-bestiario/assets/tokens-normalized';
const foundryTokenBaseOriginal = 'modules/ordem-bestiario/assets/tokens';

const onlyExportable = process.argv.includes('--only-exportable');

const damageTypeAliases = {
  corte: 'cuttingDamage', cutting: 'cuttingDamage', cuttingdamage: 'cuttingDamage',
  impacto: 'impactDamage', impact: 'impactDamage', impactdamage: 'impactDamage',
  perfuracao: 'piercingDamage', 'perfuração': 'piercingDamage', piercing: 'piercingDamage', piercingdamage: 'piercingDamage',
  balistico: 'ballisticDamage', 'balístico': 'ballisticDamage', ballistic: 'ballisticDamage', ballisticdamage: 'ballisticDamage',
  fogo: 'fireDamage', fire: 'fireDamage', firedamage: 'fireDamage',
  eletricidade: 'eletricDamage', eletrico: 'eletricDamage', elétrico: 'eletricDamage', electric: 'eletricDamage', eletricdamage: 'eletricDamage',
  frio: 'coldDamage', cold: 'coldDamage', colddamage: 'coldDamage',
  quimico: 'chemicalDamage', químico: 'chemicalDamage', chemical: 'chemicalDamage', chemicaldamage: 'chemicalDamage',
  mental: 'mentalDamage', mentaldamage: 'mentalDamage',
  sangue: 'bloodDamage', blood: 'bloodDamage', blooddamage: 'bloodDamage',
  morte: 'deathDamage', death: 'deathDamage', deathdamage: 'deathDamage',
  conhecimento: 'knowledgeDamage', knowledge: 'knowledgeDamage', knowledgedamage: 'knowledgeDamage',
  energia: 'energyDamage', energy: 'energyDamage', energydamage: 'energyDamage'
};

const TOKEN_EXTENSIONS_PRIORITY = ['.webp', '.png', '.jpg', '.jpeg', '.webm'];
const IRRELEVANT_TOKEN_WORDS = new Set(['miniatura', 'transformado', 'por', 'token', 'ordem', 'paranormal', 'em']);
const COMMON_CONNECTOR_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'o', 'a']);
const FIXED_SKILLS = new Set(['fighting', 'aim', 'resilience', 'reflexes', 'will', 'initiative', 'perception']);
const EXTRA_SKILL_PRIORITY = [
  'athletics', 'stealth', 'deception', 'occultism', 'science', 'survival', 'religion', 'tactics', 'technology',
  'medicine', 'pilot', 'acrobatics', 'crime', 'animalHandling', 'arts', 'diplomacy', 'intimidation', 'intuition'
];
const EXTRA_SKILL_META = {
  athletics: { name: 'Atletismo', attr: 'str' },
  deception: { name: 'Enganação', attr: 'pre' },
  stealth: { name: 'Furtividade', attr: 'dex' },
  occultism: { name: 'Ocultismo', attr: 'int' },
  science: { name: 'Ciências', attr: 'int' },
  survival: { name: 'Sobrevivência', attr: 'int' },
  religion: { name: 'Religião', attr: 'pre' },
  tactics: { name: 'Tática', attr: 'int' },
  technology: { name: 'Tecnologia', attr: 'int' },
  medicine: { name: 'Medicina', attr: 'int' },
  pilot: { name: 'Pilotagem', attr: 'dex' },
  acrobatics: { name: 'Acrobacia', attr: 'dex' },
  crime: { name: 'Crime', attr: 'dex' },
  animalHandling: { name: 'Adestramento', attr: 'pre' },
  arts: { name: 'Artes', attr: 'pre' },
  diplomacy: { name: 'Diplomacia', attr: 'pre' },
  intimidation: { name: 'Intimidação', attr: 'pre' },
  intuition: { name: 'Intuição', attr: 'pre' }
};

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function genId() { return crypto.randomBytes(8).toString('hex'); }
function asKey(v) { return String(v ?? '').trim().toLowerCase(); }
function normalizeSkillKey(v) { return String(v ?? '').replace(/[^a-zA-Z]/g, '').toLowerCase(); }
function mapDamageType(v) { return damageTypeAliases[asKey(v)] || v || 'cuttingDamage'; }
function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')); }
function normalizeDamageText(v) { return normalizeBaseString(v).replace(/[.,;:()[\]{}]/g, ' ').replace(/\s+/g, ' ').trim(); }

function mapDamageTypeNameToKey(name) {
  const t = normalizeDamageText(name);
  const direct = {
    corte: 'cuttingDamage', cortante: 'cuttingDamage',
    impacto: 'impactDamage',
    perfuracao: 'piercingDamage', perfurante: 'piercingDamage',
    balistico: 'ballisticDamage', balistica: 'ballisticDamage',
    fogo: 'fireDamage',
    frio: 'coldDamage',
    eletricidade: 'eletricDamage', eletrico: 'eletricDamage', eletrica: 'eletricDamage',
    quimico: 'chemicalDamage', quimica: 'chemicalDamage',
    mental: 'mentalDamage',
    sangue: 'bloodDamage',
    morte: 'deathDamage',
    conhecimento: 'knowledgeDamage',
    energia: 'energyDamage'
  };
  return direct[t] || null;
}

function knownDamageKeys() {
  return [
    'cuttingDamage', 'impactDamage', 'piercingDamage', 'ballisticDamage',
    'fireDamage', 'coldDamage', 'eletricDamage', 'chemicalDamage',
    'mentalDamage', 'bloodDamage', 'deathDamage', 'knowledgeDamage', 'energyDamage'
  ];
}

function ensureResistanceShape(system) {
  system.resistances = system.resistances || {};
  for (const k of knownDamageKeys()) {
    if (!system.resistances[k] || typeof system.resistances[k] !== 'object') {
      system.resistances[k] = { value: 0, vulnerable: false, immune: false };
    } else {
      if (typeof system.resistances[k].value !== 'number') system.resistances[k].value = 0;
      if (typeof system.resistances[k].vulnerable !== 'boolean') system.resistances[k].vulnerable = false;
      if (typeof system.resistances[k].immune !== 'boolean') system.resistances[k].immune = false;
    }
  }
}

function extractDamageKeysFromTextSegment(text) {
  const normalized = normalizeDamageText(text).replace(/\be\b/g, ' ');
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const one = mapDamageTypeNameToKey(tokens[i]);
    if (one) out.add(one);
    if (i + 1 < tokens.length) {
      const two = mapDamageTypeNameToKey(`${tokens[i]} ${tokens[i + 1]}`);
      if (two) out.add(two);
    }
  }
  return [...out];
}

function applyResistenciasTexto(actor, resistenciasTexto, parseWarnings) {
  const applied = [];
  const txt = String(resistenciasTexto || '').trim();
  if (!txt) return applied;
  const s = actor.system;
  ensureResistanceShape(s);

  if (/^\s*dano\s+\d+/i.test(normalizeDamageText(txt))) {
    parseWarnings.push('resistência genérica não possui campo granular no sistema');
    return applied;
  }

  const segments = txt.split(',').map((x) => x.trim()).filter(Boolean);
  const pendingKeys = [];
  for (const seg of segments) {
    const n = normalizeDamageText(seg);
    const m = n.match(/(\d+)$/);
    const value = m ? Number(m[1]) : null;
    const head = m ? n.slice(0, n.length - m[0].length).trim() : n;
    const keys = extractDamageKeysFromTextSegment(head);

    if (!keys.length && value != null && pendingKeys.length) {
      for (const k of pendingKeys.splice(0, pendingKeys.length)) {
        s.resistances[k].value = value;
        applied.push(`${k}:${value}`);
      }
      continue;
    }
    if (!keys.length) continue;

    if (value == null) {
      for (const k of keys) {
        if (!pendingKeys.includes(k)) pendingKeys.push(k);
      }
      continue;
    }

    const all = [...pendingKeys.splice(0, pendingKeys.length), ...keys];
    for (const k of [...new Set(all)]) {
      s.resistances[k].value = value;
      applied.push(`${k}:${value}`);
    }
  }
  if (pendingKeys.length) parseWarnings.push(`resistências sem valor numérico: ${pendingKeys.join(', ')}`);
  return applied;
}

function applyVulnerabilidadesTexto(actor, vulnerabilidadesTexto) {
  const applied = [];
  const txt = String(vulnerabilidadesTexto || '').trim();
  if (!txt) return applied;
  const s = actor.system;
  ensureResistanceShape(s);
  for (const k of extractDamageKeysFromTextSegment(txt)) {
    s.resistances[k].vulnerable = true;
    applied.push(k);
  }
  return applied;
}

function applyImunidadesTexto(actor, imunidadesTexto, parseWarnings) {
  const applied = [];
  const txt = String(imunidadesTexto || '').trim();
  if (!txt) return applied;
  const s = actor.system;
  ensureResistanceShape(s);
  const n = normalizeDamageText(txt);

  if (/^dano\b/.test(n) && /exceto/.test(n)) {
    const exc = extractDamageKeysFromTextSegment(n.split('exceto')[1] || '');
    for (const k of knownDamageKeys()) {
      if (!exc.includes(k)) {
        s.resistances[k].immune = true;
        applied.push(k);
      }
    }
    parseWarnings.push('imunidade genérica com exceção aplicada para todos os tipos conhecidos');
    return applied;
  }
  if (/^dano\b/.test(n) && !extractDamageKeysFromTextSegment(n).length) {
    parseWarnings.push('imunidade genérica "Dano" sem campo específico granular');
    return applied;
  }
  for (const k of extractDamageKeysFromTextSegment(txt)) {
    s.resistances[k].immune = true;
    applied.push(k);
  }
  return applied;
}

function normalizeBaseString(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeExtraSkillKey(rawKey) {
  const cleaned = normalizeSkillKey(rawKey);
  const aliases = {
    animalhandling: 'animalHandling'
  };
  for (const key of Object.keys(EXTRA_SKILL_META)) {
    if (normalizeSkillKey(key) === cleaned) return key;
  }
  return aliases[cleaned] || null;
}

function getExtraSkills(pericias) {
  const extras = [];
  if (!pericias || typeof pericias !== 'object') return extras;
  for (const [rawKey, rawValue] of Object.entries(pericias)) {
    if (typeof rawValue !== 'number') continue;
    if (FIXED_SKILLS.has(rawKey)) continue;
    const key = normalizeExtraSkillKey(rawKey);
    if (!key) continue;
    const meta = EXTRA_SKILL_META[key];
    extras.push({ key, name: meta.name, attr: meta.attr, value: rawValue });
  }
  const priorityIndex = new Map(EXTRA_SKILL_PRIORITY.map((k, i) => [k, i]));
  extras.sort((a, b) => (priorityIndex.get(a.key) ?? 999) - (priorityIndex.get(b.key) ?? 999));
  return extras;
}

function formatExtraSkillDice(attrKey, value) {
  const d20Map = { str: 4, dex: 4, pre: 3, int: 3, vit: 3 };
  const dice = d20Map[attrKey] || 3;
  return `${dice}d20+${value}`;
}

function buildExtraSkillsHtml(extraSkills) {
  const lines = extraSkills.map((x) => `${x.name} ${formatExtraSkillDice(x.attr, x.value)}`);
  return `<p><strong>PERÍCIAS EXTRAS</strong><br>${lines.join('<br>')}</p>`;
}

function cleanAbilityName(name) {
  let text = String(name ?? '').trim();
  text = text.replace(/^["']+/, '').trim();
  return text;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toAbilityDescriptionHtml(description) {
  const text = String(description ?? '').trim();
  if (!text) return '<p></p>';
  if (/^\s*<p[\s>]/i.test(text) || /^\s*<div[\s>]/i.test(text)) return text;
  return `<p>${escapeHtml(text).replace(/\r?\n/g, '<br>')}</p>`;
}

function toPassiveEffectDescriptionHtml(description) {
  const text = String(description ?? '').trim();
  if (!text) return '<div><p></p></div>';
  if (/^\s*<div[\s>]/i.test(text)) return text;
  if (/^\s*<p[\s>]/i.test(text)) return `<div>${text}</div>`;
  return `<div><p>${escapeHtml(text).replace(/\r?\n/g, '<br>')}</p></div>`;
}

function normalizeAbilityTipo(tipo) {
  const raw = normalizeBaseString(String(tipo ?? '').trim())
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return 'padrao';
  if (['passiva', 'passivo', 'passive'].includes(raw)) return 'passiva';
  if (['padrao', 'acao padrao', 'standard'].includes(raw)) return 'padrao';
  if (['movimento', 'movement'].includes(raw)) return 'movimento';
  if (['reacao', 'reaction'].includes(raw)) return 'reacao';
  if (['livre', 'free'].includes(raw)) return 'livre';
  if (['completa', 'full'].includes(raw)) return 'completa';
  return 'padrao';
}

const ABILITY_ACTIVATION_MAP = {
  padrao: 'default',
  movimento: 'free',
  reacao: 'reaction',
  livre: 'free',
  completa: 'complete'
};

function createAbilityItem(habilidade, index, tipoNormalizado) {
  const cleanedName = cleanAbilityName(habilidade?.nome);
  const fallbackName = `Habilidade ${index + 1}`;
  const activation = ABILITY_ACTIVATION_MAP[tipoNormalizado] || 'default';
  return {
    name: cleanedName || fallbackName,
    type: 'ability',
    system: {
      id: 0,
      abilityType: '',
      preRequisite: '',
      description: toAbilityDescriptionHtml(habilidade?.descricao),
      activation
    },
    img: 'icons/svg/item-bag.svg',
    effects: [],
    folder: null,
    sort: 100000 + (index * 1000),
    flags: {
      'ordem-bestiario': {
        sourceType: 'manualAbility',
        tipoOriginal: habilidade?.tipo ?? '',
        tipoNormalizado,
        activation,
        sourceData: repairMojibakeDeep(habilidade || {})
      }
    },
    ownership: {
      default: 0
    }
  };
}

function createPassiveEffect(habilidade, index) {
  const cleanedName = cleanAbilityName(habilidade?.nome);
  const fallbackName = `Habilidade Passiva ${index + 1}`;
  return {
    name: cleanedName || fallbackName,
    img: 'icons/svg/aura.svg',
    type: 'base',
    system: { changes: [] },
    disabled: false,
    start: {
      time: 0,
      combat: null,
      combatant: null,
      initiative: null,
      round: null,
      turn: null
    },
    duration: {
      value: null,
      units: 'seconds',
      expiry: null,
      expired: false
    },
    description: toPassiveEffectDescriptionHtml(habilidade?.descricao),
    origin: null,
    tint: '#ffffff',
    transfer: false,
    statuses: [],
    showIcon: 2,
    folder: null,
    sort: index * 1000,
    flags: {
      'ordem-bestiario': {
        sourceType: 'manualPassiveEffect',
        tipoOriginal: habilidade?.tipo ?? '',
        tipoNormalizado: 'passiva',
        sourceData: repairMojibakeDeep(habilidade || {})
      }
    }
  };
}

function slugifyCreatureName(name) {
  return normalizeBaseString(name)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeTokenCandidateName(filename) {
  let base = path.basename(String(filename ?? '').trim());
  const duplicatedExtPattern = /(\.(webp|png|jpg|jpeg|webm))+$/i;
  base = base.replace(duplicatedExtPattern, '');

  const normalized = normalizeBaseString(base)
    .replace(/[\s_-]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const words = normalized
    .split('-')
    .map((w) => w.trim())
    .filter((w) => w && !IRRELEVANT_TOKEN_WORDS.has(w));

  return words.join('-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

function loadTokenFiles(baseDir, foundryBasePath, sourceLabel) {
  if (!fs.existsSync(baseDir)) return [];

  return fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((name) => TOKEN_EXTENSIONS_PRIORITY.includes(path.extname(name).toLowerCase()))
    .map((name) => ({
      file: name,
      ext: path.extname(name).toLowerCase(),
      slug: normalizeTokenCandidateName(name),
      foundryPath: `${foundryBasePath}/${name}`,
      source: sourceLabel
    }));
}

function loadOverrides() {
  if (!fs.existsSync(overridesPath)) return {};
  try {
    const parsed = repairMojibakeDeep(readJson(overridesPath));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function sortTokenCandidates(candidates) {
  return [...candidates].sort((a, b) => {
    if (a.source !== b.source) return a.source === 'normalized' ? -1 : 1;
    const extA = TOKEN_EXTENSIONS_PRIORITY.indexOf(a.ext);
    const extB = TOKEN_EXTENSIONS_PRIORITY.indexOf(b.ext);
    if (extA !== extB) return extA - extB;
    if (a.slug.length !== b.slug.length) return a.slug.length - b.slug.length;
    return a.file.localeCompare(b.file, 'pt-BR');
  });
}

function getSignificantWordsFromSlug(slug) {
  return String(slug ?? '')
    .split('-')
    .filter((w) => w && w.length >= 2 && !COMMON_CONNECTOR_WORDS.has(w));
}

function findTokenAutomatically(creatureName, tokenEntries) {
  const creatureSlug = slugifyCreatureName(creatureName);
  if (!creatureSlug) {
    return { file: null, foundryPath: null, method: 'fallback', creatureSlug };
  }

  const exact = sortTokenCandidates(tokenEntries.filter((t) => t.slug === creatureSlug));
  if (exact.length) return { ...exact[0], method: 'exact', creatureSlug };

  const suffix = sortTokenCandidates(tokenEntries.filter((t) => t.slug.endsWith(creatureSlug)));
  if (suffix.length) return { ...suffix[0], method: 'suffix', creatureSlug };

  if (creatureSlug.length >= 5) {
    const partial = sortTokenCandidates(tokenEntries.filter((t) => t.slug.includes(creatureSlug) || creatureSlug.includes(t.slug)));
    if (partial.length) return { ...partial[0], method: 'partial', creatureSlug };
  }

  const creatureWords = getSignificantWordsFromSlug(creatureSlug);
  if (creatureWords.length) {
    const wordsMatch = sortTokenCandidates(tokenEntries.filter((t) => {
      const tokenWords = new Set(t.slug.split('-').filter(Boolean));
      return creatureWords.every((word) => tokenWords.has(word));
    }));

    if (wordsMatch.length) return { ...wordsMatch[0], method: 'words', creatureSlug };
  }

  return { file: null, foundryPath: null, method: 'fallback', creatureSlug };
}

function baseAttackTemplate(example) {
  const first = (example.items || []).find((i) => i.type === 'armament');
  if (first) return first;
  return {
    name: 'Ataque', type: 'armament', img: 'icons/svg/item-bag.svg', effects: [], folder: null, sort: 0, flags: {}, ownership: { default: 0 },
    system: {
      description: '', weight: 1, category: '0', using: { state: true, class: 'fas' }, quantity: 1, proficiency: '',
      types: { rangeType: { name: 'melee', subRangeType: '' }, ammunitionType: '', gripType: '' }, critical: '20/x2', range: 'Curto',
      formulas: { attack: { formula: '1d20', attr: 'dex', skill: 'fighting', bonus: '0' }, damage: { formula: '1d6', attr: '', bonus: '', type: 'cuttingDamage', parts: [] }, extraFormula: '' },
      penalty: '', conditions: {}
    }
  };
}

function shouldInclude(c) {
  if (c?.descriptionOnly === true) return { ok: false, reason: 'descriptionOnly=true' };
  if (c?.likelyFalsePositive === true) return { ok: false, reason: 'likelyFalsePositive=true' };

  if (onlyExportable) {
    if (c?.exportable === true || c?.status === 'ok') return { ok: true };
    return { ok: false, reason: 'not exportable/status ok' };
  }

  if (c?.status === 'ok') return { ok: true };
  return { ok: false, reason: 'status != ok' };
}

function resolveFallbackTokenPath(creature) {
  const candidate = [creature?.token, creature?.imagem].find((v) => typeof v === 'string' && v.trim().length > 0);
  return candidate || 'icons/svg/mystery-man.svg';
}

function containsMojibake(value) {
  return /[ÃÂâ€]/.test(String(value ?? ''));
}

function hasAccentOrSpace(value) {
  return /\s|[^\u0000-\u007F]/.test(String(value ?? ''));
}

function applyPrototypeTokenSize(token, sizeKey) {
  if (!token) return;
  const sizeMap = {
    medium: 1.5,
    large: 3,
    huge: 4,
    colossal: 5
  };
  const side = sizeMap[String(sizeKey || '').toLowerCase()];
  if (!side) return;
  token.width = side;
  token.height = side;
  token.depth = side;
}

function toVariantLabel(variantKey) {
  const key = String(variantKey || '').trim().toLowerCase();
  if (!key) return '';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function resolveModuleTokenSrcToLocalPath(src) {
  const rel = String(src || '').replace(/^modules\/ordem-bestiario\//, '');
  return path.join(process.cwd(), rel);
}

function repairWithStats(value, stats, pathRef = '$') {
  if (typeof value === 'string') {
    const repaired = repairMojibakeString(value);
    if (value !== repaired) {
      stats.repairedCount += 1;
      if (stats.examples.length < 10) {
        stats.examples.push({ path: pathRef, before: value, after: repaired });
      }
    }
    return repaired;
  }

  if (Array.isArray(value)) {
    return value.map((v, i) => repairWithStats(v, stats, `${pathRef}[${i}]`));
  }

  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = repairWithStats(v, stats, `${pathRef}.${k}`);
    }
    return out;
  }

  return value;
}

function findMojibakeDeep(value, pathRef = '$', hits = []) {
  if (typeof value === 'string') {
    if (hasMojibake(value)) hits.push({ path: pathRef, value });
    return hits;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => findMojibakeDeep(v, `${pathRef}[${i}]`, hits));
    return hits;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => findMojibakeDeep(v, `${pathRef}.${k}`, hits));
  }
  return hits;
}

function main() {
  const encodingStats = { repairedCount: 0, examples: [] };
  const example = repairWithStats(readJson(examplePath), encodingStats, '$.example');
  const creatures = repairWithStats(readJson(creaturesPath), encodingStats, '$.creatures');

  const tokenEntries = [
    ...loadTokenFiles(tokensNormalizedDir, foundryTokenBaseNormalized, 'normalized'),
    ...loadTokenFiles(tokensOriginalDir, foundryTokenBaseOriginal, 'original')
  ];

  const tokenByFile = new Map(tokenEntries.map((t) => [t.file, t]));
  const tokenBySlug = new Map();
  for (const t of tokenEntries) {
    if (!tokenBySlug.has(t.slug)) tokenBySlug.set(t.slug, []);
    tokenBySlug.get(t.slug).push(t);
  }

  const overrides = loadOverrides();

  fs.mkdirSync(outputDir, { recursive: true });

  const actors = [];
  const skipped = [];
  const generatedList = [];
  const tokenReportRows = [];
  const tokenVariantsReportRows = [];
  const resistancesReportRows = [];
  const abilitiesReportRows = [];
  const skillsReportRows = [];
  const invalidOverrides = [];
  const usedTokenFiles = new Set();

  const atkTemplate = baseAttackTemplate(example);

  creatures.forEach((rawCreature, idx) => {
    const c = rawCreature;
    const inc = shouldInclude(c);
    if (!inc.ok) {
      skipped.push({ idx, nome: c?.nome || '(sem nome)', reason: inc.reason });
      return;
    }

    const a = clone(example);
    delete a._id;
    if (a._stats?.exportSource) delete a._stats.exportSource;

    a.name = repairMojibakeString(c.nome || a.name);
    a.type = 'threat';

    const creatureName = a.name || '';
    const creatureSlug = slugifyCreatureName(creatureName);
    const overrideFileRaw = overrides[creatureName] || overrides[c.nome];
    let tokenResult = null;
    const tokenWarnings = [];

    if (overrideFileRaw) {
      const overrideFile = repairMojibakeString(overrideFileRaw);
      const overrideEntry = tokenByFile.get(overrideFile);
      if (overrideEntry) {
        tokenResult = { ...overrideEntry, method: 'override', creatureSlug, originalFile: overrideFileRaw };
      } else {
        const overrideSlug = normalizeTokenCandidateName(overrideFile);
        const slugCandidates = sortTokenCandidates(tokenBySlug.get(overrideSlug) || []);
        if (slugCandidates.length) {
          tokenResult = { ...slugCandidates[0], method: 'override', creatureSlug, originalFile: overrideFileRaw };
        } else {
          tokenWarnings.push(`override aponta para arquivo inexistente: ${overrideFile}`);
          invalidOverrides.push({ criatura: creatureName, arquivo: overrideFile });
        }
      }
    }

    if (!tokenResult) {
      tokenResult = findTokenAutomatically(creatureName, tokenEntries);
    }

    const rawTokenVariants = c?.tokenVariants && typeof c.tokenVariants === 'object' && !Array.isArray(c.tokenVariants)
      ? c.tokenVariants
      : null;
    const resolvedTokenVariants = {};

    if (rawTokenVariants) {
      for (const [variantKeyRaw, variantFileRaw] of Object.entries(rawTokenVariants)) {
        const variantKey = String(variantKeyRaw || '').trim().toLowerCase();
        const variantFile = repairMojibakeString(String(variantFileRaw || '').trim());
        if (!variantKey || !variantFile) continue;
        const foundrySrc = `${foundryTokenBaseNormalized}/${variantFile}`;
        const localPath = resolveModuleTokenSrcToLocalPath(foundrySrc);
        const exists = fs.existsSync(localPath);
        resolvedTokenVariants[variantKey] = {
          label: toVariantLabel(variantKey),
          src: foundrySrc
        };
        tokenVariantsReportRows.push({
          actor: creatureName || '(sem nome)',
          variant: variantKey,
          label: toVariantLabel(variantKey),
          src: foundrySrc,
          exists
        });
        if (!exists) tokenWarnings.push(`tokenVariant ausente: ${variantKey} -> ${variantFile}`);
      }
    }

    if (tokenResult?.file && tokenResult.source === 'original') {
      const normalizedCandidates = sortTokenCandidates((tokenBySlug.get(tokenResult.slug) || []).filter((t) => t.source === 'normalized'));
      if (normalizedCandidates.length) {
        tokenResult = { ...normalizedCandidates[0], method: tokenResult.method, creatureSlug, originalFile: tokenResult.originalFile || tokenResult.file };
      }
    }

    const baseVariant = resolvedTokenVariants.base || null;
    const baseVariantLocalExists = Boolean(baseVariant) && fs.existsSync(resolveModuleTokenSrcToLocalPath(baseVariant.src));
    const fallbackPath = resolveFallbackTokenPath(c);
    const finalTokenPath = baseVariantLocalExists
      ? baseVariant.src
      : (tokenResult?.file ? tokenResult.foundryPath : fallbackPath);
    const tokenFound = Boolean(tokenResult?.file);

    if (tokenFound) usedTokenFiles.add(`${tokenResult.source}:${tokenResult.file}`);

    a.img = finalTokenPath;

    if (a.prototypeToken) {
      a.prototypeToken.name = a.name;
      a.prototypeToken.texture = a.prototypeToken.texture || {};
      a.prototypeToken.texture.src = finalTokenPath;
      a.prototypeToken.lockRotation = true;
      a.prototypeToken.rotation = 0;
      if (a.prototypeToken.flags?.barbrawl?.resourceBars?.threatHPBar) {
        a.prototypeToken.flags.barbrawl.resourceBars.threatHPBar.attribute = 'attributes.hp';
      }
    }

    const s = a.system || (a.system = {});
    s.attributes = s.attributes || {};
    s.skills = s.skills || {};
    s.details = s.details || {};
    s.disturbingPresence = s.disturbingPresence || {};
    s.defense = s.defense || {};
    s.resistances = s.resistances || {};
    s.traits = s.traits || {};
    s.temporary = s.temporary || {};

    if (c.pontosDeVida) {
      s.attributes.hp = s.attributes.hp || {};
      if (typeof c.pontosDeVida.value === 'number') s.attributes.hp.value = c.pontosDeVida.value;
      if (typeof c.pontosDeVida.max === 'number') s.attributes.hp.max = c.pontosDeVida.max;
    }
    if (typeof c.vd === 'number') { s.attributes.vd = s.attributes.vd || {}; s.attributes.vd.value = c.vd; }

    if (c.deslocamento) {
      s.attributes.movement = s.attributes.movement || {};
      if (c.deslocamento.walk != null) s.attributes.movement.walk = String(c.deslocamento.walk);
      if (c.deslocamento.unit) s.attributes.movement.unit = c.deslocamento.unit;
      if (typeof c.deslocamento.squares === 'number') s.attributes.movement.squares = c.deslocamento.squares;
    }

    for (const k of ['dex', 'int', 'pre', 'str', 'vit']) {
      if (typeof c.atributos?.[k] === 'number') {
        s.attributes[k] = s.attributes[k] || {};
        s.attributes[k].value = c.atributos[k];
      }
    }

    for (const k of ['fighting', 'aim', 'resilience', 'reflexes', 'will', 'initiative', 'perception']) {
      if (typeof c.pericias?.[k] === 'number') {
        s.skills[k] = s.skills[k] || {};
        s.skills[k].degree = s.skills[k].degree || { label: 'untrained', value: 0 };
        s.skills[k].degree.value = c.pericias[k];
      }
    }

    const extraSkills = getExtraSkills(c.pericias);
    a.flags = a.flags || {};
    a.flags['ordem-bestiario'] = a.flags['ordem-bestiario'] || {};
    a.flags['ordem-bestiario'].extraSkills = extraSkills;

    if (extraSkills.length > 0) {
      const chosen = extraSkills[0];
      s.skills.freeSkill = s.skills.freeSkill || { value: 0, name: '', attr: ['int', 1], degree: { label: 'untrained', value: 0 } };
      s.skills.freeSkill.value = 0;
      s.skills.freeSkill.name = chosen.name;
      s.skills.freeSkill.attr = [chosen.attr, 1];
      s.skills.freeSkill.degree = s.skills.freeSkill.degree || { label: 'untrained', value: 0 };
      s.skills.freeSkill.degree.label = 'untrained';
      s.skills.freeSkill.degree.value = chosen.value;

      const extraHtml = buildExtraSkillsHtml(extraSkills);
      const currentAbilities = String(s.temporary.abilities || '').trim();
      s.temporary.abilities = currentAbilities
        ? `${currentAbilities}<hr>${extraHtml}`
        : extraHtml;
    }

    if (String(s.temporary.characteristics || '').includes('PERÍCIAS EXTRAS')) {
      s.temporary.characteristics = String(s.temporary.characteristics)
        .replace(/PERÍCIAS EXTRAS[\s\S]*/g, '')
        .trim();
    }

    if (c.elemento) {
      const mapElement = { sangue: 'blood', morte: 'death', conhecimento: 'knowledge', energia: 'energy', medo: 'fear' };
      const el = mapElement[asKey(c.elemento)] || c.elemento;
      s.details.element = el;
      s.elements = s.elements || {};
      s.elements.main = el;
      if (Array.isArray(c.elementosSecundarios)) s.elements.others = c.elementosSecundarios.join(', ');
    }

    if (c.tipo) s.details.creatureType = c.tipo;

    if (c.tamanho) {
      const mapSize = { minúsculo: 'tiny', minusculo: 'tiny', pequeno: 'small', medio: 'medium', médio: 'medium', grande: 'large', enorme: 'huge', colossal: 'colossal' };
      const sz = mapSize[asKey(c.tamanho)] || c.tamanho;
      s.details.size = sz;
      s.size = sz;
    }

    applyPrototypeTokenSize(a.prototypeToken, s.details.size);

    if (c.presencaPerturbadora) {
      if (typeof c.presencaPerturbadora.dt === 'number') s.disturbingPresence.dt = c.presencaPerturbadora.dt;
      if (c.presencaPerturbadora.danoMental != null) s.disturbingPresence.mentalDamage = String(c.presencaPerturbadora.danoMental);
      if (c.presencaPerturbadora.nexImune != null) s.disturbingPresence.immuneNex = c.presencaPerturbadora.nexImune;
    }

    if (typeof c.defesa === 'number') s.defense.value = c.defesa;
    if (c.resistenciasTexto != null) s.defense.damageResistances = String(c.resistenciasTexto || '');
    if (c.vulnerabilidadesTexto != null) s.vulnerabilities = String(c.vulnerabilidadesTexto || '');

    if (c.descricao != null) s.details.description = c.descricao;
    if (c.enigmaDeMedo != null) s.details.fearRiddle = c.enigmaDeMedo;

    const resistParseWarnings = [];
    const resistAplicadas = applyResistenciasTexto(a, c.resistenciasTexto, resistParseWarnings);
    const vulnAplicadas = applyVulnerabilidadesTexto(a, c.vulnerabilidadesTexto);
    const imuneAplicadas = applyImunidadesTexto(a, c.imunidadesTexto, resistParseWarnings);

    if (c.resistencias && typeof c.resistencias === 'object') {
      Object.entries(c.resistencias).forEach(([k, rv]) => {
        const rk = mapDamageType(k);
        if (!s.resistances[rk]) s.resistances[rk] = { value: 0, vulnerable: false, immune: false };
        if (typeof rv?.value === 'number') s.resistances[rk].value = rv.value;
        if (typeof rv?.vulnerable === 'boolean') s.resistances[rk].vulnerable = rv.vulnerable;
        if (typeof rv?.immune === 'boolean') s.resistances[rk].immune = rv.immune;
      });
    }

    if (c.traits && typeof c.traits === 'object') {
      Object.entries(c.traits).forEach(([k, v]) => {
        if (k in s.traits && typeof v === 'boolean') s.traits[k] = v;
      });
    }

    const attacks = Array.isArray(c.ataques) ? c.ataques : [];
    const attackItems = attacks.map((atk, atkIndex) => {
      const item = clone(atkTemplate);
      delete item._id;
      if (item._stats?.exportSource) delete item._stats.exportSource;
      item._id = genId();
      item.sort = atkIndex * 1000;

      item.name = atk.nome || item.name;
      item.type = 'armament';
      item.system = item.system || {};
      item.system.formulas = item.system.formulas || {};
      item.system.formulas.attack = item.system.formulas.attack || {};
      item.system.formulas.damage = item.system.formulas.damage || {};
      item.system.types = item.system.types || { rangeType: { name: 'melee', subRangeType: '' }, ammunitionType: '', gripType: '' };

      let desc = atk.descricao || '';
      if (atk.danoExtra && /[a-zA-Z]/.test(String(atk.danoExtra))) {
        desc = `${desc}\nDano extra: ${atk.danoExtra}`.trim();
      }

      if (desc != null) item.system.description = desc;
      if (atk.alcance != null) item.system.range = atk.alcance;
      if (atk.critico != null) item.system.critical = atk.critico;
      if (atk.rangeType) item.system.types.rangeType.name = atk.rangeType;
      if (atk.testeFormula != null) item.system.formulas.attack.formula = atk.testeFormula;
      if (atk.atributo != null) item.system.formulas.attack.attr = atk.atributo;
      if (atk.pericia != null) item.system.formulas.attack.skill = atk.pericia;
      if (atk.bonus != null) item.system.formulas.attack.bonus = String(atk.bonus);
      if (atk.dano != null) item.system.formulas.damage.formula = atk.dano;
      if (atk.tipoDano != null) item.system.formulas.damage.type = mapDamageType(atk.tipoDano);
      if (atk.danoExtra != null) item.system.formulas.extraFormula = atk.danoExtra;

      return item;
    });

    const habilidades = Array.isArray(c.habilidades) ? c.habilidades : [];
    const abilityItems = [];
    const passiveEffects = [];
    let abilityIndex = 0;
    let passiveIndex = 0;

    if (!habilidades.length) {
      abilitiesReportRows.push({
        criatura: a.name,
        habilidade: '-',
        tipoOriginal: '-',
        tipoNormalizado: '-',
        destino: '-',
        activation: '-',
        warning: '-'
      });
    }

    for (const habilidade of habilidades) {
      const tipoNormalizado = normalizeAbilityTipo(habilidade?.tipo);
      const abilityName = cleanAbilityName(habilidade?.nome);
      const warning = abilityName ? '-' : `habilidade sem nome recebeu fallback`;

      if (tipoNormalizado === 'passiva') {
        passiveEffects.push(createPassiveEffect(habilidade, passiveIndex));
        passiveIndex += 1;
        abilitiesReportRows.push({
          criatura: a.name,
          habilidade: abilityName || `Habilidade Passiva ${passiveIndex}`,
          tipoOriginal: String(habilidade?.tipo ?? ''),
          tipoNormalizado,
          destino: 'effect:base',
          activation: '-',
          warning
        });
      } else {
        const createdItem = createAbilityItem(habilidade, abilityIndex, tipoNormalizado);
        abilityItems.push(createdItem);
        abilityIndex += 1;
        abilitiesReportRows.push({
          criatura: a.name,
          habilidade: createdItem.name,
          tipoOriginal: String(habilidade?.tipo ?? ''),
          tipoNormalizado,
          destino: 'item:ability',
          activation: createdItem.system.activation,
          warning
        });
      }
    }

    a.items = [...attackItems, ...abilityItems];
    a.effects = [...(Array.isArray(a.effects) ? a.effects : []), ...passiveEffects];

    const sourceDataRepaired = repairMojibakeDeep(c);

    a.flags = a.flags || {};
    a.flags['ordem-bestiario'] = a.flags['ordem-bestiario'] || {};
    a.flags['ordem-bestiario'].fonte = c.fonte || null;
    a.flags['ordem-bestiario'].sourceData = sourceDataRepaired;
    a.flags['ordem-bestiario'].elementosSecundarios = c.elementosSecundarios || [];
    a.flags['ordem-bestiario'].deslocamentoAlternativo = c.deslocamentoAlternativo || null;
    a.flags['ordem-bestiario'].resistenciasTexto = c.resistenciasTexto || '';
    a.flags['ordem-bestiario'].vulnerabilidadesTexto = c.vulnerabilidadesTexto || '';
    a.flags['ordem-bestiario'].imunidadesTexto = c.imunidadesTexto || '';
    a.flags['ordem-bestiario'].habilidades = c.habilidades || [];
    a.flags['ordem-bestiario'].warnings = c.warnings || [];
    a.flags['ordem-bestiario'].revisar = c.revisar || [];
    a.flags['ordem-bestiario'].tokenFound = tokenFound;
    a.flags['ordem-bestiario'].tokenFile = tokenResult?.file || null;
    a.flags['ordem-bestiario'].tokenPath = finalTokenPath;
    if (Object.keys(resolvedTokenVariants).length > 0) {
      a.flags['ordem-bestiario'].tokenVariants = resolvedTokenVariants;
    }

    const pathHasUnsafeChars = hasAccentOrSpace(finalTokenPath);
    const nameHasMojibake = hasMojibake(a.name);

    // Enforce token footprint after all template-derived mutations.
    if (a.prototypeToken) {
      const sz = String(s.details?.size || '').toLowerCase();
      if (sz === 'medium') {
        a.prototypeToken.width = 1.5;
        a.prototypeToken.height = 1.5;
        a.prototypeToken.depth = 1.5;
      } else if (sz === 'large') {
        a.prototypeToken.width = 3;
        a.prototypeToken.height = 3;
        a.prototypeToken.depth = 3;
      } else if (sz === 'huge') {
        a.prototypeToken.width = 4;
        a.prototypeToken.height = 4;
        a.prototypeToken.depth = 4;
      } else if (sz === 'colossal') {
        a.prototypeToken.width = 5;
        a.prototypeToken.height = 5;
        a.prototypeToken.depth = 5;
      }
    }

    if (nameHasMojibake) tokenWarnings.push('ERRO: actor.name contém mojibake');
    if (hasMojibake(a.prototypeToken?.name)) tokenWarnings.push('ERRO: prototypeToken.name contém mojibake');
    if (pathHasUnsafeChars) tokenWarnings.push('ERRO: tokenPath contém espaço/acento');

    actors.push(a);
    generatedList.push({
      nome: a.name,
      vd: c.vd,
      elemento: c.elemento,
      tokenFound,
      tokenFile: tokenResult?.file || '-',
      tokenPath: finalTokenPath
    });

    tokenReportRows.push({
      criatura: c.nome || '(sem nome)',
      actorName: a.name,
      slug: creatureSlug,
      tokenEncontrado: tokenFound,
      arquivoOriginal: tokenResult?.originalFile || tokenResult?.file || '-',
      arquivoNormalizado: tokenResult?.file || '-',
      caminhoFoundry: finalTokenPath,
      aviso: tokenWarnings.join('; ') || '-'
    });

    resistancesReportRows.push({
      criatura: a.name,
      resistenciasTexto: c.resistenciasTexto || '',
      aplicadas: resistAplicadas.join(', ') || '-',
      vulnerabilidadesTexto: c.vulnerabilidadesTexto || '',
      vulnerabilidades: vulnAplicadas.join(', ') || '-',
      imunidadesTexto: c.imunidadesTexto || '',
      imunidades: imuneAplicadas.join(', ') || '-',
      warnings: resistParseWarnings.join('; ') || '-'
    });

    const chosenFree = extraSkills[0] || null;
    skillsReportRows.push({
      criatura: a.name,
      periciasExtras: extraSkills.length ? extraSkills.map((x) => `${x.name} ${x.value}`).join(', ') : '-',
      freeSkillEscolhido: chosenFree?.name || '-',
      exibidoEmAbilities: extraSkills.length && String(s.temporary.abilities || '').includes('PERÍCIAS EXTRAS') ? 'SIM' : '-',
      characteristicsLimpo: !String(s.temporary.characteristics || '').includes('PERÍCIAS EXTRAS') ? 'SIM' : 'NÃO'
    });

  });

  const repairedActors = repairWithStats(actors, encodingStats, '$.actors');
  fs.writeFileSync(actorsPath, JSON.stringify(repairedActors, null, 2), 'utf8');

  const totalLido = creatures.length;
  const totalGerado = actors.length;
  const totalStatusOk = creatures.filter((x) => x?.status === 'ok').length;
  const totalExportable = creatures.filter((x) => x?.exportable === true).length;
  const totalTokensEncontrados = tokenReportRows.filter((r) => r.tokenEncontrado).length;
  const totalTokensAusentes = tokenReportRows.filter((r) => !r.tokenEncontrado).length;
  const totalHabilidadesJson = actors.reduce((acc, actor) => acc + (actor.flags?.['ordem-bestiario']?.sourceData?.habilidades?.length || 0), 0);
  const totalAbilityItemsCriados = actors.reduce((acc, actor) => acc + (actor.items || []).filter((i) => i.type === 'ability').length, 0);
  const totalPassiveEffectsCriados = actors.reduce((acc, actor) => acc + (actor.effects || []).filter((e) => e?.flags?.['ordem-bestiario']?.sourceType === 'manualPassiveEffect').length, 0);
  const criaturasSemHabilidades = actors
    .filter((actor) => (actor.flags?.['ordem-bestiario']?.sourceData?.habilidades?.length || 0) === 0)
    .map((actor) => actor.name);
  const tokensNaoUtilizados = tokenEntries
    .filter((t) => !usedTokenFiles.has(`${t.source}:${t.file}`))
    .map((t) => `${t.source}: ${t.file}`)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const report = [
    '# Relatório de Geração',
    '',
    `- Modo: ${onlyExportable ? '--only-exportable' : 'default (status ok)'}`,
    `- Total de criaturas lidas: ${totalLido}`,
    `- Total status ok: ${totalStatusOk}`,
    `- Total exportable true: ${totalExportable}`,
    `- Total de criaturas geradas: ${totalGerado}`,
    `- Total pulado: ${skipped.length}`,
    `- Total de tokens encontrados: ${totalTokensEncontrados}`,
    `- Total de tokens ausentes: ${totalTokensAusentes}`,
    '',
    '## Encoding',
    `- mojibake detectado: ${findMojibakeDeep(repairedActors).length > 0 ? 'sim' : 'não'}`,
    `- total de strings reparadas: ${encodingStats.repairedCount}`,
    '- exemplos reparados:',
    ...(encodingStats.examples.length
      ? encodingStats.examples.map((e) => `  - ${e.path}: "${e.before}" -> "${e.after}"`)
      : ['  - (nenhum)']),
    '',
    '## Habilidades',
    `- total de habilidades manuais: ${totalHabilidadesJson}`,
    `- total de items ability criados: ${totalAbilityItemsCriados}`,
    `- total de efeitos passivos criados: ${totalPassiveEffectsCriados}`,
    `- criaturas sem habilidades: ${criaturasSemHabilidades.length ? criaturasSemHabilidades.join('; ') : '(nenhuma)'}`,
    '',
    '## Pulados',
    ...(skipped.length ? skipped.map((s) => `- [${s.idx}] ${s.nome}: ${s.reason}`) : ['- (nenhum)']),
    '',
    '## Criaturas Geradas',
    ...(generatedList.length ? generatedList.map((g) => {
      const rr = resistancesReportRows.find((x) => x.criatura === g.nome);
      return `- ${g.nome} | VD ${g.vd ?? '-'} | elemento ${g.elemento ?? '-'} | tokenFound ${g.tokenFound} | tokenFile ${g.tokenFile} | tokenPath ${g.tokenPath} | resistenciasTexto "${rr?.resistenciasTexto ?? ''}" | vulnerabilidadesTexto "${rr?.vulnerabilidadesTexto ?? ''}" | imunidadesTexto "${rr?.imunidadesTexto ?? ''}" | aplicadas ${rr?.aplicadas ?? '-'} | vulnerabilidades ${rr?.vulnerabilidades ?? '-'} | imunidades ${rr?.imunidades ?? '-'} | warnings ${rr?.warnings ?? '-'}`;
    }) : ['- (nenhum)'])
  ].join('\n');

  const tokenReport = [
    '# Relatório de Tokens',
    '',
    '| criatura | actorName | slug | token encontrado | arquivo original | arquivo normalizado | caminho Foundry | aviso |',
    '|---|---|---|---|---|---|---|---|',
    ...tokenReportRows.map((r) => `| ${r.criatura} | ${r.actorName} | ${r.slug || '-'} | ${r.tokenEncontrado ? 'sim' : 'não'} | ${r.arquivoOriginal} | ${r.arquivoNormalizado} | ${r.caminhoFoundry} | ${r.aviso} |`),
    '',
    '## Tokens ausentes',
    ...(tokenReportRows.some((r) => !r.tokenEncontrado)
      ? tokenReportRows.filter((r) => !r.tokenEncontrado).map((r) => `- ${r.criatura} (${r.slug})`)
      : ['- (nenhum)']),
    '',
    '## Overrides inválidos',
    ...(invalidOverrides.length
      ? invalidOverrides.map((o) => `- ${o.criatura}: ${o.arquivo}`)
      : ['- (nenhum)']),
    '',
    '## Tokens não utilizados',
    ...(tokensNaoUtilizados.length
      ? tokensNaoUtilizados.map((f) => `- ${f}`)
      : ['- (nenhum)'])
  ].join('\n');

  const tokenVariantsReport = [
    '# Relatório de Token Variants',
    '',
    '| actor | variant | label | src | exists |',
    '|---|---|---|---|---|',
    ...tokenVariantsReportRows.map((r) => `| ${r.actor} | ${r.variant} | ${r.label} | ${r.src} | ${r.exists ? 'SIM' : 'NÃO'} |`)
  ].join('\n');

  fs.writeFileSync(reportPath, report, 'utf8');
  fs.writeFileSync(tokenReportPath, tokenReport, 'utf8');
  fs.writeFileSync(tokenVariantsReportPath, tokenVariantsReport, 'utf8');

  const resistancesReport = [
    '# Relatório de Resistências',
    '',
    '| criatura | resistenciasTexto | aplicadas | vulnerabilidadesTexto | vulnerabilidades | imunidadesTexto | imunidades | warnings |',
    '|---|---|---|---|---|---|---|---|',
    ...resistancesReportRows.map((r) => `| ${r.criatura} | ${r.resistenciasTexto} | ${r.aplicadas} | ${r.vulnerabilidadesTexto} | ${r.vulnerabilidades} | ${r.imunidadesTexto} | ${r.imunidades} | ${r.warnings} |`)
  ].join('\n');
  fs.writeFileSync(resistancesReportPath, resistancesReport, 'utf8');

  const abilitiesReport = [
    '# Relatório de Habilidades',
    '',
    '| criatura | habilidade | tipo original | tipo normalizado | destino | activation | warning |',
    '|---|---|---|---|---|---|---|',
    ...abilitiesReportRows.map((r) => `| ${r.criatura} | ${r.habilidade} | ${r.tipoOriginal || '-'} | ${r.tipoNormalizado} | ${r.destino} | ${r.activation} | ${r.warning} |`)
  ].join('\n');
  fs.writeFileSync(abilitiesReportPath, abilitiesReport, 'utf8');

  const skillsReport = [
    '# Relatório de Perícias Extras',
    '',
    '| criatura | perícias extras | freeSkill escolhido | exibido em temporary.abilities | characteristics limpo |',
    '|---|---|---|---|---|',
    ...skillsReportRows.map((r) => `| ${r.criatura} | ${r.periciasExtras} | ${r.freeSkillEscolhido} | ${r.exibidoEmAbilities} | ${r.characteristicsLimpo} |`)
  ].join('\n');
  fs.writeFileSync(skillsReportPath, skillsReport, 'utf8');

  console.log(`Gerado: ${actorsPath}`);
  console.log(`Gerado: ${reportPath}`);
  console.log(`Gerado: ${tokenReportPath}`);
  console.log(`Gerado: ${tokenVariantsReportPath}`);
  console.log(`Gerado: ${resistancesReportPath}`);
  console.log(`Gerado: ${abilitiesReportPath}`);
  console.log(`Gerado: ${skillsReportPath}`);
}

main();



