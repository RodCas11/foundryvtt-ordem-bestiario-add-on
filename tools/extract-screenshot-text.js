const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const { normalizeExtractedText } = require('./text-normalizer');

const root = path.resolve(__dirname, '..');
const inputDir = path.join(root, 'input', 'screenshots');
const outJson = path.join(root, 'output', 'screenshot-text.json');
const outMd = path.join(root, 'output', 'screenshot-text.md');

const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const FIX_NAMES = {
  'aberracao': 'Aberração',
  'tita': 'Titã',
  'carnical': 'Carniçal',
  'mumia': 'Múmia',
  'xipofaga': 'Xipófaga',
  'mascara': 'Máscara',
  'anomiatico': 'Anomiático',
  'infecticidio': 'Infecticídio'
};

function fileToName(file) {
  const noExt = file.replace(/\.[^.]+$/, '');
  const noPrefix = noExt.replace(/^\d+[-_]?/, '');
  const parts = noPrefix.split(/[-_]+/).filter(Boolean);
  const lowerWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  const words = parts.map((p, i) => {
    const pl = p.toLowerCase();
    if (FIX_NAMES[pl]) return FIX_NAMES[pl];
    if (i > 0 && lowerWords.has(pl)) return pl;
    return pl.charAt(0).toUpperCase() + pl.slice(1);
  });
  return words.join(' ').trim();
}

async function runOcr(filePath) {
  const warnings = [];
  try {
    const r = await Tesseract.recognize(filePath, 'por+eng');
    return { text: r?.data?.text || '', confidence: r?.data?.confidence ?? null, warnings };
  } catch (e1) {
    warnings.push('OCR português+inglês indisponível; tentando inglês.');
    try {
      const r2 = await Tesseract.recognize(filePath, 'eng');
      return { text: r2?.data?.text || '', confidence: r2?.data?.confidence ?? null, warnings };
    } catch (e2) {
      warnings.push(`OCR falhou: ${e2.message}`);
      return { text: '', confidence: null, warnings };
    }
  }
}

async function main() {
  fs.mkdirSync(path.join(root, 'output'), { recursive: true });
  if (!fs.existsSync(inputDir)) throw new Error(`Pasta não encontrada: ${inputDir}`);

  const files = fs.readdirSync(inputDir).filter((f) => IMG_EXT.has(path.extname(f).toLowerCase())).sort();
  const rows = [];

  for (const file of files) {
    const full = path.join(inputDir, file);
    const nameFromFile = fileToName(file);
    const ocr = await runOcr(full);
    const normalizedText = normalizeExtractedText(ocr.text || '');
    const warnings = [...ocr.warnings];
    const status = normalizedText ? 'ok' : 'REVISAR';
    if (!normalizedText) warnings.push('texto OCR vazio');

    rows.push({
      file,
      nameFromFile,
      text: ocr.text || '',
      normalizedText,
      status,
      warnings,
      ocrConfidence: ocr.confidence
    });

    console.log(`OCR: ${file}`);
  }

  fs.writeFileSync(outJson, JSON.stringify(rows, null, 2), 'utf8');

  const md = [
    '# Screenshot OCR',
    '',
    `- total de imagens: ${rows.length}`,
    '',
    ...rows.map((r) => [
      `## ${r.file}`,
      `- nameFromFile: ${r.nameFromFile}`,
      `- status: ${r.status}`,
      `- warnings: ${r.warnings.length ? r.warnings.join(' | ') : '(nenhum)'}`,
      '### OCR bruto',
      '```txt',
      r.text || '(vazio)',
      '```',
      '### OCR normalizado',
      '```txt',
      r.normalizedText || '(vazio)',
      '```',
      ''
    ].join('\n'))
  ].join('\n');

  fs.writeFileSync(outMd, md, 'utf8');
  console.log(`Gerado: ${outJson}`);
  console.log(`Gerado: ${outMd}`);
}

main().catch((e) => {
  console.error('[extract-screenshot-text] Erro:', e.message);
  process.exit(1);
});
