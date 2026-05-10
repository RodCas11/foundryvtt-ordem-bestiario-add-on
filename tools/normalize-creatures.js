const fs = require('fs');
const path = require('path');
const { BESTIARY_START_PAGE, BESTIARY_END_PAGE, PDF_PAGE_OFFSET, normalizeExtractedText } = require('./text-normalizer');

const root = path.resolve(__dirname, '..');
const rawPath = path.join(root, 'output', 'creatures.raw.json');
const normPath = path.join(root, 'input', 'creatures.normalized.json');
const reportPath = path.join(root, 'output', 'extraction-report.md');

const ELEM = { sangue: 'blood', morte: 'death', conhecimento: 'knowledge', energia: 'energy', medo: 'fear' };
const SIZE = { 'minúsculo': 'tiny', minusculo: 'tiny', pequeno: 'small', médio: 'medium', medio: 'medium', grande: 'large', enorme: 'huge', colossal: 'colossal' };

function readJson(p, fallback = null) { if (!fs.existsSync(p)) return fallback; return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); }
function first(text, re, g = 1) { const m = text.match(re); return m ? m[g] : null; }
function nint(v) { if (v == null) return null; const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10); return Number.isFinite(n) ? n : null; }

function base() {
  return {
    nome: '', imagem: 'icons/svg/mystery-man.svg', token: 'icons/svg/mystery-man.svg', elemento: '', vd: null, tipo: 'creature', tamanho: '',
    presencaPerturbadora: { dt: null, danoMental: '', nexImune: null }, pontosDeVida: { value: null, max: null }, defesa: null,
    deslocamento: { walk: '', unit: 'm', squares: 0 }, atributos: { dex: null, int: null, pre: null, str: null, vit: null },
    pericias: { fighting: null, aim: null, resilience: null, reflexes: null, will: null, initiative: null, perception: null },
    resistencias: {}, traits: { smell: false, acceleratedHealing: false, incorporeal: false, blindsight: false, lowLightVision: false, darkvision: false },
    ataques: [], habilidades: [], descricao: '', enigmaDeMedo: '',
    fonte: { livro: 'Livro de Regras', pagina: null, paginaFinal: null }, status: 'REVISAR', warnings: [], revisar: [],
    debug: { nameDetectionStrategy: '', rawNameCandidate: '', mergedPages: [], confidence: 0 }
  };
}

function parseElement(text, detected) {
  const probes = [detected, first(text, /\b(SANGUE|MORTE|CONHECIMENTO|ENERGIA|MEDO)\b/i)].filter(Boolean);
  for (const p of probes) { const k = String(p).toLowerCase(); if (ELEM[k]) return ELEM[k]; }
  return '';
}

function parseSize(text) {
  const s = first(text, /\b(MIN[ÚU]SCULO|PEQUENO|M[ÉE]DIO|GRANDE|ENORME|COLOSSAL)\b/i);
  if (!s) return '';
  return SIZE[String(s).toLowerCase()] || '';
}

function parseActions(text) {
  const attacks = [];
  const skills = [];
  const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  for (const ln of lines) {
    if (!/(A[CÇ][OÕ]ES|REA[CÇ][AÃ]O|MOVIMENTO|LIVRE|COMPLETA|TESTE|DANO)/i.test(ln)) continue;
    const isReaction = /^REA[CÇ][AÃ]O/i.test(ln);
    const isMove = /^MOVIMENTO/i.test(ln);
    const isFree = /^LIVRE/i.test(ln);
    const isComp = /^COMPLETA/i.test(ln);
    const damage = first(ln, /(\d+d\d+(?:\+\d+)?)/i);
    const hasDano = /\bDANO\b/i.test(ln);
    const dmgLabel = first(ln, /(CORTE|IMPACTO|PERFURA[CÇ][AÃ]O|BAL[ÍI]STICO|FOGO|ELETRICIDADE|FRIO|QU[ÍI]MICO|MENTAL|SANGUE|MORTE|CONHECIMENTO|ENERGIA)/i);
    const map = {
      CORTE:'cuttingDamage', IMPACTO:'impactDamage', 'PERFURAÇÃO':'piercingDamage', PERFURACAO:'piercingDamage', 'BALÍSTICO':'ballisticDamage', BALISTICO:'ballisticDamage',
      FOGO:'fireDamage', ELETRICIDADE:'eletricDamage', FRIO:'coldDamage', 'QUÍMICO':'chemicalDamage', QUIMICO:'chemicalDamage', MENTAL:'mentalDamage',
      SANGUE:'bloodDamage', MORTE:'deathDamage', CONHECIMENTO:'knowledgeDamage', ENERGIA:'energyDamage'
    };
    const type = dmgLabel ? (map[String(dmgLabel).toUpperCase()] || '') : '';

    const name = (first(ln, /^([^:|]{2,70})[:|]/) || first(ln, /^([A-ZÀ-Ú][A-Za-zÀ-ú0-9\- ]{2,70})/) || 'Ação').trim();

    if (!(hasDano || (damage && type))) {
      skills.push({ tipo: isReaction ? 'reacao' : isMove ? 'movimento' : isFree ? 'livre' : isComp ? 'completa' : 'padrao', nome: name, descricao: ln });
      continue;
    }

    const test = ln.match(/(\d+)d20\s*([+-]\s*\d+)?/i);
    attacks.push({
      nome: name,
      descricao: '',
      alcance: first(ln, /(Corpo a corpo\s*x?\d*|Dist[âa]ncia\s*x?\d*)/i) || '',
      critico: '20/x2',
      rangeType: /dist[âa]ncia/i.test(ln) ? 'ranged' : 'melee',
      testeFormula: test ? `${test[1]}d20` : '',
      atributo: 'str',
      pericia: /PONTARIA/i.test(ln) ? 'aim' : 'fighting',
      bonus: test && test[2] ? test[2].replace(/[+\s]/g, '') : '',
      dano: damage || '',
      tipoDano: type,
      danoExtra: ''
    });
  }
  return { attacks, skills };
}

