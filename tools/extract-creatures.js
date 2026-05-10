const fs = require('fs');
const path = require('path');
const { BESTIARY_START_PAGE, BESTIARY_END_PAGE, PDF_PAGE_OFFSET, normalizeExtractedText } = require('./text-normalizer');

const root = path.resolve(__dirname, '..');
const pagesPath = path.join(root, 'output', 'pdf-pages.json');
const rawOut = path.join(root, 'output', 'creatures.raw.json');

function getBookPage(pdfPage) { return pdfPage + PDF_PAGE_OFFSET; }
function readJson(p, fallback = []) { if (!fs.existsSync(p)) return fallback; return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); }

const STOP_NAMES = new Set([
  'CRIATURAS DE','AÇÕES','ACOES','PADRÃO','PADRAO','REAÇÃO','REACAO','MOVIMENTO','LIVRE','COMPLETA',
  'ENIGMA DE MEDO','PRESENÇA PERTURBADORA','PRESENCA PERTURBADORA','PONTOS DE VIDA','RESISTÊNCIAS','RESISTENCIAS',
  'VULNERABILIDADES','ATRIBUTOS','SENTIDOS','DEFESA','FORTITUDE','REFLEXOS','VONTADE','DESLOCAMENTO'
]);

function cleanCandidateName(s) {
  let t = String(s || '')
    .replace(/^\d{2,3}\s+/, '')
    .replace(/CRIATURAS DE\s+\d+/i, '')
    .replace(/[◆♦•|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

function isBadName(name) {
  const n = cleanCandidateName(name).toUpperCase();
  if (!n || n.length < 3) return true;
  if (STOP_NAMES.has(n)) return true;
  if (/^(VD|PONTOS|DEFESA|ATRIBUTOS|AÇÕES|ACOES|REAÇÕES|REACOES|CRIATURA|AMEAÇA|AMEACA)$/.test(n)) return true;
  return false;
}

function toTitleCaseCreatureName(name) {
  const lowers = new Set(['de','da','do','das','dos','e']);
  return cleanCandidateName(name)
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => {
      if (!w) return w;
      if (i > 0 && lowers.has(w)) return w;
      return w.includes('-')
        ? w.split('-').map((p) => p ? p[0].toUpperCase() + p.slice(1) : p).join('-')
        : w[0].toUpperCase() + w.slice(1);
    })
    .join(' ')
    .trim();
}

function detectCreatureName(text) {
  const t = normalizeExtractedText(text || '');

  // A: NAME ELEMENT ...
  let m = t.match(/([A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 '\-]{3,80})\s+(SANGUE|MORTE|CONHECIMENTO|ENERGIA|MEDO)(?:\s||◆|♦|•|\|)+/);
  if (m) {
    const raw = cleanCandidateName(m[1]);
    if (!isBadName(raw)) return { name: toTitleCaseCreatureName(raw), strategy: 'A', rawNameCandidate: raw };
  }

  // B: page number then name
  m = t.match(/(?:--- PAGE \d+ ---\s*)?\d{2,3}\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 '\-]{3,80})\s+(SANGUE|MORTE|CONHECIMENTO|ENERGIA|MEDO|CRIATURA|PRESENÇA|PRESENCA)/);
  if (m) {
    const raw = cleanCandidateName(m[1]);
    if (!isBadName(raw)) return { name: toTitleCaseCreatureName(raw), strategy: 'B', rawNameCandidate: raw };
  }

  // C: uppercase title line near top
  const lines = t.split(/\n+/).map((x) => x.trim()).filter(Boolean).slice(0, 20);
  for (const ln of lines) {
    const raw = cleanCandidateName(ln);
    if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 '\-]{3,80}$/.test(raw) && !isBadName(raw) && !/(SANGUE|MORTE|CONHECIMENTO|ENERGIA|MEDO|CRIATURA)/.test(raw)) {
      return { name: toTitleCaseCreatureName(raw), strategy: 'C', rawNameCandidate: raw };
    }
  }

  return { name: '', strategy: '', rawNameCandidate: '' };
}

function detectNumbers(text) {
  const vd = text.match(/\bVD\s*(\d+)/i);
  const pv = text.match(/PONTOS\s+DE\s+VIDA[^\d]*(\d+)/i);
  const def = text.match(/\bDEFESA\b[^\d]*(\d+)/i);
  return {
    vd: vd ? Number(vd[1]) : null,
    pv: pv ? Number(pv[1]) : null,
    defense: def ? Number(def[1]) : null
  };
}

function detectElement(text) {
  const m = text.match(/\b(SANGUE|MORTE|CONHECIMENTO|ENERGIA|MEDO)\b/i);
  return m ? m[1].toUpperCase() : '';
}

function hasLoreStyle(text) {
  return /originalmente|lenda urbana|história|historia|relatos|rumores|conta-se/i.test(text);
}

function startsWithActions(text) {
  const first = text.split(/\n+/).map((x) => x.trim()).find(Boolean) || '';
  return /^A[CÇ][OÕ]ES\b/i.test(first);
}

function main() {
  const pages = readJson(pagesPath, []);
  const inRange = pages.filter((p) => {
    const bp = getBookPage(p.page);
    return bp >= BESTIARY_START_PAGE && bp <= BESTIARY_END_PAGE;
  });

  const blocks = [];
  for (const p of inRange) {
    const normalized = normalizeExtractedText(p.text || '');
    if (!normalized) continue;

    const nameInfo = detectCreatureName(normalized);
    const nums = detectNumbers(normalized);
    const element = detectElement(normalized);
    const descriptionOnly = (!nums.vd && !nums.pv && !nums.defense) && hasLoreStyle(normalized);

    blocks.push({
      nome: nameInfo.name || `Criatura REVISAR página ${getBookPage(p.page)}`,
      paginaInicial: getBookPage(p.page),
      paginaFinal: getBookPage(p.page),
      pdfPageInicial: p.page,
      pdfPageFinal: p.page,
      elementoDetectado: element,
      vdDetectado: nums.vd,
      textoBruto: `--- PAGE ${p.page} ---\n${normalized}`,
      confidence: nameInfo.name ? 80 : 40,
      signals: [
        nums.vd != null ? 'VD' : '',
        nums.pv != null ? 'PV' : '',
        nums.defense != null ? 'DEFESA' : '',
        element ? 'ELEMENTO' : '',
        /PRESEN[CÇ]A\s+PERTURBADORA/i.test(normalized) ? 'PRESENCA' : '',
        /\bA[CÇ][OÕ]ES\b/i.test(normalized) ? 'ACOES' : ''
      ].filter(Boolean),
      status: 'REVISAR',
      revisar: [],
      descriptionOnly,
      nameDetectionStrategy: nameInfo.strategy,
      rawNameCandidate: nameInfo.rawNameCandidate
    });
  }

  // merge descriptionOnly with next statblock having same/compatible name
  const merged = [];
  let descriptionMerged = 0;
  let falsePositiveDiscarded = 0;

  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];

    if (b.descriptionOnly) {
      let mergedFlag = false;
      for (let j = i + 1; j <= Math.min(i + 2, blocks.length - 1); j += 1) {
        const nxt = blocks[j];
        const nxtHasStats = nxt.vdDetectado != null || /PONTOS\s+DE\s+VIDA|DEFESA/i.test(nxt.textoBruto);
        const nameCompat = (b.nome && nxt.nome && b.nome === nxt.nome) || (!nxt.nameDetectionStrategy && b.nameDetectionStrategy);
        if (nxtHasStats && nameCompat) {
          nxt.textoBruto = `${b.textoBruto}\n\n${nxt.textoBruto}`;
          nxt.paginaInicial = b.paginaInicial;
          nxt.pdfPageInicial = b.pdfPageInicial;
          nxt.signals = [...new Set([...b.signals, ...nxt.signals])];
          nxt.confidence = Math.max(nxt.confidence, b.confidence);
          nxt.mergedPages = [...new Set([...(nxt.mergedPages || []), b.pdfPageInicial])];
          descriptionMerged += 1;
          mergedFlag = true;
          break;
        }
      }
      if (!mergedFlag) {
        falsePositiveDiscarded += 1;
      }
      continue;
    }

    // action-only pages without good name: try backfill from previous 2 blocks
    if (startsWithActions(b.textoBruto) && !b.nameDetectionStrategy && (b.vdDetectado != null || /PONTOS\s+DE\s+VIDA|DEFESA/i.test(b.textoBruto))) {
      for (let k = merged.length - 1; k >= Math.max(0, merged.length - 2); k -= 1) {
        const prev = merged[k];
        if (prev && prev.nome && !/^Criatura REVISAR página/i.test(prev.nome)) {
          b.nome = prev.nome;
          b.nameDetectionStrategy = 'BACKFILL_PREV';
          b.rawNameCandidate = prev.nome;
          break;
        }
      }
    }

    merged.push(b);
  }

  const final = merged.map((b) => {
    const revisar = [];
    if (!b.nome || /^Criatura REVISAR página/i.test(b.nome)) revisar.push('nome não detectado com confiança');
    if (b.vdDetectado == null) revisar.push('vd não detectado com confiança');
    return {
      nome: b.nome,
      paginaInicial: b.paginaInicial,
      paginaFinal: b.paginaFinal,
      pdfPageInicial: b.pdfPageInicial,
      pdfPageFinal: b.pdfPageFinal,
      elementoDetectado: b.elementoDetectado,
      vdDetectado: b.vdDetectado,
      textoBruto: b.textoBruto,
      confidence: b.confidence,
      signals: b.signals,
      status: revisar.length ? 'REVISAR' : 'ok',
      revisar,
      descriptionOnly: false,
      debug: {
        nameDetectionStrategy: b.nameDetectionStrategy || '',
        rawNameCandidate: b.rawNameCandidate || '',
        mergedPages: b.mergedPages || [],
        confidence: b.confidence
      }
    };
  });

  fs.writeFileSync(rawOut, JSON.stringify({
    meta: {
      BESTIARY_START_PAGE,
      BESTIARY_END_PAGE,
      PDF_PAGE_OFFSET,
      totalPdfPages: pages.length,
      analyzedPages: inRange.length,
      descriptionMerged,
      falsePositiveDiscarded
    },
    creatures: final
  }, null, 2), 'utf8');

  console.log(`Range analisado livro: ${BESTIARY_START_PAGE}-${BESTIARY_END_PAGE} (offset ${PDF_PAGE_OFFSET})`);
  console.log(`Páginas no range: ${inRange.length}`);
  console.log(`Criaturas raw geradas: ${final.length}`);
  console.log(`DescriptionOnly mescladas: ${descriptionMerged}`);
  console.log(`False positives descartados: ${falsePositiveDiscarded}`);
  console.log(`Gerado: ${rawOut}`);
}

main();
