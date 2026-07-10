// localStorage への読み書きを1か所に集約する共通関数。
// SSR（サーバー側）では window が無いので安全に空データを返す。
// キーは元アプリと同一: products / locations / salesHistory

import type { Location, Product, Sale } from "@/types";

export const STORAGE_KEYS = {
  products: "products",
  locations: "locations",
  salesHistory: "salesHistory",
} as const;

/** 汎用の読み込み（失敗時は fallback を返す） */
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** 汎用の書き込み */
function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 容量超過などは黙って無視（個人利用のため）
  }
}

/**
 * 古い/不完全な商品データを補正する（元アプリ init() の移行処理に相当）。
 * 在庫・アラート閾値・表示順が無ければ既定値を補う。
 */
function migrateProduct(p: Product): Product {
  const inv = p.inventory;
  return {
    ...p,
    alertStock: p.alertStock ?? 5,
    displayOrder: p.displayOrder ?? 999,
    active: p.active ?? true,
    inventory: {
      base: inv?.base ?? 0,
      event: inv?.event ?? 0,
      consignments: inv?.consignments ?? {},
    },
  };
}

// --- 商品 ---
export function loadProducts(): Product[] {
  return read<Product[]>(STORAGE_KEYS.products, []).map(migrateProduct);
}
export function saveProducts(products: Product[]): void {
  write(STORAGE_KEYS.products, products);
}

// --- 場所（委託先） ---
export function loadLocations(): Location[] {
  return read<Location[]>(STORAGE_KEYS.locations, []);
}
export function saveLocations(locations: Location[]): void {
  write(STORAGE_KEYS.locations, locations);
}

// --- 販売履歴 ---
export function loadSales(): Sale[] {
  return read<Sale[]>(STORAGE_KEYS.salesHistory, []);
}
export function saveSales(sales: Sale[]): void {
  write(STORAGE_KEYS.salesHistory, sales);
}

/** 新しいIDを採番（元アプリと同じく時刻ベース） */
export function createId(): number {
  return Date.now();
}
