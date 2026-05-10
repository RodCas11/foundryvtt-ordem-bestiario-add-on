const fs = require('fs');
const path = require('path');
const { normalizeExtractedText } = require('./text-normalizer');

const root = path.resolve(__dirname, '..');
const inPath = path.join(root, 'output', 'screenshot-text.json');
const outPath = path.join(root, 'input', 'creatures.normalized.json');

const ELEM = { SANGUE: 'blood', MORTE: 'death', CONHECIMENTO: 'knowledge', ENERGIA: 'energy', MEDO: 'fear' };
const SIZE = { 'MINÚSCULO': 'tiny', 'MINUSCULO': 'tiny', PEQUENO: 'small', 'MÉDIO': 'medium', MEDIO: 'medium', GRANDE: 'large', ENORME: 'huge', COLOSSAL: 'colossal' };
const DMG = { CORTE:'cuttingDamage', IMPACTO:'impactDamage', 'PERFURAÇÃO':'piercingDamage', PERFURACAO:'piercingDamage', 'BALÍSTICO':'ballisticDamage', BALISTICO:'ballisticDamage', FOGO:'fireDamage', ELETRICIDADE:'eletricDamage', FRIO:'coldDamage', 'QUÍMICO':'chemicalDamage', QUIMICO:'chemicalDamage', MENTAL:'mentalDamage', SANGUE:'bloodDamage', MORTE:'deathDamage', CONHECIMENTO:'knowledgeDamage', ENERGIA:'energyDamage' };

function readJson(p, fallback = []) { if (!fs.existsSync(p)) return fallback; return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); }
function first(text, re, g = 1) { const m = text.match(re); return m ? m[g] : null; }
function nint(v) { if (v == null) return null; const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10); return Number.isFinite(n) ? n : null; }

function base(name, file, conf) {
  return {
    nome: name,
    imagem: 'icons/svg/mystery-man.svg',
    token: 'icons/svg/mystery-man.svg',
    elemento: '',
    vd: null,
    tipo: 'creature',
    tamanho: '',
    presencaPerturbadora: { dt: null, danoMental: '', nexImune: null },
    pontosDeVida: { value: null, max: null },
    defesa: null,
    deslocamento: { walk: '', unit: 'm', squares: 0 },
    atributos: { dex: null, int: null, pre: null, str: null, vit: null },
    pericias: { fighting: null, aim: null, resilience: null, reflexes: null, will: null, initiative: null, perception: null },
    resistencias: {},
    traits: { smell: false, acceleratedHealing: false, incorporeal: false, blindsight: false, lowLightVision: false, darkvision: false },
    ataques: [],
    habilidades: [],
    descricao: '',
    enigmaDeMedo: '',
    fonte: { livro: 'Livro de Regras', pagina: null },
    status: 'ok',
    revisar: [],
    warnings: [],
    debug: { source: 'screenshot', file, nameFromFile: name, ocrConfidence: conf ?? null },
    exportable: true
  };
}

function parseElements(text, c) {
  const found = [...new Set((text.match(/\b(SANGUE|MORTE|CONHECIMENTO|ENERGIA|MEDO)\b/gi) || []).map((x) => x.toUpperCase()))];
  if (found.length) {
    c.elemento = ELEM[found[0]] || '';
    if (found.length > 1) c.warnings.push(`múltiplos elementos detectados: ${found.join(', ')}`);
    c.debug.elementosDetectados = found;
  }
}

function parseBasic(text, c) {
  c.vd = nint(first(text, /\bVD\s*:?\s*(\d+)/i));

  const size = first(text, /\b(MIN[ÚU]SCULO|PEQUENO|M[ÉE]DIO|GRANDE|ENORME|COLOSSAL)\b/i);
  if (size) c.tamanho = SIZE[String(size).toUpperCase()] || '';

  const tipo = first(text, /\b(CRIATURA|HUMANOIDE)\b/i);
  if (tipo) c.tipo = String(tipo).toLowerCase() === 'humanoide' ? 'humanoid' : 'creature';

  c.presencaPerturbadora.dt = nint(first(text, /PRESEN[CÇ]A\s+PERTURBADORA[^\d]*(\d+)/i));
  c.presencaPerturbadora.danoMental = first(text, /PRESEN[CÇ]A\s+PERTURBADORA[^\n]*?(\d+d\d+(?:\+\d+)?)/i) || '';
  c.presencaPerturbadora.nexImune = nint(first(text, /(\d+)\s*%\s*(?:NEX)?\s*(?:IMUNE|IMUNES)/i));

  const pv = nint(first(text, /PONTOS\s+DE\s+VIDA[^\d]*(\d+)/i)) || nint(first(text, /\b(\d{2,4})\s*\|\s*\d+\s*machucado/i));
  c.pontosDeVida.value = pv;
  c.pontosDeVida.max = pv;

  c.defesa = nint(first(text, /\bDEFESA\b\s*:?\s*(\d+)/i));
  c.deslocamento.walk = first(text, /DESLOCAMENTO[^\d]*(\d+)/i) || '';
}

function parseAttrsSkills(text, c) {
  const amap = { AGI:'dex', FOR:'str', INT:'int', PRE:'pre', VIG:'vit' };
  for (const [k, out] of Object.entries(amap)) {
    const m = text.match(new RegExp(`\\b${k}\\b[^\\d+-]*([+-]?\\d+)`, 'i'));
    if (m) c.atributos[out] = nint(m[1]);
  }

  const smap = { LUTA:'fighting', PONTARIA:'aim', FORTITUDE:'resilience', REFLEXOS:'reflexes', VONTADE:'will', INICIATIVA:'initiative', PERCEPÇÃO:'perception', PERCEPCAO:'perception' };
  for (const [k, out] of Object.entries(smap)) {
    const m = text.match(new RegExp(`\\b${k}\\b[^\\d+-]*([+-]?\\d+)`, 'i'));
    if (m) c.pericias[out] = nint(m[1]);
  }
}

