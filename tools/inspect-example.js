const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'input', 'zumbidesangue.json');
const outputDir = path.join(root, 'output');
const outputPath = path.join(outputDir, 'example-structure.md');

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function collectPaths(node, base = '', out = []) {
  if (Array.isArray(node)) {
    out.push(`${base} (array:${node.length})`);
    node.forEach((item, i) => collectPaths(item, `${base}[${i}]`, out));
    return out;
  }

  if (isObject(node)) {
    Object.keys(node).sort().forEach((k) => {
      const next = base ? `${base}.${k}` : k;
      const v = node[k];
      if (isObject(v) || Array.isArray(v)) {
        out.push(next);
        collectPaths(v, next, out);
      } else {
        out.push(`${next} = ${JSON.stringify(v)}`);
      }
    });
  }

  return out;
}

function collectItemTypes(items) {
  const lines = [];
  items.forEach((item, idx) => {
    lines.push(`- [${idx}] name=\`${item?.name ?? ''}\`, type=\`${item?.type ?? ''}\``);
  });
  if (!lines.length) lines.push('- (nenhum item)');
  return lines;
}

function main() {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const actor = JSON.parse(raw);
  fs.mkdirSync(outputDir, { recursive: true });

  const systemPaths = collectPaths(actor.system, 'system', []);
  const itemPaths = [];
  (actor.items || []).forEach((item, idx) => {
    collectPaths(item, `items[${idx}]`, itemPaths);
  });

  const md = [
    '# Estrutura de Exemplo - Ameaça',
    '',
    '## Metadados',
    `- actor.name: \`${actor.name ?? ''}\``,
    `- actor.type: \`${actor.type ?? ''}\``,
    `- actor.img: \`${actor.img ?? ''}\``,
    `- _stats.coreVersion: \`${actor?._stats?.coreVersion ?? ''}\``,
    `- _stats.systemId: \`${actor?._stats?.systemId ?? ''}\``,
    `- _stats.systemVersion: \`${actor?._stats?.systemVersion ?? ''}\``,
    '',
    '## Paths Detectados em actor.system',
    ...systemPaths.map((p) => `- ${p}`),
    '',
    '## Paths Detectados em actor.items',
    ...itemPaths.map((p) => `- ${p}`),
    '',
    '## Items Encontrados',
    ...collectItemTypes(actor.items || []),
    '',
    '## Effects',
    `- total: ${(actor.effects || []).length}`,
    `- bruto: \`${JSON.stringify(actor.effects || [])}\``,
    '',
    '## Flags',
    `- bruto: \`${JSON.stringify(actor.flags || {})}\``,
    ''
  ].join('\n');

  fs.writeFileSync(outputPath, md, 'utf8');
  console.log(`Gerado: ${outputPath}`);
}

main();
