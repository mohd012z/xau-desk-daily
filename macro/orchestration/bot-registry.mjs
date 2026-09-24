function requiredText(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} is required`);
  }
  return value.trim();
}

function canonicalType(value, name) {
  return requiredText(value, name).toUpperCase();
}

export function createBotRegistry(bots) {
  if (!Array.isArray(bots)) throw new TypeError('bots must be an array');
  const seen = new Set();

  const normalized = bots.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new TypeError(`bots[${index}] must be an object`);
    }
    const id = requiredText(raw.id, `bots[${index}].id`);
    if (seen.has(id)) throw new TypeError(`duplicate bot id: ${id}`);
    seen.add(id);

    const priority = raw.priority ?? 100;
    if (!Number.isFinite(priority)) throw new TypeError(`bots[${index}].priority must be finite`);
    if (!Array.isArray(raw.subscriptions) || raw.subscriptions.length === 0) {
      throw new TypeError(`bots[${index}].subscriptions must be a non-empty array`);
    }
    if (typeof raw.run !== 'function') throw new TypeError(`bots[${index}].run must be a function`);

    const subscriptions = [...new Set(raw.subscriptions.map((value, subIndex) =>
      canonicalType(value, `bots[${index}].subscriptions[${subIndex}]`)
    ))];

    return Object.freeze({
      id,
      priority,
      subscriptions: Object.freeze(subscriptions),
      run: raw.run,
    });
  }).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  const registry = Object.freeze(normalized);

  function matching(event) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      throw new TypeError('event must be an object');
    }
    const type = canonicalType(event.type, 'event.type');
    return Object.freeze(registry.filter((bot) => bot.subscriptions.includes(type)));
  }

  function botIds() {
    return Object.freeze(registry.map((bot) => bot.id));
  }

  return Object.freeze({ matching, botIds });
}
