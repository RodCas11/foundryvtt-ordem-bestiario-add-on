const fs = require('fs');
const path = require('path');
const { hasMojibake } = require('./encoding-utils');

const root = path.resolve(__dirname, '..');
const targets = [
  path.join(root, 'input', 'creatures.manual.json'),
  path.join(root, 'input', 'creatures.normalized.json'),
  path.join(root, 'output', 'foundry-actors.json')
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function scan(value, valuePath, issues) {
  if (typeof value === 'string') {
    if (hasMojibake(value)) {
      issues.push(`${valuePath} = ${value}`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((v, i) => scan(v, `${valuePath}[${i}]`, issues));
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => scan(v, `${valuePath}.${k}`, issues));
  }
}

function main() {
  const issues = [];

  for (const file of targets) {
    if (!fs.existsSync(file)) {
      console.error(`Arquivo ausente: ${file}`);
      process.exit(1);
    }

    const parsed = readJson(file);
    scan(parsed, file, issues);
  }

  if (issues.length) {
    console.error('Mojibake detectado:');
    issues.forEach((i) => console.error(`- ${i}`));
    process.exit(1);
  }

  console.log('Encoding OK: nenhum mojibake encontrado.');
}

main();
