"use client";

// 「売る」画面の在庫タブ。
// 場所別（自宅・イベント会場・委託先）の在庫一覧＋/−調整、制作・入庫、在庫移動、イベント終了。

import { useState } from "react";
import { useStore, type StockLocation } from "@/lib/store";
import type { Product } from "@/types";

/** 指定場所の在庫数 */
function stockOf(p: Product, loc: StockLocation): number {
  if (loc === "base" || loc === "event") return p.inventory[loc];
  if (loc.startsWith("consignment:"))
    return p.inventory.consignments[loc.split(":")[1]] ?? 0;
  return 0;
}

export function InventoryTab({ onNotify }: { onNotify: (m: string) => void }) {
  const { ready, products, locations, adjustInventory, endEvent } = useStore();
  const [productionOpen, setProductionOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  function handleEndEvent() {
    if (
      !window.confirm(
        "イベントを終了し、会場の在庫をすべて自宅へ戻しますか？",
      )
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

  const groups: { title: string; loc: StockLocation; low: boolean }[] = [
    { title: "🏠 自宅", loc: "base", low: false },
    { title: "🎪 イベント会場", loc: "event", low: true },
    ...locations.map((l) => ({
      title: `🏪 ${l.name}`,
      loc: `consignment:${l.id}` as StockLocation,
      low: false,
    })),
  ];

  return (
    <div className="space-y-7">
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

      <div className="max-w-3xl space-y-6">
        {groups.map((g) => {
          const items = products.filter((p) => stockOf(p, g.loc) > 0);
          return (
            <div key={g.loc}>
              <h3 className="mb-3 px-1 text-sm font-semibold">{g.title}</h3>
              {items.length === 0 ? (
                <div className="px-1 text-xs text-[#77778d]">在庫なし</div>
              ) : (
                <div className="space-y-2">
                  {items.map((p) => {
                    const qty = stockOf(p, g.loc);
                    const isLow = g.low && qty <= p.alertStock;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between rounded-[16px] border bg-white p-3 ${
                          isLow ? "border-[#f0b429]" : "border-[#dedee8]"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-medium">{p.name}</span>
                          {isLow && (
                            <span className="ml-2 rounded-full bg-[#fff0b3] px-2 py-0.5 text-[10px] font-semibold text-[#8a6d00]">
                              残りわずか
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => adjustInventory(p.id, g.loc, -1)}
                            className="grid h-8 w-8 place-items-center rounded-full border border-[#c7c7de] bg-white text-base leading-none"
                            aria-label="減らす"
                          >
                            −
                          </button>
                          <span className="w-12 text-center text-sm font-bold">
                            {qty}個
                          </span>
                          <button
                            onClick={() => adjustInventory(p.id, g.loc, 1)}
                            className="grid h-8 w-8 place-items-center rounded-full border border-[#c7c7de] bg-white text-base leading-none"
                            aria-label="増やす"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {locations.length === 0 && (
          <div className="rounded-xl bg-[#f2f2f6] p-4 text-center text-xs text-[#77778d]">
            委託先を追加すると、ここに委託在庫が表示されます（委託タブ・管理画面で登録予定）。
          </div>
        )}
      </div>

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
