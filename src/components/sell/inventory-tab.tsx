"use client";

// 「売る」画面の在庫タブ。
// 場所（自宅・イベント会場・委託先）を選んでアコーディオンで開き、取り扱い商品と在庫数を確認する。
// 各在庫行で±調整、上部から制作・入庫／在庫移動／イベント終了ができる。
// 委託先の在庫もこの画面でまとめて管理する（委託タブは廃止）。

import { useState } from "react";
import { BagIcon } from "@/components/icons";
import { useStore, type StockLocation } from "@/lib/store";
import type { Category, Product } from "@/types";

/** カテゴリごとの淡い色（モックの世界観に合わせる） */
const CATEGORY_TONE: Record<Category, string> = {
  sachet: "bg-[#bceee9]",
  candle: "bg-[#f5c2e7]",
  other: "bg-[#fff0b3]",
};
const CATEGORY_LABEL: Record<Category, string> = {
  sachet: "サシェ",
  candle: "キャンドル",
  other: "その他",
};

/** 指定場所の在庫数 */
function stockOf(p: Product, loc: StockLocation): number {
  if (loc === "base" || loc === "event") return p.inventory[loc];
  if (loc.startsWith("consignment:"))
    return p.inventory.consignments[loc.split(":")[1]] ?? 0;
  return 0;
}

/** 全委託先を合わせた在庫数 */
function consignmentTotalOf(p: Product): number {
  return Object.values(p.inventory.consignments).reduce((a, b) => a + b, 0);
}

