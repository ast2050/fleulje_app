// 金額計算・表示のための共通関数。

/** 円表記に整形（例: 1234 -> "¥1,234"） */
export function formatYen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

/** 1明細の小計（単価 × 個数） */
export function lineTotal(item: { price: number; quantity: number }): number {
  return item.price * item.quantity;
}

/** 合計金額 */
export function cartTotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

/** お釣り（マイナスにはしない） */
export function calcChange(payment: number, total: number): number {
  return Math.max(0, payment - total);
}
