const fs = require('fs');
const path = require('path');
const { BESTIARY_START_PAGE, BESTIARY_END_PAGE, PDF_PAGE_OFFSET, normalizeExtractedText } = require('./text-normalizer');

const root = path.resolve(__dirname, '..');
const pagesPath = path.join(root, 'output', 'pdf-pages.json');
const outJson = path.join(root, 'output', 'creature-candidates.json');
const outMd = path.join(root, 'output', 'creature-candidates.md');

function getBookPage(pdfPage) {
  return pdfPage + PDF_PAGE_OFFSET;
}

const SIGNALS = [
  { key: 'VD', re: /\bVD\b/gi, weight: 4 },
  { key: 'PRESENCA PERTURBADORA', re: /PRESEN[CÇ]A\s+PERTURBADORA/gi, weight: 4 },
  { key: 'PONTOS DE VIDA', re: /PONTOS\s+DE\s+VIDA/gi, weight: 4 },
  { key: 'DEFESA', re: /\bDEFESA\b/gi, weight: 3 },
  { key: 'ATRIBUTOS', re: /\bATRIBUTOS\b/gi, weight: 3 },
  { key: 'ACOES', re: /\bA[CÇ][OÕ]ES\b/gi, weight: 2 },
  { key: 'ENIGMA DE MEDO', re: /ENIGMA\s+DE\s+MEDO/gi, weight: 2 },
  { key: 'CRIATURA', re: /\bCRIATURA\b/gi, weight: 3 },
  { key: 'SANGUE', re: /\bSANGUE\b/gi, weight: 1 },
  { key: 'MORTE', re: /\bMORTE\b/gi, weight: 1 },
  { key: 'CONHECIMENTO', re: /\bCONHECIMENTO\b/gi, weight: 1 },
  { key: 'ENERGIA', re: /\bENERGIA\b/gi, weight: 1 },
  { key: 'MEDO', re: /\bMEDO\b/gi, weight: 1 },
  { key: 'TESTE', re: /\bTESTE\b/gi, weight: 2 },
  { key: 'DANO', re: /\bDANO\b/gi, weight: 2 }
];

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); }

function countMatches(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

function getLines(text) {
  return text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
}

function extractPossibleNames(lines) {
  const names = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/\bVD\s*\d+/i.test(line) || /(CRIATURA\s*[•\-])/i.test(line)) {
      for (let k = Math.max(0, i - 4); k < i; k += 1) {
        const cand = lines[k];
        if (/^[A-ZÀ-Ú0-9\- ']{4,70}$/.test(cand) && !/^(VD|PONTOS|DEFESA|ATRIBUTOS|AÇÕES|ACOES|REAÇÕES|REACOES|CRIATURA|AMEAÇA|AMEACA|SANGUE|MORTE|CONHECIMENTO|ENERGIA|MEDO)/i.test(cand)) {
          names.push(cand);
        }
      }
    }
  }
  return [...new Set(names)].slice(0, 8);
}

function main() {
  const pages = readJson(pagesPath);
  const inRangePages = pages.filter((p) => {
    const bookPage = getBookPage(p.page);
    return bookPage >= BESTIARY_START_PAGE && bookPage <= BESTIARY_END_PAGE;
  });

  const candidates = [];
  for (const p of inRangePages) {
    const normalized = normalizeExtractedText(p.text || '');
    const lines = getLines(normalized);
    const relevant = lines.filter((l) => /VD|PRESEN[CÇ]A PERTURBADORA|PONTOS DE VIDA|DEFESA|ATRIBUTOS|A[CÇ][OÕ]ES|ENIGMA|CRIATURA|SANGUE|MORTE|CONHECIMENTO|ENERGIA|MEDO|TESTE|DANO/i.test(l)).slice(0, 12);

    const signals = [];
    let score = 0;
    const counts = {};
    for (const s of SIGNALS) {
      const cnt = countMatches(normalized, s.re);
      if (cnt > 0) {
        signals.push(s.key);
        score += s.weight + Math.min(cnt, 4);
      }
      counts[s.key] = cnt;
    }

    if (score < 5) continue;

    candidates.push({
      pdfPage: p.page,
      bookPage: getBookPage(p.page),
      score,
      signals,
      relevantLines: relevant,
      possibleNames: extractPossibleNames(lines),
      vdCount: counts['VD'] || 0,
      presencaCount: counts['PRESENCA PERTURBADORA'] || 0,
      acoesCount: counts['ACOES'] || 0,
      testeCount: counts['TESTE'] || 0,
      danoCount: counts['DANO'] || 0
    });
  }

  candidates.sort((a, b) => a.pdfPage - b.pdfPage);
  fs.writeFileSync(outJson, JSON.stringify(candidates, null, 2), 'utf8');

  const md = [
    '# Creature Candidates',
    '',
    `- BESTIARY_START_PAGE: ${BESTIARY_START_PAGE}`,
    `- BESTIARY_END_PAGE: ${BESTIARY_END_PAGE}`,
    `- PDF_PAGE_OFFSET: ${PDF_PAGE_OFFSET}`,
    `- Total de páginas no range: ${inRangePages.length}`,
    `- Total de páginas candidatas: ${candidates.length}`,
    '',
    ...candidates.map((c) => [
      `## PDF ${c.pdfPage} | Livro ${c.bookPage} | score ${c.score}`,
      `- signals: ${c.signals.join(', ')}`,
      `- VD: ${c.vdCount} | Presença: ${c.presencaCount} | Ações: ${c.acoesCount} | Teste: ${c.testeCount} | Dano: ${c.danoCount}`,
      `- possíveis nomes: ${c.possibleNames.length ? c.possibleNames.join(' | ') : '(nenhum)'}`,
      '- linhas relevantes:',
      ...(c.relevantLines.length ? c.relevantLines.map((l) => `  - ${l}`) : ['  - (nenhuma)']),
      ''
    ].join('\n'))
  ].join('\n');

  fs.writeFileSync(outMd, md, 'utf8');
  console.log(`Gerado: ${outJson}`);
  console.log(`Gerado: ${outMd}`);
}

main();
