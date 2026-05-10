const assert = require('assert');
const { normalizeExtractedText } = require('./text-normalizer');

function run() {
  assert.strictEqual(
    normalizeExtractedText('TESTE 3O+10 | DANO 2d6+6 impacto'),
    'TESTE 3d20+10 | DANO 2d6+6 impacto'
  );

  assert.strictEqual(
    normalizeExtractedText('(teste 3O+12)'),
    '(teste 3d20+12)'
  );

  assert.strictEqual(
    normalizeExtractedText('TESTE 4Ø+20 DANO 4d10+30 Sangue'),
    'TESTE 4d20+20 DANO 4d10+30 Sangue'
  );

  assert.strictEqual(
    normalizeExtractedText('PANCADA Corpo a corpo x2 TESTE 3O+10 | DANO 2d6+6 impacto'),
    'PANCADA Corpo a corpo x2 TESTE 3d20+10 | DANO 2d6+6 impacto'
  );

  console.log('test-text-normalizer: OK');
}

run();
