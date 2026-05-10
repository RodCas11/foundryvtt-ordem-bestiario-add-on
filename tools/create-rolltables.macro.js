(async () => {
  const MODULE_ID = "ordem-bestiario";
  const PACK_COLLECTION = "ordem-bestiario.tabelas";
  const TABLE_NAME = "Roleta Maluca do Anfitrião";
  const FORMULA = "1d6";

  if (!game.user?.isGM) {
    ui.notifications?.error("Esta macro deve ser executada por um GM.");
    return;
  }

  const pack = game.packs.get(PACK_COLLECTION);
  if (!pack) {
    ui.notifications?.error(`Compêndio ${PACK_COLLECTION} não encontrado.`);
    return;
  }

  const resultsText = [
    "Sofre -5 na Defesa até o final da cena.",
    "Deve usar uma ação completa fazendo coisas sem sentido ou sofre 4d10 pontos de dano mental no final de seu turno.",
    "Sofre 4d20 pontos de dano de Energia.",
    "Sofre -20 em Pontaria até o final da cena.",
    "Sofre -20 em Luta até o final da cena.",
    "Nada acontece."
  ];

  const rollTableResults = resultsText.map((text, i) => ({
    type: CONST.TABLE_RESULT_TYPES.TEXT,
    text,
    weight: 1,
    range: [i + 1, i + 1],
    drawn: false,
    img: "icons/svg/d20.svg"
  }));

  const wasLocked = !!pack.locked;
  await pack.configure({ locked: false });

  try {
    const docs = await pack.getDocuments();
    const existing = docs.find((d) => d.name === TABLE_NAME);

    if (existing) {
      await existing.update({
        name: TABLE_NAME,
        formula: FORMULA,
        replacement: true,
        displayRoll: true,
        results: rollTableResults
      });
      ui.notifications?.info(`Tabela atualizada: ${TABLE_NAME}`);
      console.log(`[${MODULE_ID}] Tabela atualizada: ${TABLE_NAME}`);
    } else {
      await RollTable.createDocuments(
        [{
          name: TABLE_NAME,
          formula: FORMULA,
          replacement: true,
          displayRoll: true,
          results: rollTableResults
        }],
        { pack: pack.collection }
      );
      ui.notifications?.info(`Tabela criada: ${TABLE_NAME}`);
      console.log(`[${MODULE_ID}] Tabela criada: ${TABLE_NAME}`);
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] Erro ao criar/atualizar tabela:`, err);
    ui.notifications?.error("Falha ao criar/atualizar a tabela. Veja o console.");
  } finally {
    await pack.configure({ locked: wasLocked });
  }
})();
