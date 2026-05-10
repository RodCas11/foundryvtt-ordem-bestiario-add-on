const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const actorsPath = path.join(root, 'output', 'foundry-actors.json');
const tokenVariantsReportPath = path.join(root, 'output', 'token-variants-report.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function assertEq(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label}: esperado ${expected}, recebido ${actual}`);
  }
}

function assertTrue(actual, label) {
  if (!actual) fail(`${label}: esperado true, recebido ${actual}`);
}

function findByName(list, name) {
  return list.find((a) => a.name === name);
}

function warn(msg, warnings) {
  warnings.push(msg);
  console.warn(`WARN: ${msg}`);
}

function resolveModuleTokenSrcToLocalPath(src) {
  const rel = String(src || '').replace(/^modules\/ordem-bestiario\//, '');
  return path.join(process.cwd(), rel);
}

function normalizeAbilityTipo(tipo) {
  const raw = String(tipo ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return 'padrao';
  if (['passiva', 'passivo', 'passive'].includes(raw)) return 'passiva';
  if (['padrao', 'acao padrao', 'standard'].includes(raw)) return 'padrao';
  if (['movimento', 'movement'].includes(raw)) return 'movimento';
  if (['reacao', 'reaction'].includes(raw)) return 'reacao';
  if (['livre', 'free'].includes(raw)) return 'livre';
  if (['completa', 'full'].includes(raw)) return 'completa';
  return 'padrao';
}

function assertAbility(actor, abilityName, activation) {
  const item = (actor.items || []).find((i) => i?.type === 'ability' && i?.name === abilityName);
  if (!item) fail(`Ability não encontrada em ${actor.name}: ${abilityName}`);
  assertEq(item.type, 'ability', `${actor.name} ${abilityName} type`);
  assertEq(item.system?.activation, activation, `${actor.name} ${abilityName} activation`);
  assertEq(item.system?.abilityType, '', `${actor.name} ${abilityName} abilityType`);
  assertTrue(Boolean(item.system?.description), `${actor.name} ${abilityName} description`);
  assertEq(item.flags?.['ordem-bestiario']?.sourceType, 'manualAbility', `${actor.name} ${abilityName} sourceType`);
}

function findExtraSkill(actor, key) {
  return (actor.flags?.['ordem-bestiario']?.extraSkills || []).find((s) => s?.key === key);
}

function main() {
  const actors = readJson(actorsPath);
  const warnings = [];

  for (const actor of actors) {
    const sourceHabilidades = actor.flags?.['ordem-bestiario']?.sourceData?.habilidades ?? [];
    const expectedPassives = sourceHabilidades.filter((h) => normalizeAbilityTipo(h?.tipo) === 'passiva').length;
    const expectedAbilities = sourceHabilidades.filter((h) => normalizeAbilityTipo(h?.tipo) !== 'passiva').length;
    const actualPassiveEffects = (actor.effects || []).filter((e) => e?.flags?.['ordem-bestiario']?.sourceType === 'manualPassiveEffect').length;
    const actualAbilityItems = (actor.items || []).filter((i) => i?.type === 'ability' && i?.flags?.['ordem-bestiario']?.sourceType === 'manualAbility').length;

    if (expectedPassives !== actualPassiveEffects) {
      fail(`${actor.name}: esperado ${expectedPassives} passivas em effects, gerado ${actualPassiveEffects}`);
    }
    if (expectedAbilities !== actualAbilityItems) {
      fail(`${actor.name}: esperado ${expectedAbilities} habilidades ativas em items, gerado ${actualAbilityItems}`);
    }
  }

  const anfitriao = findByName(actors, 'Anfitrião');
  if (!anfitriao) {
    warn('Actor "Anfitrião" não encontrado para validação de tokenVariants.', warnings);
  } else {
    const variants = anfitriao.flags?.['ordem-bestiario']?.tokenVariants;
    if (!variants || typeof variants !== 'object') {
      warn('Anfitrião sem flags["ordem-bestiario"].tokenVariants.', warnings);
    } else {
      const required = ['base', 'amphitruo', 'aeneas', 'liber', 'plautus', 'silenus'];
      const srcPrefix = 'modules/ordem-bestiario/assets/tokens-normalized/';
      for (const key of required) {
        const entry = variants[key];
        if (!entry) {
          warn(`Anfitrião sem variante obrigatória: ${key}.`, warnings);
          continue;
        }
        if (!String(entry.src || '').startsWith(srcPrefix)) {
          warn(`Anfitrião variante ${key} com src fora do padrão: ${entry.src}`, warnings);
        }
        const localPath = resolveModuleTokenSrcToLocalPath(entry.src);
        if (!fs.existsSync(localPath)) {
          warn(`Anfitrião variante ${key} com arquivo ausente: ${entry.src}`, warnings);
        }
      }

      if (variants.base?.src) {
        if (anfitriao.img !== variants.base.src) {
          warn(`Anfitrião img diferente da variante base. img=${anfitriao.img} base=${variants.base.src}`, warnings);
        }
        const protoSrc = anfitriao.prototypeToken?.texture?.src;
        if (protoSrc !== variants.base.src) {
          warn(`Anfitrião prototypeToken.texture.src diferente da variante base. src=${protoSrc} base=${variants.base.src}`, warnings);
        }
      }
    }
  }

  const zumbiBestial = findByName(actors, 'Zumbi de Sangue Bestial');
  if (!zumbiBestial) fail('Actor não encontrado: Zumbi de Sangue Bestial');
  assertEq(zumbiBestial.system.resistances.ballisticDamage.value, 5, 'Zumbi Bestial ballisticDamage');
  assertEq(zumbiBestial.system.resistances.impactDamage.value, 5, 'Zumbi Bestial impactDamage');
  assertEq(zumbiBestial.system.resistances.piercingDamage.value, 5, 'Zumbi Bestial piercingDamage');
  assertEq(zumbiBestial.system.resistances.bloodDamage.value, 10, 'Zumbi Bestial bloodDamage');
  assertTrue(zumbiBestial.system.resistances.deathDamage.vulnerable, 'Zumbi Bestial deathDamage vulnerable');

  const aberracao = findByName(actors, 'Aberração de Carne');
  if (!aberracao) fail('Actor não encontrado: Aberração de Carne');
  assertEq(aberracao.system.resistances.ballisticDamage.value, 5, 'Aberração ballisticDamage');
  assertEq(aberracao.system.resistances.impactDamage.value, 5, 'Aberração impactDamage');
  assertEq(aberracao.system.resistances.piercingDamage.value, 5, 'Aberração piercingDamage');
  assertEq(aberracao.system.resistances.bloodDamage.value, 10, 'Aberração bloodDamage');
  assertTrue(aberracao.system.resistances.deathDamage.vulnerable, 'Aberração deathDamage vulnerable');

  const carnical = findByName(actors, 'Carniçal Preto da Morte');
  if (!carnical) fail('Actor não encontrado: Carniçal Preto da Morte');
  assertTrue(carnical.system.resistances.ballisticDamage.immune, 'Carniçal ballisticDamage immune');
  assertEq(carnical.system.resistances.cuttingDamage.value, 10, 'Carniçal cuttingDamage');
  assertEq(carnical.system.resistances.impactDamage.value, 10, 'Carniçal impactDamage');
  assertEq(carnical.system.resistances.piercingDamage.value, 10, 'Carniçal piercingDamage');
  assertEq(carnical.system.resistances.deathDamage.value, 20, 'Carniçal deathDamage');
  assertTrue(carnical.system.resistances.energyDamage.vulnerable, 'Carniçal energyDamage vulnerable');
  assertEq(carnical.system.skills?.freeSkill?.name, 'Atletismo', 'Carniçal freeSkill name');
  assertEq(carnical.system.skills?.freeSkill?.attr?.[0], 'str', 'Carniçal freeSkill attr');
  assertEq(carnical.system.skills?.freeSkill?.degree?.value, 15, 'Carniçal freeSkill value');

  const dama = findByName(actors, 'Dama de Sangue');
  if (!dama) fail('Actor não encontrado: Dama de Sangue');
  const expectedDamaAbilities = [
    ['Arremessar (Flor Rosa)', 'free'],
    ['Chuva de Ácido (Flor Vermelha)', 'free'],
    ['Espinhos (Flor Amarela)', 'free'],
    ['Grito Devastador (Flor Roxa)', 'free'],
    ['Miasma Fétido (Flor Azul)', 'default'],
    ['Prisão de Tentáculos (Flor Verde)', 'default'],
    ['Visão Macabra (Flor Laranja)', 'free']
  ];
  for (const [abilityName, activation] of expectedDamaAbilities) {
    assertAbility(dama, abilityName, activation);
  }
  const damaConsumirEffect = (dama.effects || []).find((e) => e?.name === 'Consumir' && e?.flags?.['ordem-bestiario']?.sourceType === 'manualPassiveEffect');
  assertTrue(Boolean(damaConsumirEffect), 'Dama Consumir como effect passivo');

  const silhueta = findByName(actors, 'Silhueta');
  if (!silhueta) fail('Actor não encontrado: Silhueta');
  const auraTangivel = (silhueta.effects || []).find((e) => e?.name === 'Aura Tangível');
  assertTrue(Boolean(auraTangivel), 'Silhueta Aura Tangível em effects');
  assertEq(auraTangivel?.type, 'base', 'Silhueta Aura Tangível type');
  assertTrue(Boolean(auraTangivel?.description), 'Silhueta Aura Tangível description');
  const auraAsItem = (silhueta.items || []).find((i) => i?.name === 'Aura Tangível');
  if (auraAsItem) fail('Silhueta Aura Tangível não deve estar em items');

  const conhecimentoVerdadeiro = (silhueta.effects || []).find((e) => e?.name === 'Conhecimento Verdadeiro');
  assertTrue(Boolean(conhecimentoVerdadeiro), 'Silhueta Conhecimento Verdadeiro em effects');

  assertAbility(silhueta, 'Reescrever a Realidade', 'free');
  assertAbility(silhueta, 'Toque Devastador', 'default');

  const carente = findByName(actors, 'Carente');
  if (!carente) fail('Actor não encontrado: Carente');
  assertEq(carente.system.skills?.freeSkill?.name, 'Atletismo', 'Carente freeSkill name');
  assertEq(carente.system.skills?.freeSkill?.attr?.[0], 'str', 'Carente freeSkill attr');
  assertEq(carente.system.skills?.freeSkill?.degree?.value, 20, 'Carente freeSkill value');
  const carenteDeception = findExtraSkill(carente, 'deception');
  assertTrue(Boolean(carenteDeception), 'Carente extraSkills deception presente');
  assertEq(carenteDeception?.attr, 'pre', 'Carente deception attr');
  assertEq(carenteDeception?.value, 15, 'Carente deception value');
  assertTrue(String(carente.system?.temporary?.abilities || '').includes('PERÍCIAS EXTRAS'), 'Carente temporary.abilities contém PERÍCIAS EXTRAS');
  assertTrue(String(carente.system?.temporary?.abilities || '').includes('Atletismo 4d20+20'), 'Carente temporary.abilities contém Atletismo 4d20+20');
  assertTrue(String(carente.system?.temporary?.abilities || '').includes('Enganação 3d20+15'), 'Carente temporary.abilities contém Enganação 3d20+15');
  assertTrue(!String(carente.system?.temporary?.characteristics || '').includes('PERÍCIAS EXTRAS'), 'Carente temporary.characteristics não contém PERÍCIAS EXTRAS');

  for (const actor of actors) {
    const extraSkills = actor.flags?.['ordem-bestiario']?.extraSkills || [];
    if (extraSkills.length > 0) {
      assertTrue(String(actor.system?.temporary?.abilities || '').includes('PERÍCIAS EXTRAS'), `${actor.name} temporary.abilities contém PERÍCIAS EXTRAS`);
    }
    assertTrue(!String(actor.system?.temporary?.characteristics || '').includes('PERÍCIAS EXTRAS'), `${actor.name} temporary.characteristics sem PERÍCIAS EXTRAS`);
    for (const extra of extraSkills) {
      if (extra.key === 'athletics') assertEq(extra.attr, 'str', `${actor.name} athletics attr`);
      if (extra.key === 'deception') assertEq(extra.attr, 'pre', `${actor.name} deception attr`);
      if (extra.key === 'stealth') assertEq(extra.attr, 'dex', `${actor.name} stealth attr`);
      if (extra.key === 'occultism') assertEq(extra.attr, 'int', `${actor.name} occultism attr`);
      if (extra.key === 'science') assertEq(extra.attr, 'int', `${actor.name} science attr`);
    }
  }

  if (fs.existsSync(tokenVariantsReportPath)) {
    const variantReport = fs.readFileSync(tokenVariantsReportPath, 'utf8');
    if (variantReport.includes('| NÃO |')) {
      warn('token-variants-report.md contém variantes ausentes (exists = NÃO).', warnings);
    }
  }

  if (warnings.length) {
    console.log(`Validação OK com ${warnings.length} warning(s).`);
  } else {
    console.log('Validação OK: resistências, habilidades e tokenVariants conforme esperado.');
  }
}

main();
