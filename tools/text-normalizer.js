const BESTIARY_START_PAGE = 192;
const BESTIARY_END_PAGE = 290;
const PDF_PAGE_OFFSET = 0;

function normalizeExtractedText(text) {
  let t = String(text || '');

  t = t
    .replace(/[◆❖♦]/g, '|')
    .replace(/[\t\f\v\r]+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\s*\|\s*/g, ' | ')
    .replace(/\n{3,}/g, '\n\n');

  t = t.replace(/(TESTE[^\n]{0,120})\n([^\n]{0,120}DANO)/gi, '$1 $2');

  // Repair broken d20-like OCR in combat/test contexts only
  const ctxWords = '(TESTE|PERCEP[CÇ][AÃ]O|INICIATIVA|FORTITUDE|REFLEXOS|VONTADE|LUTA|PONTARIA|ATAQUE)';
  const oForms = '(?:O|Ø|○|◯|D|d)';

  // e.g. TESTE 3O+10, TESTE 3 O +10, INICIATIVA 2 O +10
  t = t.replace(new RegExp(`(${ctxWords}[^\\n]{0,40}?)(\\b[1-9])\\s*${oForms}\\s*([+-]\\s*\\d+)`, 'gi'), '$1$2d20$3');

  // e.g. TESTE O +5 => TESTE 1d20+5
  t = t.replace(new RegExp(`(${ctxWords}[^\\n]{0,40}?)(?:\\b)${oForms}\\s*([+-]\\s*\\d+)`, 'gi'), '$11d20$2');

  // Also if action chunk has DANO nearby
  t = t.replace(/(\b[1-9])\s*(?:O|Ø|○|◯|D|d)\s*([+-]\s*\d+)(?=[^\n]{0,120}\bDANO\b)/gi, '$1d20$2');

  t = t.replace(/(\d+d\d+)\s*([+-])\s*(\d+)/gi, '$1$2$3');
  t = t.replace(/(\d+d20)\s*([+-])\s*(\d+)/gi, '$1$2$3');

  t = t
    .split('\n')
    .map((line) => line.replace(/[ ]{2,}/g, ' ').trimEnd())
    .join('\n')
    .trim();

  return t;
}

module.exports = {
  BESTIARY_START_PAGE,
  BESTIARY_END_PAGE,
  PDF_PAGE_OFFSET,
  normalizeExtractedText
};
