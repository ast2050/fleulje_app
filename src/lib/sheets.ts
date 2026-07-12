"use client";

// スプレッドシート連携（アプリ → シートへの「書き出し」専用）。
//
// Google Apps Script（GAS）の Web App エンドポイントへ POST する。
// 送るデータの性質で方式を分ける:
//   - ログ型（販売履歴・実験履歴） … append（差分追記。既存は消さない）
//   - 状態型（商品・在庫・レシピ）   … replace（まるごと上書き。空なら拒否）
//   - バックアップ（全データJSON）    … backup（日時付きで1行ずつ追記）
//
// CORS のプリフライトを避けるため Content-Type は text/plain で送る
// （application/json にするとブラウザが事前確認リクエストを飛ばし、GAS で失敗しやすい）。

import type { Product, Recipe, Sale, ExperimentHistory } from "@/types";
import { CATEGORIES } from "@/types";
import { STORAGE_KEYS } from "@/lib/storage";

/** 連携設定（URL と合言葉）の保存キー */
const URL_KEY = "sheetSync_url";
const TOKEN_KEY = "sheetSync_token";

export interface SyncConfig {
  url: string;
  token: string;
}

/** 連携設定を localStorage から読む */
export function loadSyncConfig(): SyncConfig {
  if (typeof window === "undefined") return { url: "", token: "" };
  return {
    url: window.localStorage.getItem(URL_KEY) ?? "",
    token: window.localStorage.getItem(TOKEN_KEY) ?? "",
  };
}

/** 連携設定を localStorage に保存する */
export function saveSyncConfig(config: SyncConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(URL_KEY, config.url.trim());
  window.localStorage.setItem(TOKEN_KEY, config.token.trim());
}

/** 書き出しの結果（UI のメッセージ表示に使う） */
export interface SyncResult {
  ok: boolean;
  message: string;
  added?: number;
}

/** GAS に送るペイロードの形（GAS 側と対になる） */
type CellValue = string | number;
interface Payload {
  token: string;
  mode: "append" | "replace" | "backup";
  sheet: string;
  key?: string; // append 時の重複判定キー列（ヘッダー名）
  header: string[];
  rows: CellValue[][];
}

/** 共通の送信処理。設定が無ければエラーを返す。 */
async function post(
  payload: Omit<Payload, "token">,
): Promise<SyncResult> {
  const { url, token } = loadSyncConfig();
  if (!url) {
    return { ok: false, message: "連携先URLが未設定です（設定画面で入力してください）" };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      // text/plain にすることで CORS プリフライトを回避する
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token, ...payload }),
    });
    const text = await res.text();
    let data: SyncResult;
    try {
      data = JSON.parse(text) as SyncResult;
    } catch {
      // GAS がHTML（ログイン要求やエラーページ）を返した場合など
      return {
        ok: false,
        message: "サーバーから予期しない応答がありました（公開設定・URLをご確認ください）",
      };
    }
    return data;
  } catch (err) {
    return {
      ok: false,
      message: `通信に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// --- 各データの整形（ヘッダー順に固定長の行を作る） ---

/** 販売場所を読みやすい表記にする */
function saleLocationLabel(sale: Sale): string {
  if (sale.locationName) return sale.locationName;
  if (sale.location === "event") return "イベント会場";
  return sale.location;
}

/** カテゴリの日本語ラベル */
function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/**
 * 販売履歴 → append。会計を「商品明細ごとの1行」に展開する。
 * 重複判定キーは会計ID（同じ会計の複数明細は同じIDを共有し、まとめて追加/スキップされる）。
 */
export async function syncSales(sales: Sale[]): Promise<SyncResult> {
  const header = [
    "会計ID",
    "日時",
    "商品名",
    "単価",
    "数量",
    "小計",
    "性別",
    "年齢層",
    "販売場所",
  ];
  const rows: CellValue[][] = [];
  for (const sale of sales) {
    for (const item of sale.items) {
      rows.push([
        sale.id,
        sale.timestamp,
        item.name,
        item.price,
        item.quantity,
        item.price * item.quantity,
        sale.gender,
        sale.age,
        saleLocationLabel(sale),
      ]);
    }
  }
  return post({ mode: "append", sheet: "販売履歴", key: "会計ID", header, rows });
}

/**
 * 実験履歴 → append。1実験=1行に要約する。重複判定キーは実験ID。
 */
export async function syncExpHistory(
  history: ExperimentHistory[],
): Promise<SyncResult> {
  const header = [
    "実験ID",
    "作品名",
    "累計時間(分)",
    "ラップ数",
    "メモ数",
    "開始日時",
    "完了日時",
  ];
  const rows: CellValue[][] = history.map((h) => [
    h.id,
    h.masterName,
    Math.round(h.accumulatedMs / 60000),
    h.laps.length,
    h.memos.length,
    new Date(h.createdAt).toISOString(),
    new Date(h.finishedAt).toISOString(),
  ]);
  return post({ mode: "append", sheet: "実験履歴", key: "実験ID", header, rows });
}

/**
 * 商品・在庫 → replace（まるごと上書き）。1商品=1行。
 * 空データでの上書きは GAS 側で拒否される（新端末の空データ対策）。
 */
export async function syncProducts(products: Product[]): Promise<SyncResult> {
  const header = [
    "商品ID",
    "商品名",
    "価格",
    "カテゴリ",
    "自宅在庫",
    "イベント在庫",
    "委託在庫合計",
    "表示",
  ];
  const rows: CellValue[][] = products.map((p) => {
    const consignTotal = Object.values(p.inventory.consignments).reduce(
      (a, b) => a + b,
      0,
    );
    return [
      p.id,
      p.name,
      p.price,
      categoryLabel(p.category),
      p.inventory.base,
      p.inventory.event,
      consignTotal,
      p.active ? "ON" : "OFF",
    ];
  });
  return post({ mode: "replace", sheet: "商品在庫", header, rows });
}

/**
 * レシピ → replace（まるごと上書き）。1レシピ=1行。
 */
export async function syncRecipes(recipes: Recipe[]): Promise<SyncResult> {
  const header = [
    "レシピID",
    "作品名",
    "ワックス配合",
    "香料%",
    "大きさ",
    "芯サイズ",
    "メモ",
  ];
  const rows: CellValue[][] = recipes.map((r) => [
    r.id,
    r.name,
    r.waxBlend.map((w) => `${w.name} ${w.grams}g`).join(" / "),
    r.fragrancePercent ?? "",
    r.size,
    r.wickSize ?? "",
    r.memo ?? "",
  ]);
  return post({ mode: "replace", sheet: "レシピ", header, rows });
}

/**
 * 全データのバックアップ → backup。日時付きで1行ずつ追記（世代管理）。
 * localStorage の全キーを読み、丸ごと JSON 化して保存する。
 */
export async function syncBackup(): Promise<SyncResult> {
  if (typeof window === "undefined") {
    return { ok: false, message: "バックアップはブラウザ上でのみ実行できます" };
  }
  const all: Record<string, unknown> = {};
  for (const storageKey of Object.values(STORAGE_KEYS)) {
    const raw = window.localStorage.getItem(storageKey);
    all[storageKey] = raw ? JSON.parse(raw) : null;
  }
  const header = ["日時", "データ(JSON)"];
  const rows: CellValue[][] = [
    [new Date().toISOString(), JSON.stringify(all)],
  ];
  return post({ mode: "backup", sheet: "バックアップ", header, rows });
}
