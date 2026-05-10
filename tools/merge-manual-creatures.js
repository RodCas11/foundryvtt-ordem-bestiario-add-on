const fs = require('fs');
const path = require('path');
const { repairMojibakeDeep } = require('./encoding-utils');

const root = path.resolve(__dirname, '..');
const lotesDir = path.join(root, 'input', 'manual-lotes');
const outManual = path.join(root, 'input', 'creatures.manual.json');
const outNormalized = path.join(root, 'input', 'creatures.normalized.json');
const outReport = path.join(root, 'output', 'manual-merge-report.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function ensureArray(v, fallback = []) { return Array.isArray(v) ? v : fallback; }

function normalizeCreature(c) {
  const n = { ...c };
  n.nome = n.nome || '';
  n.imagem = n.imagem || 'icons/svg/mystery-man.svg';
  n.token = n.token || 'icons/svg/mystery-man.svg';
  n.elementosSecundarios = ensureArray(n.elementosSecundarios, []);
  n.tipo = n.tipo || 'creature';
  n.status = n.status || 'ok';
  n.revisar = ensureArray(n.revisar, []);
  n.warnings = ensureArray(n.warnings, []);
  n.ataques = ensureArray(n.ataques, []);
  n.habilidades = ensureArray(n.habilidades, []);
  n.traits = n.traits && typeof n.traits === 'object' ? n.traits : {};
  n.fonte = n.fonte && typeof n.fonte === 'object' ? n.fonte : {};
  n.fonte.livro = n.fonte.livro || 'Livro de Regras';

  n.presencaPerturbadora = n.presencaPerturbadora && typeof n.presencaPerturbadora === 'object'
    ? n.presencaPerturbadora
    : { dt: null, danoMental: '', nexImune: null };
  n.presencaPerturbadora.dt = n.presencaPerturbadora.dt ?? null;
  n.presencaPerturbadora.danoMental = n.presencaPerturbadora.danoMental ?? '';
  n.presencaPerturbadora.nexImune = n.presencaPerturbadora.nexImune ?? null;

  n.pontosDeVida = n.pontosDeVida && typeof n.pontosDeVida === 'object'
    ? n.pontosDeVida
    : { value: null, max: null };
  n.pontosDeVida.value = n.pontosDeVida.value ?? null;
  n.pontosDeVida.max = n.pontosDeVida.max ?? null;

  n.deslocamento = n.deslocamento && typeof n.deslocamento === 'object'
    ? n.deslocamento
    : { walk: '', unit: 'm', squares: 0 };
  n.deslocamento.walk = n.deslocamento.walk ?? '';
  n.deslocamento.unit = n.deslocamento.unit || 'm';
  n.deslocamento.squares = n.deslocamento.squares ?? 0;

  n.atributos = n.atributos && typeof n.atributos === 'object'
    ? n.atributos
    : { dex: null, str: null, int: null, pre: null, vit: null };

  n.pericias = n.pericias && typeof n.pericias === 'object'
    ? n.pericias
    : { fighting: null, aim: null, resilience: null, reflexes: null, will: null, initiative: null, perception: null };

  n.resistencias = n.resistencias && typeof n.resistencias === 'object' ? n.resistencias : {};
  n.descricao = n.descricao ?? '';
  n.enigmaDeMedo = n.enigmaDeMedo ?? '';

  if (typeof n.exportable !== 'boolean') {
    n.exportable = (n.status === 'ok');
  }

  return n;
}

function main() {
  fs.mkdirSync(path.join(root, 'output'), { recursive: true });
  fs.mkdirSync(lotesDir, { recursive: true });

  const files = fs.readdirSync(lotesDir)
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const mergedManual = [];
  const duplicates = [];
  const names = new Map();
  const byFile = [];

  for (const file of files) {
    const full = path.join(lotesDir, file);
    const data = repairMojibakeDeep(readJson(full));
    if (!Array.isArray(data)) {
      throw new Error(`Arquivo ${file} não contém array JSON.`);
    }

    byFile.push({ file, count: data.length });

    for (const c of data) {
      const nome = String(c?.nome || '').trim();
      if (nome) {
        const key = nome.toLowerCase();
        if (names.has(key)) {
          duplicates.push({ nome, firstFile: names.get(key), duplicateFile: file });
        } else {
          names.set(key, file);
        }
      }
      mergedManual.push(c);
    }
  }

  const repairedManual = repairMojibakeDeep(mergedManual);
  const normalized = repairedManual.map(normalizeCreature);

  fs.writeFileSync(outManual, JSON.stringify(repairedManual, null, 2), 'utf8');
  fs.writeFileSync(outNormalized, JSON.stringify(normalized, null, 2), 'utf8');

  const report = [
    '# Relatório de Merge Manual',
    '',
    `- Pasta lida: input/manual-lotes`,
    `- Total de arquivos: ${files.length}`,
    `- Total de criaturas (manual): ${repairedManual.length}`,
    `- Total de criaturas (normalized): ${normalized.length}`,
    `- Duplicidades por nome: ${duplicates.length}`,
    '',
    '## Arquivos processados',
    ...(byFile.length ? byFile.map((x) => `- ${x.file}: ${x.count}`) : ['- (nenhum arquivo .json encontrado)']),
    '',
    '## Duplicidades',
    ...(duplicates.length ? duplicates.map((d) => `- ${d.nome}: ${d.firstFile} vs ${d.duplicateFile}`) : ['- (nenhuma)']),
    '',
    '## Saídas geradas',
    '- input/creatures.manual.json',
    '- input/creatures.normalized.json',
    '- output/manual-merge-report.md'
  ].join('\n');

  fs.writeFileSync(outReport, report, 'utf8');

  console.log(`Gerado: ${outManual}`);
  console.log(`Gerado: ${outNormalized}`);
  console.log(`Gerado: ${outReport}`);
}

main();