function ProductThumb({ tone }: { tone: string }) {
  return (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${tone}`}
    >
      <BagIcon className="h-5 w-5" />
    </span>
  );
}

/** ± の在庫調整ボタン */
function QtyStepper({
  qty,
  onMinus,
  onPlus,
}: {
  qty: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onMinus}
        aria-label="減らす"
        className="grid h-8 w-8 place-items-center rounded-full border border-[#c7c7de] bg-white text-base leading-none"
      >
        −
      </button>
      <span className="w-12 text-center text-sm font-bold">{qty}個</span>
      <button
        onClick={onPlus}
        aria-label="増やす"
        className="grid h-8 w-8 place-items-center rounded-full border border-[#c7c7de] bg-white text-base leading-none"
      >
        +
      </button>
    </div>
  );
}

type Place = {
  id: StockLocation;
  label: string;
  tone: string;
  sub: string;
  low?: boolean;
  consignment?: boolean;
};

export function InventoryTab({ onNotify }: { onNotify: (m: string) => void }) {
  const { ready, products, locations, adjustInventory, endEvent } = useStore();
  const [openLoc, setOpenLoc] = useState<StockLocation>("base");
  const [productionOpen, setProductionOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  function handleEndEvent() {
    if (
      !window.confirm("イベントを終了し、会場の在庫をすべて自宅へ戻しますか？")
    )
      return;
    const r = endEvent();
    onNotify(r.ok ? "会場の在庫を自宅へ戻しました" : r.message ?? "エラー");
  }

  if (!ready) {
    return (
      <div className="py-16 text-center text-sm text-[#77778d]">読み込み中…</div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#c7c7de] bg-white py-16 text-center">
        <p className="text-sm font-medium">商品がありません</p>
        <p className="mt-1 text-xs text-[#77778d]">
          「商品を追加」から登録すると、ここに在庫が表示されます。
        </p>
      </div>
    );
  }

  const places: Place[] = [
    { id: "base", label: "自宅", tone: "bg-[#f5c2e7]", sub: "商品ごとの在庫を確認" },
    {
      id: "event",
      label: "イベント会場",
      tone: "bg-[#fff0b3]",
      sub: "商品ごとの在庫を確認",
      low: true,
    },
    {
      id: "consignment",
      label: "委託先",
      tone: "bg-[#bceee9]",
      sub: "店舗ごとの委託在庫を確認",
      consignment: true,
    },
  ];

  const totalOf = (place: Place) =>
    products.reduce(
      (s, p) =>
        s + (place.consignment ? consignmentTotalOf(p) : stockOf(p, place.id)),
      0,
    );

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium tracking-[-0.04em]">在庫管理</h2>
          <p className="mt-1 text-sm text-[#77778d]">
            在庫の確認・入庫・移動をまとめて管理します。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setProductionOpen(true)}
            className="inline-flex h-10 items-center rounded-full bg-[#050038] px-4 text-sm font-medium text-white"
          >
            制作・入庫
          </button>
          <button
            onClick={() => setMoveOpen(true)}
            className="inline-flex h-10 items-center rounded-full border border-[#b9b9ca] bg-white px-4 text-sm font-medium"
          >
            在庫を移動
          </button>
          <button
            onClick={handleEndEvent}
            className="inline-flex h-10 items-center rounded-full border border-[#b9b9ca] bg-white px-4 text-sm font-medium"
          >
            イベント終了
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-medium tracking-[-0.04em]">場所別の在庫</h2>
          <p className="mt-1 text-sm text-[#77778d]">
            場所を選択すると、取り扱い商品と在庫数を確認できます。
          </p>
        </div>

        <div className="space-y-3">
          {places.map((place) => {
            const isOpen = openLoc === place.id;
            return (
              <article
                key={place.id}
                className={`overflow-hidden rounded-[24px] border bg-white transition ${
                  isOpen ? "border-[#050038]" : "border-[#dedee8]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenLoc(isOpen ? "" : place.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left sm:px-6"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-full text-sm ${place.tone}`}
                    >
                      ●
                    </span>
                    <div>
                      <h3 className="font-medium">{place.label}</h3>
                      <p className="mt-0.5 text-xs text-[#77778d]">{place.sub}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {totalOf(place)}個
                    </span>
                    <span
                      className={`text-lg text-[#77778d] transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      ⌄
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-[#e6e6ed] p-5 sm:p-6">
                    {place.consignment ? (
                      <ConsignmentPanel />
                    ) : (
                      <LocationTable place={place} />
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {productionOpen && (
        <ProductionModal
          onClose={() => setProductionOpen(false)}
          onDone={(m) => {
            setProductionOpen(false);
            onNotify(m);
          }}
        />
      )}
      {moveOpen && (
        <MoveModal
          onClose={() => setMoveOpen(false)}
          onDone={(m) => {
            setMoveOpen(false);
            onNotify(m);
          }}
          onError={onNotify}
        />
      )}
    </div>
  );

  /** 自宅・イベント会場の在庫テーブル（±調整つき） */
  function LocationTable({ place }: { place: Place }) {
    const items = products.filter((p) => stockOf(p, place.id) > 0);
    if (items.length === 0) {
      return <p className="text-sm text-[#77778d]">在庫なし</p>;
    }
    return (
      <div className="overflow-x-auto rounded-[20px] border border-[#dedee8]">
        <table className="w-full min-w-[440px] border-collapse text-left">
          <tbody>
            {items.map((p) => {
              const qty = stockOf(p, place.id);
              const isLow = !!place.low && qty <= p.alertStock;
              return (
                <tr
                  key={p.id}
                  className="border-b border-[#eeeef3] last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumb tone={CATEGORY_TONE[p.category]} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {p.name}
                          {isLow && (
                            <span className="ml-2 rounded-full bg-[#fff0b3] px-2 py-0.5 text-[10px] font-semibold text-[#8a6d00]">
                              残りわずか
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-[#77778d]">
                          {CATEGORY_LABEL[p.category]}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <QtyStepper
                        qty={qty}
                        onMinus={() => adjustInventory(p.id, place.id, -1)}
                        onPlus={() => adjustInventory(p.id, place.id, 1)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  /** 委託先ごとの委託在庫パネル（店舗カード・±調整つき） */
  function ConsignmentPanel() {
    if (locations.length === 0) {
      return (
        <div className="rounded-[16px] bg-[#f2f2f6] p-5 text-center text-xs leading-5 text-[#77778d]">
          委託先がまだ登録されていません。
          <br />
          「管理」画面で委託先を追加すると、ここに店舗ごとの委託在庫が表示されます。
        </div>
      );
    }
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {locations.map((l) => {
          const locKey: StockLocation = `consignment:${l.id}`;
          const items = products.filter(
            (p) => (p.inventory.consignments[l.id] ?? 0) > 0,
          );
          const sum = items.reduce(
            (s, p) => s + (p.inventory.consignments[l.id] ?? 0),
            0,
          );
          return (
            <section key={l.id} className="rounded-[20px] bg-[#f7f7fa] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#bceee9] text-sm font-medium">
                    {l.name.charAt(0)}
                  </span>
                  <h4 className="text-sm font-medium">{l.name}</h4>
                </div>
                <span className="text-sm font-semibold">{sum}個</span>
              </div>
              {items.length === 0 ? (
                <p className="mt-3 text-xs text-[#77778d]">在庫なし</p>
              ) : (
                <ul className="mt-4 space-y-2 border-t border-[#dedee8] pt-3">
                  {items.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="min-w-0 truncate text-sm">{p.name}</span>
                      <QtyStepper
                        qty={p.inventory.consignments[l.id] ?? 0}
                        onMinus={() => adjustInventory(p.id, locKey, -1)}
                        onPlus={() => adjustInventory(p.id, locKey, 1)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    );
  }
}

const selectClass =
  "h-12 w-full rounded-xl border border-[#c7c7de] bg-white px-3 text-sm outline-none focus:border-[#050038]";
const inputClass =
  "h-12 w-full rounded-xl border border-[#c7c7de] px-3 text-sm outline-none focus:border-[#050038]";

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#050038]/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_24px_60px_-12px_rgba(5,0,56,0.4)] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium tracking-[-0.04em]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="grid h-9 w-9 place-items-center rounded-full text-lg text-[#77778d] hover:bg-[#f4f4f8]"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProductionModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { products, addProduction } = useStore();
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");

  const qty = parseInt(quantity, 10) || 0;
  const canAdd = productId !== "" && qty >= 1;

  function handleAdd() {
    if (!canAdd) return;
    addProduction(Number(productId), qty);
    onDone(`自宅に ${qty}個 入庫しました`);
  }

  return (
    <ModalShell title="制作・入庫" onClose={onClose}>
      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">商品</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={selectClass}
          >
            <option value="">商品を選択</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">個数</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </div>
        <p className="text-xs text-[#77778d]">入庫先は「自宅」です。</p>
      </div>
      <div className="mt-7 flex gap-3">
        <button
          onClick={onClose}
          className="h-12 flex-1 rounded-full border border-[#b9b9ca] text-sm font-medium"
        >
          キャンセル
        </button>
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          入庫する
        </button>
      </div>
    </ModalShell>
  );
}

function MoveModal({
  onClose,
  onDone,
  onError,
}: {
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { products, locations, moveInventory } = useStore();
  const [productId, setProductId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [quantity, setQuantity] = useState("");

  const qty = parseInt(quantity, 10) || 0;
  const canMove = productId !== "" && from !== "" && to !== "" && qty >= 1;

  const places: { value: string; label: string }[] = [
    { value: "base", label: "自宅" },
    { value: "event", label: "イベント会場" },
    ...locations.map((l) => ({
      value: `consignment:${l.id}`,
      label: l.name,
    })),
  ];

  function handleMove() {
    if (!canMove) return;
    const r = moveInventory(Number(productId), from, to, qty);
    if (r.ok) onDone("在庫を移動しました");
    else onError(r.message ?? "移動できませんでした");
  }

  return (
    <ModalShell title="在庫を移動" onClose={onClose}>
      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">商品</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={selectClass}
          >
            <option value="">商品を選択</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-sm font-medium">移動元</label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={selectClass}
            >
              <option value="">選択</option>
              {places.map((pl) => (
                <option key={pl.value} value={pl.value}>
                  {pl.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">移動先</label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={selectClass}
            >
              <option value="">選択</option>
              {places.map((pl) => (
                <option key={pl.value} value={pl.value}>
                  {pl.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">個数</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </div>
      </div>
      <div className="mt-7 flex gap-3">
        <button
          onClick={onClose}
          className="h-12 flex-1 rounded-full border border-[#b9b9ca] text-sm font-medium"
        >
          キャンセル
        </button>
        <button
          onClick={handleMove}
          disabled={!canMove}
          className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          移動する
        </button>
      </div>
    </ModalShell>
  );
}