function parseTraits(text, c) {
  if (/PERCEP[CÇ][AÃ]O\s+[AÀ]S\s+CEGAS/i.test(text)) c.traits.blindsight = true;
  if (/VIS[ÃA]O\s+NO\s+ESCURO/i.test(text)) c.traits.darkvision = true;
  if (/VIS[ÃA]O\s+NA\s+PENUMBRA/i.test(text)) c.traits.lowLightVision = true;
  if (/\bFARO\b/i.test(text)) c.traits.smell = true;
  if (/CURA\s+ACELERADA/i.test(text)) c.traits.acceleratedHealing = true;
  if (/INCORP[ÓO]REO/i.test(text)) c.traits.incorporeal = true;
}

function parseResistances(text, c) {
  const sec = first(text, /(?:RESIST[ÊE]NCIAS?|IMUNIDADES?|VULNERABILIDADES?)[:\s]*([^\n]{0,300})/i);
  if (!sec) return;
  c.debug.resistanceRaw = sec;
  const pairs = sec.match(/([A-Za-zÀ-ú]+)\s*(\d+)?/g) || [];
  for (const p of pairs) {
    const m = p.match(/([A-Za-zÀ-ú]+)\s*(\d+)?/);
    if (!m) continue;
    const key = DMG[(m[1] || '').toUpperCase()];
    if (!key) continue;
    c.resistencias[key] = { value: m[2] ? Number(m[2]) : 0, vulnerable: false, immune: false };
  }
}

function parseActions(text, c) {
  const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  for (const ln of lines) {
    if (!/(TESTE|DANO|CORPO A CORPO|DIST[ÂA]NCIA|REA[CÇ][AÃ]O|MOVIMENTO|LIVRE|COMPLETA|A[CÇ][OÕ]ES)/i.test(ln)) continue;

    const dmg = first(ln, /(\d+d\d+(?:\+\d+)?)/i);
    const hasDanoWord = /\bDANO\b/i.test(ln);
    const dmgLabel = first(ln, /(CORTE|IMPACTO|PERFURA[CÇ][AÃ]O|BAL[ÍI]STICO|FOGO|ELETRICIDADE|FRIO|QU[ÍI]MICO|MENTAL|SANGUE|MORTE|CONHECIMENTO|ENERGIA)/i);
    const tipoDano = dmgLabel ? DMG[String(dmgLabel).toUpperCase()] || '' : '';

    const tipoHab = /^REA[CÇ][AÃ]O/i.test(ln) ? 'reacao' : /^MOVIMENTO/i.test(ln) ? 'movimento' : /^LIVRE/i.test(ln) ? 'livre' : /^COMPLETA/i.test(ln) ? 'completa' : 'padrao';
    const nome = (first(ln, /^([^:|]{2,60})[:|]/) || first(ln, /^([A-ZÀ-Ú][A-Za-zÀ-ú0-9\- ]{2,60})/) || 'Ação').trim();

    if (!(hasDanoWord || (dmg && tipoDano)) || !dmg) {
      c.habilidades.push({ tipo: tipoHab, nome, descricao: ln });
      continue;
    }

    const test = ln.match(/(\d+)d20\s*([+-]\s*\d+)?/i);
    const rangeType = /dist[âa]ncia/i.test(ln) ? 'ranged' : 'melee';
    const pericia = /PONTARIA/i.test(ln) ? 'aim' : 'fighting';
    const atributo = rangeType === 'ranged' ? 'dex' : 'str';
    const critRaw = first(ln, /x\s*(2|3)/i);

    c.ataques.push({
      nome: nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase(),
      descricao: '',
      alcance: first(ln, /(Corpo a corpo\s*x?\d*|Dist[âa]ncia\s*x?\d*)/i) || '',
      critico: critRaw ? `20/x${critRaw}` : '20/x2',
      rangeType,
      testeFormula: test ? `${test[1]}d20` : '',
      atributo,
      pericia,
      bonus: test && test[2] ? test[2].replace(/[+\s]/g, '') : '',
      dano: dmg.replace(/\s+/g, ''),
      tipoDano,
      danoExtra: ''
    });
  }
}

function finalize(c) {
  if (!c.elemento) c.revisar.push('elemento não encontrado');
  if (c.vd == null) c.revisar.push('vd não encontrado');
  if (c.pontosDeVida.max == null) c.revisar.push('pv não encontrado');
  if (c.defesa == null) c.revisar.push('defesa não encontrada');
  if (!c.ataques.length) c.warnings.push('sem ataques com dano detectado');

  c.status = c.revisar.length ? 'REVISAR' : 'ok';
  c.exportable = !c.revisar.length;
}

function main() {
  const ocr = readJson(inPath, []);
  const out = [];

  for (const row of ocr) {
    const c = base(row.nameFromFile || '', row.file || '', row.ocrConfidence ?? null);
    const text = normalizeExtractedText(row.normalizedText || row.text || '');
    c.debug.rawTextLength = text.length;

    parseElements(text, c);
    parseBasic(text, c);
    parseAttrsSkills(text, c);
    parseTraits(text, c);
    parseResistances(text, c);
    parseActions(text, c);
    finalize(c);

    out.push(c);
  }

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Gerado: ${outPath}`);
}

main();