function normalizeOne(raw) {
  const c = base();
  const text = normalizeExtractedText(raw.textoBruto || '');

  c.nome = raw.nome || '';
  c.fonte.pagina = raw.paginaInicial ?? null;
  c.fonte.paginaFinal = raw.paginaFinal ?? null;

  c.elemento = parseElement(text, raw.elementoDetectado || '');
  c.vd = raw.vdDetectado ?? nint(first(text, /\bVD\s*(\d+)/i));
  c.tamanho = parseSize(text);

  c.presencaPerturbadora.dt = nint(first(text, /PRESEN[CÇ]A\s+PERTURBADORA[^\d]*(\d+)/i));
  c.presencaPerturbadora.danoMental = first(text, /PRESEN[CÇ]A\s+PERTURBADORA[^\n]*?(\d+d\d+(?:\+\d+)?)/i) || '';
  c.presencaPerturbadora.nexImune = nint(first(text, /(\d+)\s*%\s*(?:NEX)?\s*(?:IMUNE|IMUNES)/i));

  const pv = nint(first(text, /PONTOS\s+DE\s+VIDA[^\d]*(\d+)/i));
  c.pontosDeVida.value = pv;
  c.pontosDeVida.max = pv;
  c.defesa = nint(first(text, /\bDEFESA\b[^\d]*(\d+)/i));
  c.deslocamento.walk = first(text, /DESLOCAMENTO[^\d]*(\d+)/i) || '';

  const { attacks, skills } = parseActions(text);
  c.ataques = attacks;
  c.habilidades = skills;

  c.debug = {
    nameDetectionStrategy: raw?.debug?.nameDetectionStrategy || '',
    rawNameCandidate: raw?.debug?.rawNameCandidate || '',
    mergedPages: raw?.debug?.mergedPages || [],
    confidence: raw?.debug?.confidence || raw.confidence || 0
  };

  if (!c.nome || /^Criatura REVISAR página/i.test(c.nome)) c.revisar.push('nome não confiável');
  if (!c.elemento) c.revisar.push('elemento não encontrado');
  if (c.vd == null) c.revisar.push('vd não encontrado');
  if (c.pontosDeVida.max == null) c.revisar.push('pv não encontrado');
  if (c.defesa == null) c.revisar.push('defesa não encontrada');
  if (!c.tamanho) c.revisar.push('tamanho não encontrado');
  if (!c.deslocamento.walk) c.revisar.push('deslocamento não encontrado');
  if (!c.ataques.length) c.warnings.push('sem ataques com dano detectado');

  const coreOk = !c.revisar.length;
  c.status = coreOk ? 'ok' : 'REVISAR';
  return c;
}

function main() {
  const rawWrap = readJson(rawPath, { meta: {}, creatures: [] });
  const raw = Array.isArray(rawWrap) ? rawWrap : (rawWrap.creatures || []);
  const normalized = raw.map(normalizeOne);
  fs.writeFileSync(normPath, JSON.stringify(normalized, null, 2), 'utf8');

  const total = normalized.length;
  const ok = normalized.filter((x) => x.status === 'ok').length;
  const rev = total - ok;
  const okWithWarn = normalized.filter((x) => x.status === 'ok' && x.warnings.length).length;
  const semNome = normalized.filter((x) => /^Criatura REVISAR página/i.test(x.nome) || !x.nome).length;

  const report = [
    '# Relatório de Extração',
    '',
    `- BESTIARY_START_PAGE: ${BESTIARY_START_PAGE}`,
    `- BESTIARY_END_PAGE: ${BESTIARY_END_PAGE}`,
    `- PDF_PAGE_OFFSET: ${PDF_PAGE_OFFSET}`,
    `- total normalizadas: ${total}`,
    `- total OK: ${ok}`,
    `- total REVISAR: ${rev}`,
    `- total OK com warnings: ${okWithWarn}`,
    `- total sem nome confiável: ${semNome}`,
    `- descriptionOnly mesclado: ${rawWrap?.meta?.descriptionMerged ?? 0}`,
    `- falsePositive descartado: ${rawWrap?.meta?.falsePositiveDiscarded ?? 0}`
  ].join('\n');

  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`Gerado: ${normPath}`);
  console.log(`Atualizado: ${reportPath}`);
}

main();
