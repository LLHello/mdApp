export type NormalizedSkuAttr = { name: string; value: string };

const toNumber = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const pickSkuPriceValue = (sku: any): number | null => {
  if (!sku) return null;
  return (
    toNumber(sku.price) ??
    toNumber(sku.marketPrice) ??
    toNumber(sku.costPrice) ??
    null
  );
};

export const pickGoodsPriceValue = (goods: any): number | null => {
  if (!goods) return null;
  const skus = Array.isArray(goods.skus) ? goods.skus : [];
  if (skus.length) {
    const prices = skus
      .map((s: any) => pickSkuPriceValue(s))
      .filter((n: number | null): n is number => n != null);
    if (prices.length) return Math.min(...prices);
  }
  return toNumber(goods.price);
};

export const formatMoney = (v: any): string => {
  const n = toNumber(v);
  if (n == null) return "--";
  return n.toFixed(2);
};

export const parseSkuAttrs = (raw: any): NormalizedSkuAttr[] => {
  if (raw == null || raw === "") return [];
  let arr: any = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((it: any) => {
      const name = String(
        it?.attr_name ?? it?.attrName ?? it?.name ?? it?.attr ?? ""
      ).trim();
      const value = String(
        it?.attr_value ?? it?.attrValue ?? it?.value ?? it?.val ?? ""
      ).trim();
      return { name, value };
    })
    .filter((it: NormalizedSkuAttr) => it.name && it.value);
};

export const skuAttrsToLabel = (attrs: NormalizedSkuAttr[]): string => {
  if (!attrs?.length) return "";
  return attrs.map((a) => `${a.name}:${a.value}`).join(" / ");
};

