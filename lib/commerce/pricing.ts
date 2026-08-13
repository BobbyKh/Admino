export type WholesaleTier = { minQuantity: number; unitPrice: number };

export function parseWholesaleTiers(raw: string | null | undefined): WholesaleTier[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.flatMap((tier) => {
      if (!tier || typeof tier !== "object") return [];
      const { minQuantity, unitPrice } = tier as Record<string, unknown>;
      return Number.isInteger(minQuantity) && Number.isInteger(unitPrice)
        ? [{ minQuantity: Number(minQuantity), unitPrice: Number(unitPrice) }]
        : [];
    }).sort((a, b) => a.minQuantity - b.minQuantity);
  } catch {
    return [];
  }
}

export function getQuantityUnitPrice(retailPrice: number, rawTiers: string | null | undefined, quantity: number) {
  return parseWholesaleTiers(rawTiers).reduce(
    (price, tier) => quantity >= tier.minQuantity ? tier.unitPrice : price,
    retailPrice
  );
}
