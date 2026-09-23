export const PRODUCT_IDENTITY = Object.freeze({
  productName: 'VEYRA',
  platformName: 'HELIX',
  pulseName: 'HELIX Pulse',
  deepLinkScheme: 'veyra',
  repositoryTargetName: 'helix'
});

export function getProductIdentity(overrides = {}) {
  const result = { ...PRODUCT_IDENTITY };
  for (const key of Object.keys(PRODUCT_IDENTITY)) {
    const value = overrides[key];
    if (typeof value === 'string' && value.trim()) result[key] = value.trim();
  }
  return result;
}
