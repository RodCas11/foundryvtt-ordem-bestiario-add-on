(async () => {
  const MODULE_ID = 'ordem-bestiario';
  const PACK_COLLECTION = 'ordem-bestiario.ameacas';
  const EXPECTED_TYPE = 'threat';
  const FOLDER_BY_ELEMENT = {
    blood: 'Sangue',
    death: 'Morte',
    knowledge: 'Conhecimento',
    energy: 'Energia',
    fear: 'Medo'
  };
  const REQUIRED_FOLDERS = ['Sangue', 'Morte', 'Conhecimento', 'Energia', 'Medo'];

  const log = (...args) => console.log(`[${MODULE_ID}]`, ...args);
  const warn = (...args) => console.warn(`[${MODULE_ID}]`, ...args);
  const error = (...args) => console.error(`[${MODULE_ID}]`, ...args);

  if (!game.user?.isGM) {
    ui.notifications?.error('Esta macro deve ser executada por um GM.');
    return;
  }

  const module = game.modules.get(MODULE_ID);
  if (!module?.active) {
    ui.notifications?.error('Módulo ordem-bestiario não está ativo. Ative-o em Gerenciar Módulos.');
    return;
  }

  const pack = game.packs.get(PACK_COLLECTION);
  if (!pack) {
    ui.notifications?.error('Compêndio ordem-bestiario.ameacas não encontrado. Verifique se o módulo está ativo e se o module.json declara o pack.');
    return;
  }

  const rawJson = await Dialog.prompt({
    title: 'Importar Actors para Compêndio (ordem-bestiario.ameacas)',
    content: `
      <form>
        <div class="form-group" style="display:flex;flex-direction:column;gap:8px;">
          <label for="ob-json"><strong>Cole o conteúdo de output/foundry-actors.json:</strong></label>
          <textarea id="ob-json" style="min-height:320px; width:100%; font-family:monospace;"></textarea>
        </div>
      </form>
    `,
    label: 'Importar',
    callback: (html) => html.find('#ob-json').val()?.trim() ?? '',
    rejectClose: false
  });

  if (!rawJson) {
    ui.notifications?.warn('Importação cancelada: nenhum JSON informado.');
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    ui.notifications?.error('JSON inválido. Verifique o conteúdo colado.');
    error('Falha ao fazer parse do JSON:', e);
    return;
  }

  parsed = repairMojibakeDeep(parsed);

  if (!Array.isArray(parsed)) {
    ui.notifications?.error('JSON inválido: esperado um array de Actors.');
    return;
  }

  
  function repairMojibakeString(value) {
    if (typeof value !== 'string') return value;
    if (!/[ÃÂ�]/.test(value)) return value;
    try {
      const bytes = new Uint8Array([...value].map((ch) => ch.charCodeAt(0) & 0xff));
      const repaired = new TextDecoder('utf-8').decode(bytes);
      if (!/[ÃÂ�]/.test(repaired)) return repaired;
      return repaired;
    } catch {
      return value;
    }
  }

  function repairMojibakeDeep(value) {
    if (typeof value === 'string') return repairMojibakeString(value);
    if (Array.isArray(value)) return value.map(repairMojibakeDeep);
    if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        value[key] = repairMojibakeDeep(value[key]);
      }
    }
    return value;
  }
  const sanitizeActor = (actor) => {
    const a = foundry.utils.deepClone(actor);
    delete a._id;
    delete a.folder;
    if (a._stats?.exportSource) delete a._stats.exportSource;

    if (Array.isArray(a.items)) {
      a.items = a.items.map((item) => {
        const i = foundry.utils.deepClone(item);
        delete i._id;
        delete i.folder;
        if (i._stats?.exportSource) delete i._stats.exportSource;
        return i;
      });
    } else {
      a.items = [];
    }

    return a;
  };

  const getNormalized = (value) =>
    String(value ?? '')
      .trim()
      .toLowerCase();

  const resolveElement = (actor) => {
    const fromSourceData = getNormalized(actor?.flags?.[MODULE_ID]?.sourceData?.elemento);
    if (fromSourceData) return fromSourceData;
    const fromDetails = getNormalized(actor?.system?.details?.element);
    if (fromDetails) return fromDetails;
    return getNormalized(actor?.system?.elements?.main);
  };

  const resolveFolderName = (resolvedElement) => FOLDER_BY_ELEMENT[resolvedElement] ?? 'Conhecimento';

  const ensurePackFolders = async (packCollection) => {
    const currentFolders = game.folders.filter((f) => f.pack === packCollection && f.type === 'Actor');
    const byName = new Map(currentFolders.map((folder) => [folder.name, folder]));

    for (const folderName of REQUIRED_FOLDERS) {
      if (!byName.has(folderName)) {
        const [created] = await Folder.createDocuments(
          [{ name: folderName, type: 'Actor', sorting: 'a', pack: packCollection }],
          { pack: packCollection }
        );
        byName.set(folderName, created);
      }
    }

    return byName;
  };

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const importLogRows = [];

  await pack.getDocuments();
  const existingNames = new Set(pack.index.map((doc) => doc.name));

  await pack.configure({ locked: false });

  try {
    const foldersByName = await ensurePackFolders(pack.collection);

    for (const sourceActor of parsed) {
      const name = sourceActor?.name ?? '(sem nome)';

      if (!sourceActor?.name || !String(sourceActor.name).trim()) {
        skipped += 1;
        warn('Pulado actor sem nome.');
        continue;
      }

      if (sourceActor.type !== EXPECTED_TYPE) {
        skipped += 1;
        warn(`Pulado "${name}" por type inválido: ${sourceActor.type}`);
        continue;
      }

      if (existingNames.has(sourceActor.name)) {
        skipped += 1;
        warn(`Pulado "${name}" por já existir no compêndio.`);
        continue;
      }

      try {
        const actorToCreate = sanitizeActor(sourceActor);
        actorToCreate.name = repairMojibakeString(actorToCreate.name);
        actorToCreate.prototypeToken = actorToCreate.prototypeToken || {};
        actorToCreate.prototypeToken.name = repairMojibakeString(actorToCreate.prototypeToken?.name ?? actorToCreate.name);
        const resolvedElement = resolveElement(sourceActor);
        const resolvedFolderName = resolveFolderName(resolvedElement);
        const resolvedFolder = foldersByName.get(resolvedFolderName);
        if (!resolvedFolder) throw new Error(`Pasta "${resolvedFolderName}" não disponível no compêndio.`);
        actorToCreate.folder = resolvedFolder.id;
        await Actor.createDocuments([actorToCreate], { pack: pack.collection });
        existingNames.add(sourceActor.name);
        imported += 1;
        importLogRows.push({
          name,
          element: resolvedElement || '(não identificado)',
          folder: resolvedFolderName
        });
        log(`Importado: ${name}`);
      } catch (e) {
        failed += 1;
        error(`Erro ao importar "${name}":`, e);
      }
    }
  } finally {
    await pack.configure({ locked: true });
  }

  if (importLogRows.length) {
    console.table(importLogRows);
    importLogRows.forEach((row) => log(`${row.name} | ${row.element} | ${row.folder}`));
    const degolificadaRow = importLogRows.find((row) => String(row.name || '').toLowerCase() === 'degolificada');
    if (degolificadaRow) {
      log(`Degolificada | ${degolificadaRow.element} | ${degolificadaRow.folder}`);
      if (degolificadaRow.element !== 'fear' || degolificadaRow.folder !== 'Medo') {
        warn(`Degolificada fora do esperado. Atual: ${degolificadaRow.element} | ${degolificadaRow.folder} (esperado: fear | Medo)`);
      }
    } else {
      warn('Degolificada não apareceu no log de importação.');
    }
  }

  const summary = `Importação concluída: ${imported} importado(s), ${skipped} pulado(s), ${failed} erro(s).`;
  ui.notifications?.info(summary);
  log(summary);
})();

