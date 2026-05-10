(async () => {
  const MODULE_TAG = 'ordem-bestiario';
  const EXPECTED_TYPE = 'threat';
  const EXPECTED_SYSTEM = 'ordemparanormal';

  const log = (...args) => console.log(`[${MODULE_TAG}]`, ...args);
  const warn = (...args) => console.warn(`[${MODULE_TAG}]`, ...args);
  const err = (...args) => console.error(`[${MODULE_TAG}]`, ...args);

  function deepClone(data) {
    return foundry.utils.deepClone(data);
  }

  function sanitizeActor(actor) {
    const a = deepClone(actor);

    delete a._id;
    delete a.folder;

    if (a._stats?.exportSource) delete a._stats.exportSource;

    if (Array.isArray(a.items)) {
      a.items = a.items.map((it) => {
        const item = deepClone(it);
        delete item._id;
        delete item.folder;
        if (item._stats?.exportSource) delete item._stats.exportSource;
        return item;
      });
    } else {
      a.items = [];
    }

    return a;
  }

  const dialogContent = `
    <form>
      <div class="form-group" style="display:flex;flex-direction:column;gap:8px;">
        <label for="ob-json"><strong>Cole o conteúdo de output/foundry-actors.json:</strong></label>
        <textarea id="ob-json" style="min-height:320px; width:100%; font-family:monospace;"></textarea>
      </div>
    </form>
  `;

  const rawJson = await Dialog.prompt({
    title: 'Importar Ameaças (ordem-bestiario)',
    content: dialogContent,
    label: 'Importar',
    callback: (html) => html.find('#ob-json').val()?.trim() ?? '',
    rejectClose: false
  });

  if (!rawJson) {
    ui.notifications?.warn('Importação cancelada: nenhum JSON informado.');
    warn('Cancelado: campo de JSON vazio.');
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    ui.notifications?.error('JSON inválido. Verifique o conteúdo colado.');
    err('Falha no parse JSON:', e);
    return;
  }

  if (!Array.isArray(parsed)) {
    ui.notifications?.error('JSON inválido: esperado um array de Actors.');
    err('Estrutura inválida: valor raiz não é array.');
    return;
  }

  const currentSystem = game.system?.id;
  if (currentSystem !== EXPECTED_SYSTEM) {
    ui.notifications?.warn(`Sistema atual é "${currentSystem}"; esperado "${EXPECTED_SYSTEM}".`);
    warn(`Sistema atual divergente. atual=${currentSystem}, esperado=${EXPECTED_SYSTEM}`);
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  log(`Iniciando importação de ${parsed.length} actor(es).`);

  for (const source of parsed) {
    const actorName = source?.name ?? '(sem nome)';

    try {
      if (!source?.name || !String(source.name).trim()) {
        skipped += 1;
        warn('Pulado: actor sem nome.', source);
        continue;
      }

      if (source.type !== EXPECTED_TYPE) {
        skipped += 1;
        warn(`Pulado: actor "${actorName}" com type="${source.type}" (esperado "${EXPECTED_TYPE}").`);
        continue;
      }

      const exists = game.actors?.find((a) => a.name === source.name);
      if (exists) {
        skipped += 1;
        warn(`Pulado: já existe actor com nome "${source.name}" (id=${exists.id}).`);
        continue;
      }

      const sanitized = sanitizeActor(source);
      sanitized.type = EXPECTED_TYPE;

      await Actor.createDocuments([sanitized]);
      imported += 1;
      log(`Importado: "${source.name}".`);
    } catch (e) {
      failed += 1;
      err(`Erro ao importar "${actorName}":`, e);
    }
  }

  const msg = `Importação concluída: ${imported} importado(s), ${skipped} pulado(s), ${failed} com erro.`;
  ui.notifications?.info(msg);
  log(msg);
})();
