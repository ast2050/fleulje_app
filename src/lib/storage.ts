// localStorage への読み書きを1か所に集約する共通関数。
// SSR（サーバー側）では window が無いので安全に空データを返す。
// キーは元アプリと同一: products / locations / salesHistory

import type {
  Experiment,
  ExperimentHistory,
  LabSettings,
  Location,
  Product,
  Recipe,
  Sale,
  WaxMaster,
} from "@/types";

export const STORAGE_KEYS = {
  products: "products",
  locations: "locations",
  salesHistory: "salesHistory",
  recipes: "cl_masters",
  waxMasters: "cl_wax_masters",
  experiments: "cl_experiments",
  expHistory: "cl_history",
  labSettings: "cl_settings",
} as const;

/** 実験ラボ設定の既定値 */
export const DEFAULT_LAB_SETTINGS: LabSettings = { maxDurationHours: 5 };

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

// --- レシピ ---
/**
 * 古い/不完全なレシピを補正する（元アプリ candle_lab の後方互換）。
 * 旧データの waxType(string) を waxBlend 配列に変換し、必須項目を補う。
 */
function migrateRecipe(r: Recipe & { waxType?: string }): Recipe {
  let waxBlend = Array.isArray(r.waxBlend) ? r.waxBlend : [];
  if (waxBlend.length === 0 && r.waxType) {
    waxBlend = [{ name: r.waxType, grams: 0 }];
  }
  return {
    id: r.id,
    name: r.name ?? "",
    waxBlend,
    fragrancePercent: r.fragrancePercent,
    size: r.size ?? "その他",
    wickSize: r.wickSize,
    memo: r.memo,
  };
}
export function loadRecipes(): Recipe[] {
  return read<(Recipe & { waxType?: string })[]>(STORAGE_KEYS.recipes, []).map(
    migrateRecipe,
  );
}
export function saveRecipes(recipes: Recipe[]): void {
  write(STORAGE_KEYS.recipes, recipes);
}

// --- ワックス素材マスタ ---
export function loadWaxMasters(): WaxMaster[] {
  return read<WaxMaster[]>(STORAGE_KEYS.waxMasters, []);
}
export function saveWaxMasters(waxMasters: WaxMaster[]): void {
  write(STORAGE_KEYS.waxMasters, waxMasters);
}

// --- 実験ラボ（実験・履歴・設定） ---
export function loadExperiments(): Experiment[] {
  return read<Experiment[]>(STORAGE_KEYS.experiments, []);
}
export function saveExperiments(experiments: Experiment[]): void {
  write(STORAGE_KEYS.experiments, experiments);
}
export function loadExpHistory(): ExperimentHistory[] {
  return read<ExperimentHistory[]>(STORAGE_KEYS.expHistory, []);
}
export function saveExpHistory(history: ExperimentHistory[]): void {
  write(STORAGE_KEYS.expHistory, history);
}
export function loadLabSettings(): LabSettings {
  const s = read<Partial<LabSettings>>(
    STORAGE_KEYS.labSettings,
    DEFAULT_LAB_SETTINGS,
  );
  return { maxDurationHours: s.maxDurationHours ?? 5 };
}
export function saveLabSettings(settings: LabSettings): void {
  write(STORAGE_KEYS.labSettings, settings);
}

/** 新しいIDを採番（元アプリと同じく時刻ベース） */
export function createId(): number {
  return Date.now();
}

/** 実験用の文字列ID（同一ミリ秒の衝突を避ける） */
export function newExpId(): string {
  return `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}
