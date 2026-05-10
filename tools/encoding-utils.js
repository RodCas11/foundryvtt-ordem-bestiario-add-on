function hasMojibake(value) {
  return typeof value === 'string' && /[ÃÂ�]/.test(value);
}

function repairMojibakeString(value) {
  if (typeof value !== 'string') return value;
  if (!hasMojibake(value)) return value;

  try {
    const repaired = Buffer.from(value, 'latin1').toString('utf8');
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
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = repairMojibakeDeep(v);
    }
    return out;
  }
  return value;
}

module.exports = {
  hasMojibake,
  repairMojibakeString,
  repairMojibakeDeep
};
