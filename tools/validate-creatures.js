const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const inPath = path.join(root, 'input', 'creatures.normalized.json');

const validElements = new Set(['blood', 'death', 'knowledge', 'energy', 'fear']);
const validSizes = new Set(['tiny', 'small', 'medium', 'large', 'huge', 'colossal']);
const validDamageTypes = new Set(['cuttingDamage','impactDamage','piercingDamage','ballisticDamage','fireDamage','eletricDamage','coldDamage','chemicalDamage','mentalDamage','bloodDamage','deathDamage','knowledgeDamage','energyDamage']);
const validAttrs = new Set(['dex', 'int', 'pre', 'str', 'vit']);
const validSkills = new Set(['fighting', 'aim', 'resilience', 'reflexes', 'will', 'initiative', 'perception']);
const validTraits = new Set(['smell', 'acceleratedHealing', 'incorporeal', 'blindsight', 'lowLightVision', 'darkvision']);
const validStatus = new Set(['ok', 'REVISAR', 'REVISAR_ATAQUES']);

function isNum(v) { return typeof v === 'number' && Number.isFinite(v); }
function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')); }

function main() {
  const creatures = readJson(inPath);
  const errors = [];
  const warnings = [];

  creatures.forEach((c, i) => {
    const p = `creatures[${i}]`;
    const isReview = c?.status && c.status !== 'ok';

    if (!c?.nome || !String(c.nome).trim()) errors.push(`${p}: nome obrigatório ausente`);
    if (!c?.elemento || !validElements.has(c.elemento)) {
      if (isReview) warnings.push(`${p}: elemento obrigatório ausente/inválido (REVISAR)`);
      else errors.push(`${p}: elemento obrigatório ausente/inválido`);
    }

    if ((!isNum(c?.vd)) && !isReview) errors.push(`${p}: vd obrigatório numérico`);
    else if (!isNum(c?.vd)) warnings.push(`${p}: vd obrigatório numérico (REVISAR)`);

    if ((!isNum(c?.pontosDeVida?.max)) && !isReview) errors.push(`${p}: pontosDeVida.max obrigatório numérico`);
    else if (!isNum(c?.pontosDeVida?.max)) warnings.push(`${p}: pontosDeVida.max obrigatório numérico (REVISAR)`);

    if ((!isNum(c?.defesa)) && !isReview) errors.push(`${p}: defesa obrigatória numérica`);
    else if (!isNum(c?.defesa)) warnings.push(`${p}: defesa obrigatória numérica (REVISAR)`);

    if ((!c?.tamanho || !validSizes.has(c.tamanho)) && !isReview) errors.push(`${p}: tamanho obrigatório/inválido`);
    else if (!c?.tamanho || !validSizes.has(c.tamanho)) warnings.push(`${p}: tamanho obrigatório/inválido (REVISAR)`);

    if (c?.status && !validStatus.has(c.status)) warnings.push(`${p}: status inesperado (${c.status})`);
    if (c?.revisar != null && !Array.isArray(c.revisar)) errors.push(`${p}: revisar deve ser array`);
    if (c?.warnings != null && !Array.isArray(c.warnings)) errors.push(`${p}: warnings deve ser array`);

    (c?.ataques || []).forEach((a, ai) => {
      const ap = `${p}.ataques[${ai}]`;
      if (!a?.nome || !String(a.nome).trim()) errors.push(`${ap}: ataque sem nome`);
      if (!a?.dano || !String(a.dano).trim()) warnings.push(`${ap}: ataque sem dano (warning)`);
      if (a?.tipoDano && !validDamageTypes.has(a.tipoDano)) errors.push(`${ap}: tipo de dano inválido (${a.tipoDano})`);
      if (a?.atributo && !validAttrs.has(a.atributo)) errors.push(`${ap}: atributo inválido (${a.atributo})`);
      if (a?.pericia && !validSkills.has(a.pericia)) errors.push(`${ap}: perícia inválida (${a.pericia})`);
    });

    if (!Array.isArray(c?.ataques) || c.ataques.length === 0) warnings.push(`${p}: sem ataques (warning)`);

    if (c?.traits && typeof c.traits === 'object') {
      Object.keys(c.traits).forEach((k) => {
        if (!validTraits.has(k)) warnings.push(`${p}: trait fora do conjunto padrão (${k})`);
      });
    }

    if (c?.tokenVariants != null) {
      if (!c.tokenVariants || typeof c.tokenVariants !== 'object' || Array.isArray(c.tokenVariants)) {
        errors.push(`${p}: tokenVariants deve ser objeto`);
      } else {
        Object.entries(c.tokenVariants).forEach(([vk, vv]) => {
          if (!String(vk || '').trim()) errors.push(`${p}: tokenVariants com chave vazia`);
          if (!String(vv || '').trim()) errors.push(`${p}: tokenVariants.${vk} vazio`);
        });
      }
    }

    const known = new Set([
      'nome','imagem','token','elemento','elementosSecundarios','vd','tipo','tamanho','presencaPerturbadora','pontosDeVida','defesa','deslocamento','deslocamentoAlternativo',
      'atributos','pericias','resistencias','resistenciasTexto','vulnerabilidadesTexto','imunidadesTexto','traits','ataques','habilidades','descricao','enigmaDeMedo',
      'fonte','status','revisar','warnings','debug','exportable','descriptionOnly','likelyFalsePositive','tokenVariants'
    ]);
    Object.keys(c || {}).forEach((k) => {
      if (!known.has(k)) warnings.push(`${p}: campo não mapeado (${k})`);
    });
  });

  if (errors.length) {
    console.error('VALIDAÇÃO FALHOU:');
    errors.forEach((e) => console.error(`- ${e}`));
    if (warnings.length) {
      console.error('Avisos:');
      warnings.forEach((w) => console.error(`- ${w}`));
    }
    process.exit(1);
  }

  console.log('Validação OK.');
  if (warnings.length) {
    console.log('Avisos:');
    warnings.forEach((w) => console.log(`- ${w}`));
  }
}

main();
