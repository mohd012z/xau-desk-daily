function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

const RULES = deepFreeze({
  'bbma-shadow-v1': {
    version: 'bbma-shadow-v1',
    extreme: {
      bb_touch_inclusive: true,
      require_ma5_outside_bb: true
    },
    mhv: {
      require_prior_extreme_context: true,
      require_return_inside_bb: true
    },
    csa: {
      close_cross_inclusive: false,
      require_close_not_wick_only: true
    },
    reentry: {
      zone_touch_inclusive: true,
      require_directional_context: true
    },
    momentum: {
      bb_close_inclusive: false,
      require_body_close_outside_bb: true
    }
  }
});

export function getBbmaRules(version = 'bbma-shadow-v1') {
  if (typeof version !== 'string' || !Object.hasOwn(RULES, version)) {
    throw new TypeError(`Unknown BBMA rule version: ${String(version)}`);
  }
  return RULES[version];
}
