const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const normPath = path.join(root, 'input', 'creatures.normalized.json');
const rawPath = path.join(root, 'output', 'creatures.raw.json');
const outJson = path.join(root, 'output', 'normalized-review.json');
const outMd = path.join(root, 'output', 'normalized-review.md');
const extractionReport = path.join(root, 'output', 'extraction-report.md');

function readJson(p, fallback = []) { if (!fs.existsSync(p)) return fallback; return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); }
function isMissing(v) { return v == null || v === ''; }
function shortText(s, max = 300) { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > max ? `${t.slice(0, max)}...` : t; }

function main() {
  const normalized = readJson(normPath, []);
  const rawWrap = readJson(rawPath, { meta: {}, creatures: [] });
  const raw = Array.isArray(rawWrap) ? rawWrap : (rawWrap.creatures || []);

  const rows = normalized.map((c, index) => {
    const r = raw[index] || {};
    const page = c?.fonte?.pagina ?? r.paginaInicial ?? null;
    const missing = [];
    if (isMissing(c.nome) || /^Criatura REVISAR página/i.test(c.nome || '')) missing.push('nome');
    if (isMissing(c.elemento)) missing.push('elemento');
    if (isMissing(c.vd)) missing.push('vd');
    if (isMissing(c?.pontosDeVida?.value) || isMissing(c?.pontosDeVida?.max)) missing.push('pv');
    if (isMissing(c.defesa)) missing.push('defesa');
    if (isMissing(c.tamanho)) missing.push('tamanho');
    if (isMissing(c?.deslocamento?.walk)) missing.push('deslocamento');

    const exportable = missing.length === 0;

    return {
      index,
      nome: c.nome || '(sem nome)',
      status: c.status || 'REVISAR',
      pagina: page,
      elemento: c.elemento || '',
      vd: c.vd ?? null,
      pvAtual: c?.pontosDeVida?.value ?? null,
      pvMax: c?.pontosDeVida?.max ?? null,
      defesa: c.defesa ?? null,
      deslocamento: c?.deslocamento?.walk || '',
      ataquesQtd: Array.isArray(c.ataques) ? c.ataques.length : 0,
      habilidadesQtd: Array.isArray(c.habilidades) ? c.habilidades.length : 0,
      camposAusentes: missing,
      revisar: Array.isArray(c.revisar) ? c.revisar : [],
      warnings: Array.isArray(c.warnings) ? c.warnings : [],
      debug: c.debug || {},
      textoBrutoTrecho: shortText(r.textoBruto || ''),
      exportable
    };
  });

  const summary = {
    total: rows.length,
    totalOk: rows.filter((x) => x.status === 'ok').length,
    totalRevisar: rows.filter((x) => x.status !== 'ok').length,
    totalOkWithWarnings: rows.filter((x) => x.status === 'ok' && x.warnings.length > 0).length,
    totalSemNomeConfiavel: rows.filter((x) => /^Criatura REVISAR página/i.test(x.nome) || x.camposAusentes.includes('nome')).length,
    totalDescriptionOnlyMesclado: rawWrap?.meta?.descriptionMerged ?? 0,
    totalFalsePositiveDescartado: rawWrap?.meta?.falsePositiveDiscarded ?? 0,
    totalExportaveis: rows.filter((x) => x.exportable).length,
    totalSemVD: rows.filter((x) => isMissing(x.vd)).length,
    totalSemPV: rows.filter((x) => isMissing(x.pvAtual) || isMissing(x.pvMax)).length,
    totalSemDefesa: rows.filter((x) => isMissing(x.defesa)).length,
    totalSemAtaques: rows.filter((x) => x.ataquesQtd === 0).length
  };

  const review = {
    summary,
    exportaveis: rows.filter((x) => x.exportable),
    ok: rows.filter((x) => x.status === 'ok'),
    revisar: rows.filter((x) => x.status !== 'ok'),
    all: rows
  };

  fs.writeFileSync(outJson, JSON.stringify(review, null, 2), 'utf8');

  const exportTable = review.exportaveis.length
    ? review.exportaveis.map((x) => `| ${x.index} | ${x.nome} | ${x.pagina ?? ''} | ${x.elemento} | ${x.vd} | ${x.pvAtual}/${x.pvMax} | ${x.defesa} | ${x.ataquesQtd} | ${(x.warnings.join('; ') || '')} |`).join('\n')
    : '| - | - | - | - | - | - | - | - | - |';

  const okTable = review.ok.length
    ? review.ok.map((x) => `| ${x.index} | ${x.nome} | ${x.pagina ?? ''} | ${x.elemento} | ${x.vd} | ${x.pvAtual}/${x.pvMax} | ${x.defesa} | ${x.ataquesQtd} |`).join('\n')
    : '| - | - | - | - | - | - | - | - |';

  const revTable = review.revisar.length
    ? review.revisar.map((x) => `| ${x.index} | ${x.nome} | ${x.pagina ?? ''} | ${(x.camposAusentes.concat(x.revisar).join('; ') || '(sem detalhe)').replace(/\|/g, '/')} |`).join('\n')
    : '| - | - | - | - |';

  const details = review.revisar.map((x) => [
    `### Index ${x.index} - ${x.nome}`,
    `- status: ${x.status}`,
    `- página: ${x.pagina ?? ''}`,
    `- elemento: ${x.elemento}`,
    `- VD: ${x.vd ?? ''}`,
    `- PV: ${x.pvAtual ?? ''}/${x.pvMax ?? ''}`,
    `- defesa: ${x.defesa ?? ''}`,
    `- deslocamento: ${x.deslocamento}`,
    `- ataques: ${x.ataquesQtd}`,
    `- habilidades: ${x.habilidadesQtd}`,
    `- campos ausentes: ${x.camposAusentes.join(', ') || '(nenhum)'}`,
    `- revisar: ${x.revisar.join(' | ') || '(nenhum)'}`,
    `- warnings: ${x.warnings.join(' | ') || '(nenhum)'}`,
    `- debug: strategy=${x.debug?.nameDetectionStrategy || ''}, rawCandidate=${x.debug?.rawNameCandidate || ''}, mergedPages=${(x.debug?.mergedPages || []).join(',')}, confidence=${x.debug?.confidence ?? ''}`,
    '- texto bruto resumido:',
    '```txt',
    x.textoBrutoTrecho || '(vazio)',
    '```',
    ''
  ].join('\n')).join('\n');

  const md = [
    '# Revisão de Criaturas Normalizadas',
    '',
    '## 1. Resumo',
    `- total de criaturas: ${summary.total}`,
    `- total OK: ${summary.totalOk}`,
    `- total REVISAR: ${summary.totalRevisar}`,
    `- total OK com warnings: ${summary.totalOkWithWarnings}`,
    `- total sem nome confiável: ${summary.totalSemNomeConfiavel}`,
    `- total descriptionOnly descartado/mesclado: ${summary.totalDescriptionOnlyMesclado}`,
    `- total falsePositive descartado: ${summary.totalFalsePositiveDescartado}`,
    `- total final de criaturas exportáveis: ${summary.totalExportaveis}`,
    `- total sem VD: ${summary.totalSemVD}`,
    `- total sem PV: ${summary.totalSemPV}`,
    `- total sem defesa: ${summary.totalSemDefesa}`,
    `- total sem ataques: ${summary.totalSemAtaques}`,
    '',
    '## Exportáveis para Foundry',
    '| index | nome | página | elemento | VD | PV | defesa | ataques | warnings |',
    '|---|---|---:|---|---:|---|---:|---:|---|',
    exportTable,
    '',
    '## 2. Criaturas OK',
    '| index | nome | página | elemento | VD | PV | defesa | ataques |',
    '|---|---|---:|---|---:|---|---:|---:|',
    okTable,
    '',
    '## 3. Criaturas para revisar',
    '| index | nome | página | problemas |',
    '|---|---|---:|---|',
    revTable,
    '',
    '## 4. Detalhes dos índices problemáticos',
    details || '(nenhum)'
  ].join('\n');

  fs.writeFileSync(outMd, md, 'utf8');

  if (fs.existsSync(extractionReport)) {
    const base = fs.readFileSync(extractionReport, 'utf8');
    const append = [
      '',
      '## Visão de revisão (normalized-review)',
      `- total de criaturas: ${summary.total}`,
      `- total OK: ${summary.totalOk}`,
      `- total REVISAR: ${summary.totalRevisar}`,
      `- total OK com warnings: ${summary.totalOkWithWarnings}`,
      `- total sem nome confiável: ${summary.totalSemNomeConfiavel}`,
      `- total descriptionOnly descartado/mesclado: ${summary.totalDescriptionOnlyMesclado}`,
      `- total falsePositive descartado: ${summary.totalFalsePositiveDescartado}`,
      `- total final de criaturas exportáveis: ${summary.totalExportaveis}`,
      '- relatório detalhado: output/normalized-review.md'
    ].join('\n');
    fs.writeFileSync(extractionReport, `${base.replace(/\s+$/, '')}\n${append}\n`, 'utf8');
  }

  console.log(`Gerado: ${outJson}`);
  console.log(`Gerado: ${outMd}`);
  console.log(`Atualizado: ${extractionReport}`);
}

main();
