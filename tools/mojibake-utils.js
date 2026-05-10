function repairMojibakeString(value) {
  if (typeof value !== 'string') return value;
  if (!/[ÃÂâ€]/.test(value)) return value;
  try {
    return Buffer.from(value, 'latin1').toString('utf8');
  } catch {
    return value;
  }
}

function repairMojibakeDeep(input) {
  if (Array.isArray(input)) {
    return input.map((v) => repairMojibakeDeep(v));
  }

  if (input && typeof input === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = repairMojibakeDeep(v);
    }
    return out;
  }

  return repairMojibakeString(input);
}

module.exports = {
  repairMojibakeString,
  repairMojibakeDeep
};
