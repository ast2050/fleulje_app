// fleulje 業務アプリ 共通の型定義
// 元アプリ (fleulje1/index.html) のデータ構造に準拠。
// localStorage キー: products / locations / salesHistory

/** 商品カテゴリ */
export type Category = "sachet" | "candle" | "other";

/** カテゴリの表示ラベル */
export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "sachet", label: "サシェ" },
  { value: "candle", label: "キャンドル" },
  { value: "other", label: "その他" },
];

/**
 * 場所ごとの在庫。
 * - base: 自宅
 * - event: イベント会場
 * - consignments: 委託先ID(文字列) => 個数
 */
export interface Inventory {
  base: number;
  event: number;
  consignments: Record<string, number>;
}

/** 商品マスタ */
export interface Product {
  id: number; // Date.now() で採番
  name: string;
  price: number;
  category: Category;
  active: boolean; // 販売画面での表示ON/OFF
  alertStock: number; // 在庫わずか閾値（既定5）
  displayOrder: number; // 表示順（既定999・昇順）
  inventory: Inventory;
}

/** 委託先などの場所 */
export interface Location {
  id: number;
  name: string;
  type: "consignment";
}

/** カート内の1明細（画面のみで保持、永続化しない） */
export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

/** 販売記録の1明細 */
export interface SaleItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

/** 顧客の性別（委託販売は "委託"） */
export type Gender = "女性" | "男性" | "その他" | "委託";

/** 顧客の年齢層（委託販売は "-"） */
export type AgeBand =
  | "10代以下"
  | "20代"
  | "30代"
  | "40代"
  | "50代"
  | "60代以上"
  | "-";

/** 会計モーダルで選べる性別 */
export const GENDERS: Exclude<Gender, "委託">[] = ["女性", "男性", "その他"];

/** 会計モーダルで選べる年齢層 */
export const AGE_BANDS: Exclude<AgeBand, "-">[] = [
  "10代以下",
  "20代",
  "30代",
  "40代",
  "50代",
  "60代以上",
];

/** 販売記録（salesHistory の1件） */
export interface Sale {
  timestamp: string; // ISO 文字列
  items: SaleItem[];
  gender: Gender;
  age: AgeBand;
  total: number;
  location: string; // "event" もしくは `consignment:{locationId}`
  locationName?: string; // 委託販売のとき委託先名
}

/** JSON バックアップの形（元アプリ互換） */
export interface BackupData {
  version: string;
  exportDate: string;
  products: Product[];
  locations: Location[];
  salesHistory: Sale[];
}

// --- レシピ / ワックス素材（元アプリ candle_lab に準拠） ---
// localStorage キー: cl_masters（レシピ）/ cl_wax_masters（ワックス素材）

/** レシピの大きさ */
export type RecipeSize = "大" | "小" | "その他";

/** 大きさの選択肢 */
export const RECIPE_SIZES: RecipeSize[] = ["大", "小", "その他"];

/** 配合ワックスの1行（ワックス名＋グラム） */
export interface WaxBlendItem {
  name: string;
  grams: number;
}

/** レシピ（キャンドルの作り方） */
export interface Recipe {
  id: number;
  name: string; // 作品名（必須）
  waxBlend: WaxBlendItem[]; // 配合ワックス（複数）
  fragrancePercent?: number; // 香料濃度(%)
  size: RecipeSize;
  wickSize?: string; // 芯サイズ（例: CD-10）
  memo?: string;
}

/** ワックス素材マスタ */
export interface WaxMaster {
  id: number;
  name: string;
}

// --- 実験ラボ（元アプリ candle_lab に準拠） ---
// localStorage キー: cl_experiments（進行中）/ cl_history（完了履歴）/ cl_settings（設定）

/** ラップ（時点スナップショット） */
export interface Lap {
  elapsed: number; // 経過ミリ秒
  memo: string;
  recordedAt: number;
}

/** 観察フリーメモ */
export interface ExpMemo {
  text: string;
  elapsed: number;
  recordedAt: number;
}

/** 進行中の実験 */
export interface Experiment {
  id: string;
  masterId: number; // レシピID
  masterName: string; // レシピ名（開始時のコピー）
  masterSnapshot: Recipe; // 開始時点のレシピ内容
  accumulatedMs: number; // 一時停止までに貯めた累計ミリ秒
  startedAt: number | null; // 計測中なら開始時刻(ms)、一時停止中は null
  laps: Lap[];
  memos: ExpMemo[];
  createdAt: number;
}

/** 完了した実験（履歴） */
export interface ExperimentHistory {
  id: string;
  expId: string;
  masterId: number;
  masterName: string;
  masterSnapshot: Recipe;
  accumulatedMs: number; // 最終累計ミリ秒
  laps: Lap[];
  memos: ExpMemo[];
  createdAt: number;
  finishedAt: number;
}

/** 実験ラボの設定 */
export interface LabSettings {
  maxDurationHours: number; // 最大連続計測時間（0=無制限）
}
