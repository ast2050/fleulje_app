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
