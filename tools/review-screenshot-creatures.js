const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const shotTextPath = path.join(root, 'output', 'screenshot-text.json');
const normPath = path.join(root, 'input', 'creatures.normalized.json');
const outMd = path.join(root, 'output', 'screenshot-extraction-report.md');
const outJson = path.join(root, 'output', 'screenshot-review.json');

function readJson(p, fallback = []) { if (!fs.existsSync(p)) return fallback; return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); }
function miss(v) { return v == null || v === ''; }

function main() {
  const shots = readJson(shotTextPath, []);
  const creatures = readJson(normPath, []);

  const rows = creatures.map((c, i) => ({
    arquivo: c?.debug?.file || shots[i]?.file || '',
    nome: c.nome || '',
    elemento: c.elemento || '',
    vd: c.vd,
    pv: c?.pontosDeVida?.max,
    defesa: c.defesa,
    ataques: Array.isArray(c.ataques) ? c.ataques.length : 0,
    status: c.status || 'REVISAR',
    warnings: (c.warnings || []).concat(c.revisar || [])
  }));

  const summary = {
    totalImagens: shots.length,
    totalNormalizadas: creatures.length,
    totalOk: rows.filter((r) => r.status === 'ok').length,
    totalRevisar: rows.filter((r) => r.status !== 'ok').length,
    totalExportable: creatures.filter((c) => c.exportable).length,
    totalSemVD: rows.filter((r) => miss(r.vd)).length,
    totalSemPV: rows.filter((r) => miss(r.pv)).length,
    totalSemDefesa: rows.filter((r) => miss(r.defesa)).length,
    totalSemElemento: rows.filter((r) => miss(r.elemento)).length,
    totalSemAtaques: rows.filter((r) => r.ataques === 0).length
  };

  fs.writeFileSync(outJson, JSON.stringify({ summary, rows }, null, 2), 'utf8');

  const md = [
    '# Screenshot Extraction Report',
    '',
    '## Resumo',
    `- total de imagens lidas: ${summary.totalImagens}`,
    `- total normalizadas: ${summary.totalNormalizadas}`,
    `- total OK: ${summary.totalOk}`,
    `- total REVISAR: ${summary.totalRevisar}`,
    `- total exportable: ${summary.totalExportable}`,
    `- total sem VD: ${summary.totalSemVD}`,
    `- total sem PV: ${summary.totalSemPV}`,
    `- total sem defesa: ${summary.totalSemDefesa}`,
    `- total sem elemento: ${summary.totalSemElemento}`,
    `- total sem ataques: ${summary.totalSemAtaques}`,
    '',
    '## Tabela',
    '| arquivo | nome | elemento | VD | PV | defesa | ataques | status | warnings |',
    '|---|---|---|---:|---:|---:|---:|---|---|',
    ...(rows.length ? rows.map((r) => `| ${r.arquivo} | ${r.nome} | ${r.elemento} | ${r.vd ?? ''} | ${r.pv ?? ''} | ${r.defesa ?? ''} | ${r.ataques} | ${r.status} | ${(r.warnings.join('; ') || '').replace(/\|/g, '/')} |`) : ['| - | - | - | - | - | - | - | - | - |'])
  ].join('\n');

  fs.writeFileSync(outMd, md, 'utf8');
  console.log(`Gerado: ${outMd}`);
  console.log(`Gerado: ${outJson}`);
}

main();
