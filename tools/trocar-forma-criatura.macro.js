if (canvas.tokens.controlled.length !== 1) {
  ui.notifications.warn("Selecione exatamente 1 token.");
  return;
}

const token = canvas.tokens.controlled[0];
const actor = token?.actor;
const variants = actor?.flags?.["ordem-bestiario"]?.tokenVariants;

if (!variants || typeof variants !== "object") {
  ui.notifications.warn("Este ator não possui formas alternativas cadastradas.");
  return;
}

const availableEntries = Object.entries(variants)
  .filter(([_, variant]) => variant && typeof variant === "object" && String(variant.src || "").trim())
  .map(([key, variant]) => {
    const fallbackLabel = key.charAt(0).toUpperCase() + key.slice(1);
    return {
      key,
      label: String(variant.label || fallbackLabel),
      src: String(variant.src)
    };
  });

if (!availableEntries.length) {
  ui.notifications.warn("Este ator não possui formas alternativas cadastradas.");
  return;
}

const sortedEntries = availableEntries.sort((a, b) => {
  if (a.key === "base") return -1;
  if (b.key === "base") return 1;
  return a.label.localeCompare(b.label, "pt-BR");
});

const buttons = {};
for (const entry of sortedEntries) {
  buttons[entry.key] = {
    label: entry.label,
    callback: async () => {
      await token.document.update({
        "texture.src": entry.src,
        name: entry.label === "Base" ? actor.name : `${actor.name} - ${entry.label}`
      });
      ui.notifications.info(`Forma alterada para ${entry.label}.`);
    }
  };
}

new Dialog({
  title: `Trocar Forma - ${actor.name}`,
  content: "<p>Escolha a forma visual para o token selecionado:</p>",
  buttons,
  default: sortedEntries[0]?.key
}).render(true);
