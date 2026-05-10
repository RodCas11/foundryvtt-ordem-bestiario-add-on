const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const inputPdf = path.join(root, 'input', 'livro-regras.pdf');
const outputDir = path.join(root, 'output');
const outText = path.join(outputDir, 'pdf-text.txt');
const outPages = path.join(outputDir, 'pdf-pages.json');

async function loadPdfjs() {
  try {
    return await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch (e) {
    throw new Error('Dependência ausente: pdfjs-dist. Instale com: npm i pdfjs-dist');
  }
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  if (!fs.existsSync(inputPdf)) {
    throw new Error(`PDF não encontrado: ${inputPdf}`);
  }

  const pdfjsLib = await loadPdfjs();
  const data = new Uint8Array(fs.readFileSync(inputPdf));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  const pages = [];
  const textParts = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => (typeof it.str === 'string' ? it.str : ''))
      .join('\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    pages.push({ page: i, text });
    textParts.push(`--- PAGE ${i} ---\n${text}\n`);
  }

  fs.writeFileSync(outPages, JSON.stringify(pages, null, 2), 'utf8');
  fs.writeFileSync(outText, textParts.join('\n'), 'utf8');

  console.log(`Páginas extraídas: ${pages.length}`);
  console.log(`Gerado: ${outPages}`);
  console.log(`Gerado: ${outText}`);
}

main().catch((e) => {
  console.error('[extract-pdf-text] Erro:', e.message);
  process.exit(1);
});
