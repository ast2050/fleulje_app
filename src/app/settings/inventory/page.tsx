"use client";

// 管理「商品と在庫」画面（/settings/inventory）。
// サブタブ: 在庫 / 商品 / 委託先。
// 在庫は場所別アコーディオン＋各行の±調整。商品名クリックで在庫移動モーダルを開く。
// 商品はマスタの一覧・追加・編集・表示ON/OFF・削除。委託先は追加・削除（削除時は在庫を自宅へ戻す）。

import Link from "next/link";
import { useMemo, useState } from "react";
import { BagIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import {
  useStore,
  type NewProductInput,
  type ProductEdit,
  type StockLocation,
} from "@/lib/store";
import { formatYen } from "@/lib/money";
import { CATEGORIES, type Category, type Location, type Product } from "@/types";

type Tab = "inventory" | "products" | "locations";

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

const inputClass =
  "h-12 w-full rounded-xl border border-[#c7c7de] bg-white px-3 text-sm outline-none focus:border-[#050038]";
const outlineButton =
  "inline-flex h-10 items-center rounded-full border border-[#b9b9ca] bg-white px-4 text-sm font-medium";
const primaryButton =
  "inline-flex h-10 items-center gap-2 rounded-full bg-[#050038] px-4 text-sm font-medium text-white";

/** 指定場所の在庫数 */
function stockOf(p: Product, loc: StockLocation): number {
  if (loc === "base" || loc === "event") return p.inventory[loc];
  if (loc.startsWith("consignment:"))
    return p.inventory.consignments[loc.split(":")[1]] ?? 0;
  return 0;
}
/** 全在庫合計（自宅＋イベント＋委託先） */
function stockTotal(p: Product): number {
  return (
    p.inventory.base +
    p.inventory.event +
    Object.values(p.inventory.consignments).reduce((a, b) => a + b, 0)
  );
}

function ProductThumb({ category }: { category: Category }) {
  return (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${CATEGORY_TONE[category]}`}
    >
      <BagIcon className="h-5 w-5" />
    </span>
  );
}

function QtyStepper({
  quantity,
  onMinus,
  onPlus,
}: {
  quantity: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="減らす"
        onClick={onMinus}
        className="grid h-8 w-8 place-items-center rounded-full border border-[#c7c7de] bg-white text-base leading-none"
      >
        −
      </button>
      <span className="w-11 text-center text-sm font-bold">{quantity}個</span>
      <button
        type="button"
        aria-label="増やす"
        onClick={onPlus}
        className="grid h-8 w-8 place-items-center rounded-full border border-[#c7c7de] bg-white text-base leading-none"
      >
        ＋
      </button>
    </div>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#050038]/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <section
        className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_24px_60px_-12px_rgba(5,0,56,0.4)] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-medium tracking-[-0.04em]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="grid h-9 w-9 place-items-center rounded-full text-lg text-[#77778d] hover:bg-[#f4f4f8]"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

// ---- 在庫サブタブ ----

type MoveTarget = { product: Product; source: StockLocation; sourceLabel: string };

function InventoryPanel({
  onProduction,
  onEndEvent,
  onMove,
}: {
  onProduction: () => void;
  onEndEvent: () => void;
  onMove: (t: MoveTarget) => void;
}) {
  const { products, locations, adjustInventory } = useStore();
  const [openPlace, setOpenPlace] = useState<"base" | "event" | "consignment">(
    "base",
  );

  const places = [
    {
      id: "base" as const,
      label: "自宅",
      tone: "bg-[#f5c2e7]",
      sub: "商品ごとの在庫を確認",
    },
    {
      id: "event" as const,
      label: "イベント会場",
      tone: "bg-[#fff0b3]",
      sub: "商品ごとの在庫を確認",
    },
    {
      id: "consignment" as const,
      label: "委託先",
      tone: "bg-[#bceee9]",
      sub: "店舗ごとの委託在庫を確認",
    },
  ];

  const totalOf = (id: "base" | "event" | "consignment") =>
    products.reduce(
      (s, p) =>
        s +
        (id === "consignment"
          ? Object.values(p.inventory.consignments).reduce((a, b) => a + b, 0)
          : p.inventory[id]),
      0,
    );

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium tracking-[-0.04em]">在庫管理</h2>
          <p className="mt-1 text-sm text-[#77778d]">
            商品名を押すと、移動先と個数を指定できます。±で数を直接調整もできます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onProduction} className={primaryButton}>
            <PlusIcon className="h-4 w-4" />
            制作・入庫
          </button>
          <button type="button" onClick={onEndEvent} className={outlineButton}>
            イベント終了
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-medium tracking-[-0.04em]">場所別の在庫</h2>
          <p className="mt-1 text-sm text-[#77778d]">
            場所を選ぶと、取り扱い商品と在庫数を確認できます。
          </p>
        </div>

        <div className="space-y-3">
          {places.map((place) => {
            const isOpen = openPlace === place.id;
            return (
              <article
                key={place.id}
                className={`overflow-hidden rounded-[24px] border bg-white ${
                  isOpen ? "border-[#050038]" : "border-[#dedee8]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenPlace(isOpen ? "base" : place.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left sm:px-6"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-full text-sm ${place.tone}`}
                    >
                      ●
                    </span>
                    <span>
                      <span className="block font-medium">{place.label}</span>
                      <span className="mt-0.5 block text-xs text-[#77778d]">
                        {place.sub}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {totalOf(place.id)}個
                    </span>
                    <span
                      className={`text-lg text-[#77778d] transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      ⌄
                    </span>
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-[#e6e6ed] p-5 sm:p-6">
                    {place.id === "consignment" ? (
                      locations.length === 0 ? (
                        <div className="rounded-[16px] bg-[#f2f2f6] p-5 text-center text-xs leading-5 text-[#77778d]">
                          委託先がまだ登録されていません。「委託先」タブから追加できます。
                        </div>
                      ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                          {locations.map((location) => {
                            const source: StockLocation = `consignment:${location.id}`;
                            const stocked = products.filter(
                              (p) =>
                                (p.inventory.consignments[location.id] ?? 0) > 0,
                            );
                            const total = stocked.reduce(
                              (s, p) =>
                                s + (p.inventory.consignments[location.id] ?? 0),
                              0,
                            );
                            return (
                              <section
                                key={location.id}
                                className="rounded-[20px] bg-[#f7f7fa] p-4"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-3">
                                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#bceee9] text-sm font-medium">
                                      {location.name.charAt(0)}
                                    </span>
                                    <span className="text-sm font-medium">
                                      {location.name}
                                    </span>
                                  </span>
                                  <span className="text-sm font-semibold">
                                    {total}個
                                  </span>
                                </div>
                                {stocked.length === 0 ? (
                                  <p className="mt-3 text-xs text-[#77778d]">
                                    在庫なし
                                  </p>
                                ) : (
                                  <ul className="mt-4 space-y-3 border-t border-[#dedee8] pt-3">
                                    {stocked.map((p) => (
                                      <li
                                        key={p.id}
                                        className="flex items-center justify-between gap-3"
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onMove({
                                              product: p,
                                              source,
                                              sourceLabel: location.name,
                                            })
                                          }
                                          className="group flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-1 py-1 text-left hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#050038]"
                                        >
                                          <span className="truncate text-sm">
                                            {p.name}
                                          </span>
                                          <span className="shrink-0 text-xs text-[#77778d] group-hover:text-[#050038]">
                                            移動 →
                                          </span>
                                        </button>
                                        <QtyStepper
                                          quantity={
                                            p.inventory.consignments[
                                              location.id
                                            ] ?? 0
                                          }
                                          onMinus={() =>
                                            adjustInventory(p.id, source, -1)
                                          }
                                          onPlus={() =>
                                            adjustInventory(p.id, source, 1)
                                          }
                                        />
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </section>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      (() => {
                        const items = products.filter(
                          (p) => p.inventory[place.id] > 0,
                        );
                        if (items.length === 0)
                          return (
                            <p className="text-sm text-[#77778d]">在庫なし</p>
                          );
                        return (
                          <div className="overflow-x-auto rounded-[20px] border border-[#dedee8]">
                            <table className="w-full min-w-[480px] border-collapse text-left">
                              <tbody>
                                {items.map((p) => {
                                  const quantity = p.inventory[place.id];
                                  const low =
                                    place.id === "event" &&
                                    quantity <= p.alertStock;
                                  return (
                                    <tr
                                      key={p.id}
                                      className="border-b border-[#eeeef3] last:border-0"
                                    >
                                      <td className="px-4 py-3">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onMove({
                                              product: p,
                                              source: place.id,
                                              sourceLabel: place.label,
                                            })
                                          }
                                          className="group flex w-full items-center gap-3 rounded-xl p-1 text-left hover:bg-[#f7f7fa] focus:outline-none focus:ring-2 focus:ring-[#050038]"
                                        >
                                          <ProductThumb category={p.category} />
                                          <span>
                                            <span className="block text-sm font-medium group-hover:text-[#050038]">
                                              {p.name}
                                              {low && (
                                                <span className="ml-2 rounded-full bg-[#fff0b3] px-2 py-0.5 text-[10px] font-semibold text-[#8a6d00]">
                                                  残りわずか
                                                </span>
                                              )}
                                            </span>
                                            <span className="mt-0.5 flex items-center gap-2 text-xs text-[#77778d]">
                                              {CATEGORY_LABEL[p.category]}
                                              <span className="group-hover:text-[#050038]">
                                                移動 →
                                              </span>
                                            </span>
                                          </span>
                                        </button>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex justify-end">
                                          <QtyStepper
                                            quantity={quantity}
                                            onMinus={() =>
                                              adjustInventory(p.id, place.id, -1)
                                            }
                                            onPlus={() =>
                                              adjustInventory(p.id, place.id, 1)
                                            }
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
                      })()
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ---- 商品サブタブ ----

function ProductsPanel({
  onAdd,
  onEdit,
  onDelete,
}: {
  onAdd: () => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  const { products } = useStore();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...products]
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .sort((a, b) =>
        a.displayOrder !== b.displayOrder
          ? a.displayOrder - b.displayOrder
          : a.id - b.id,
      );
  }, [products, search]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium tracking-[-0.04em]">商品マスタ</h2>
          <p className="mt-1 text-sm text-[#77778d]">
            商品の販売設定と在庫アラートを管理します。
          </p>
        </div>
        <button type="button" onClick={onAdd} className={primaryButton}>
          <PlusIcon className="h-4 w-4" />
          商品を追加
        </button>
      </div>

      <div className="mb-4 flex h-11 max-w-sm items-center gap-2 rounded-lg border border-[#c7c7de] bg-white px-3">
        <SearchIcon className="h-5 w-5 text-[#77778d]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="商品名で検索"
          className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-[#77778d]"
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[#c7c7de] bg-white py-16 text-center">
          <p className="text-sm font-medium">商品がありません</p>
          <p className="mt-1 text-xs text-[#77778d]">
            「商品を追加」から登録してください。
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[24px] border border-[#dedee8] bg-white">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead className="border-b border-[#e6e6ed] text-[11px] font-semibold tracking-[0.1em] text-[#77778d]">
              <tr>
                <th className="px-5 py-4">商品</th>
                <th className="px-4 py-4">カテゴリ</th>
                <th className="px-4 py-4 text-right">価格</th>
                <th className="px-4 py-4 text-right">在庫合計</th>
                <th className="px-4 py-4">表示</th>
                <th className="px-5 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-[#eeeef3] last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumb category={p.category} />
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="mt-0.5 text-xs text-[#77778d]">
                          わずか≦{p.alertStock} ・ 表示順 {p.displayOrder}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_TONE[p.category]}`}
                    >
                      {CATEGORY_LABEL[p.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    {formatYen(p.price)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">
                    {stockTotal(p)}個
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                        p.active ? "text-[#176a61]" : "text-[#77778d]"
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          p.active ? "bg-[#38a897]" : "bg-[#b9b9ca]"
                        }`}
                      />
                      {p.active ? "ON" : "OFF"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex gap-3 text-sm font-medium">
                      <button type="button" onClick={() => onEdit(p)}>
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(p)}
                        className="text-[#d12929]"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---- 委託先サブタブ ----

function LocationsPanel({
  onAdd,
  onDelete,
}: {
  onAdd: () => void;
  onDelete: (l: Location) => void;
}) {
  const { locations, products } = useStore();
  const tones = ["bg-[#f5c2e7]", "bg-[#bceee9]", "bg-[#fff0b3]", "bg-[#d8d3ff]"];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium tracking-[-0.04em]">委託先</h2>
          <p className="mt-1 text-sm text-[#77778d]">
            委託先の登録と、店舗ごとの委託在庫を管理します。
          </p>
        </div>
        <button type="button" onClick={onAdd} className={primaryButton}>
          <PlusIcon className="h-4 w-4" />
          委託先を追加
        </button>
      </div>

      {locations.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {locations.map((location, index) => {
            const total = products.reduce(
              (s, p) => s + (p.inventory.consignments[location.id] ?? 0),
              0,
            );
            return (
              <article
                key={location.id}
                className="flex items-center justify-between gap-4 rounded-[24px] border border-[#dedee8] bg-white p-5 sm:px-6"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-2xl text-lg font-medium ${tones[index % tones.length]}`}
                  >
                    {location.name.charAt(0)}
                  </span>
                  <div>
                    <h3 className="font-medium">{location.name}</h3>
                    <p className="mt-1 text-xs text-[#77778d]">
                      委託在庫 {total}個
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(location)}
                  className="text-sm font-medium text-[#d12929]"
                >
                  削除
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-[#c7c7de] bg-white py-16 text-center">
          <p className="text-sm font-medium">委託先がまだありません</p>
          <p className="mt-1 text-xs text-[#77778d]">
            追加すると在庫や在庫移動で選べるようになります。
          </p>
        </div>
      )}
    </section>
  );
}

// ---- モーダル群 ----

function ProductionModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const { products, addProduction } = useStore();
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const qty = parseInt(quantity, 10) || 0;
  const canAdd = productId !== "" && qty >= 1;

  return (
    <ModalShell title="制作・入庫" onClose={onClose}>
      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">商品</span>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={inputClass}
          >
            <option value="">商品を選択</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">個数</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </label>
        <p className="text-xs text-[#77778d]">入庫先は「自宅」です。</p>
      </div>
      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-12 flex-1 rounded-full border border-[#b9b9ca] text-sm font-medium"
        >
          キャンセル
        </button>
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            addProduction(Number(productId), qty);
            onDone(`自宅に ${qty}個 入庫しました`);
          }}
          className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          入庫する
        </button>
      </div>
    </ModalShell>
  );
}

function MoveModal({
  target,
  onClose,
  onDone,
  onError,
}: {
  target: MoveTarget;
  onClose: () => void;
  onDone: (m: string) => void;
  onError: (m: string) => void;
}) {
  const { locations, moveInventory } = useStore();
  const [to, setTo] = useState("");
  const [quantity, setQuantity] = useState("");

  const max = stockOf(target.product, target.source);
  const qty = parseInt(quantity, 10) || 0;
  const canMove = to !== "" && qty >= 1 && qty <= max;

  const destinations = [
    { value: "base", label: "自宅" },
    { value: "event", label: "イベント会場" },
    ...locations.map((l) => ({
      value: `consignment:${l.id}`,
      label: l.name,
    })),
  ].filter((d) => d.value !== target.source);

  return (
    <ModalShell title="在庫を移動" onClose={onClose}>
      <div className="mt-5 space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">商品</p>
          <div className="flex h-12 items-center rounded-xl border border-[#dedee8] bg-[#f7f7fa] px-3 text-sm text-[#52526a]">
            {target.product.name}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">移動元</p>
          <div className="flex h-12 items-center justify-between rounded-xl border border-[#dedee8] bg-[#f7f7fa] px-3 text-sm text-[#52526a]">
            <span>{target.sourceLabel}</span>
            <span className="text-xs">在庫 {max}個</span>
          </div>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">移動先</span>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputClass}
          >
            <option value="">選択</option>
            {destinations.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">個数</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={max}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </label>
      </div>
      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-12 flex-1 rounded-full border border-[#b9b9ca] text-sm font-medium"
        >
          キャンセル
        </button>
        <button
          type="button"
          disabled={!canMove}
          onClick={() => {
            const r = moveInventory(target.product.id, target.source, to, qty);
            if (r.ok) onDone("在庫を移動しました");
            else onError(r.message ?? "移動できませんでした");
          }}
          className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          移動する
        </button>
      </div>
    </ModalShell>
  );
}

/** カテゴリ選択のpillボタン */
function CategoryPicker({
  value,
  onChange,
}: {
  value: Category;
  onChange: (c: Category) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">カテゴリ</p>
      <div className="grid grid-cols-3 gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`h-11 rounded-full text-sm font-medium transition ${
              value === c.value
                ? "bg-[#050038] text-white"
                : "border border-[#d3d3de] text-[#52526a] hover:border-[#050038]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AddProductModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const { addProduct } = useStore();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<Category>("candle");
  const [initialStock, setInitialStock] = useState("");
  const [location, setLocation] = useState<"base" | "event">("event");

  const priceNum = parseInt(price, 10) || 0;
  const canAdd = name.trim() !== "" && priceNum > 0;

  return (
    <ModalShell title="商品を追加" onClose={onClose}>
      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">商品名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：Amber mist"
            autoFocus
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">価格</span>
          <input
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </label>
        <CategoryPicker value={category} onChange={setCategory} />
        <label className="block">
          <span className="mb-2 block text-sm font-medium">初期在庫</span>
          <input
            type="number"
            inputMode="numeric"
            value={initialStock}
            onChange={(e) => setInitialStock(e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </label>
        <div>
          <p className="mb-2 text-sm font-medium">置き場所（初期在庫）</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "event", label: "イベント会場" },
                { value: "base", label: "自宅" },
              ] as const
            ).map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLocation(l.value)}
                className={`h-11 rounded-full text-sm font-medium transition ${
                  location === l.value
                    ? "bg-[#050038] text-white"
                    : "border border-[#d3d3de] text-[#52526a] hover:border-[#050038]"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-12 flex-1 rounded-full border border-[#b9b9ca] text-sm font-medium"
        >
          キャンセル
        </button>
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            const input: NewProductInput = {
              name: name.trim(),
              price: priceNum,
              category,
              initialStock: parseInt(initialStock, 10) || 0,
              location,
            };
            addProduct(input);
            onDone("商品を追加しました");
          }}
          className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          追加する
        </button>
      </div>
    </ModalShell>
  );
}

function EditProductModal({
  product,
  onClose,
  onDone,
  onDelete,
}: {
  product: Product;
  onClose: () => void;
  onDone: (m: string) => void;
  onDelete: () => void;
}) {
  const { updateProduct } = useStore();
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [category, setCategory] = useState<Category>(product.category);
  const [alertStock, setAlertStock] = useState(String(product.alertStock));
  const [displayOrder, setDisplayOrder] = useState(String(product.displayOrder));
  const [active, setActive] = useState(product.active);

  const priceNum = parseInt(price, 10) || 0;
  const canSave = name.trim() !== "" && priceNum > 0;

  return (
    <ModalShell title="商品を編集" onClose={onClose}>
      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">商品名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">価格</span>
          <input
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
        </label>
        <CategoryPicker value={category} onChange={setCategory} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">在庫わずか閾値</span>
            <input
              type="number"
              inputMode="numeric"
              value={alertStock}
              onChange={(e) => setAlertStock(e.target.value)}
              placeholder="5"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">表示順</span>
            <input
              type="number"
              inputMode="numeric"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              placeholder="999"
              className={inputClass}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl bg-[#f7f7fa] p-3 text-sm font-medium"
        >
          販売画面に表示する
          <span
            className={`h-6 w-11 rounded-full p-1 transition ${active ? "bg-[#050038]" : "bg-[#c7c7de]"}`}
          >
            <span
              className={`block h-4 w-4 rounded-full bg-white transition ${active ? "ml-auto" : ""}`}
            />
          </span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-sm font-medium text-[#d12929]"
        >
          この商品を削除
        </button>
      </div>
      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-12 flex-1 rounded-full border border-[#b9b9ca] text-sm font-medium"
        >
          キャンセル
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => {
            const edit: ProductEdit = {
              name: name.trim(),
              price: priceNum,
              category,
              alertStock: parseInt(alertStock, 10) || 0,
              displayOrder: parseInt(displayOrder, 10) || 999,
              active,
            };
            updateProduct(product.id, edit);
            onDone("商品を更新しました");
          }}
          className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          保存する
        </button>
      </div>
    </ModalShell>
  );
}

function AddLocationModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const { addLocation } = useStore();
  const [name, setName] = useState("");
  const canAdd = name.trim() !== "";

  return (
    <ModalShell title="委託先を追加" onClose={onClose}>
      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">店舗名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：muguet atelier"
            autoFocus
            className={inputClass}
          />
        </label>
      </div>
      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-12 flex-1 rounded-full border border-[#b9b9ca] text-sm font-medium"
        >
          キャンセル
        </button>
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            addLocation(name);
            onDone("委託先を追加しました");
          }}
          className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          追加する
        </button>
      </div>
    </ModalShell>
  );
}

function ConfirmModal({
  title,
  body,
  warning,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  warning?: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="mt-5 space-y-4">
        <p className="text-sm leading-6 text-[#52526a]">{body}</p>
        {warning && (
          <div className="rounded-xl bg-[#fff0f0] p-4 text-sm leading-6 text-[#9e2424]">
            {warning}
          </div>
        )}
      </div>
      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-12 flex-1 rounded-full border border-[#b9b9ca] text-sm font-medium"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`h-12 flex-[1.4] rounded-full text-sm font-semibold text-white ${
            danger ? "bg-[#d12929]" : "bg-[#050038]"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

// ---- ページ本体 ----

type ModalState =
  | { kind: "production" }
  | { kind: "end-event" }
  | { kind: "move"; target: MoveTarget }
  | { kind: "add-product" }
  | { kind: "edit-product"; product: Product }
  | { kind: "delete-product"; product: Product }
  | { kind: "add-location" }
  | { kind: "delete-location"; location: Location }
  | null;

export default function SettingsInventoryPage() {
  const { ready, endEvent, deleteProduct, deleteLocation } = useStore();
  const [tab, setTab] = useState<Tab>("inventory");
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(m: string) {
    setToast(m);
    window.setTimeout(() => setToast(null), 2200);
  }
  function close() {
    setModal(null);
  }
  function done(m: string) {
    close();
    showToast(m);
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: "inventory", label: "在庫" },
    { value: "products", label: "商品" },
    { value: "locations", label: "委託先" },
  ];

  return (
    <>
      <Link
        href="/settings"
        className="mb-5 inline-flex text-sm font-medium text-[#52526a] hover:text-[#050038]"
      >
        ← 管理へ戻る
      </Link>
      <PageHeader eyebrow="MANAGE" title="商品と在庫" />
      <p className="-mt-4 mb-7 max-w-xl text-sm leading-6 text-[#77778d]">
        在庫、商品マスタ、委託先をまとめて管理します。
      </p>

      <div className="mb-8 flex w-fit gap-1 overflow-x-auto rounded-full bg-[#ececf1] p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`h-9 shrink-0 rounded-full px-5 text-sm font-medium transition ${
              tab === t.value
                ? "bg-[#050038] text-white"
                : "text-[#52526a] hover:text-[#050038]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!ready ? (
        <div className="py-16 text-center text-sm text-[#77778d]">
          読み込み中…
        </div>
      ) : tab === "inventory" ? (
        <InventoryPanel
          onProduction={() => setModal({ kind: "production" })}
          onEndEvent={() => setModal({ kind: "end-event" })}
          onMove={(target) => setModal({ kind: "move", target })}
        />
      ) : tab === "products" ? (
        <ProductsPanel
          onAdd={() => setModal({ kind: "add-product" })}
          onEdit={(product) => setModal({ kind: "edit-product", product })}
          onDelete={(product) => setModal({ kind: "delete-product", product })}
        />
      ) : (
        <LocationsPanel
          onAdd={() => setModal({ kind: "add-location" })}
          onDelete={(location) =>
            setModal({ kind: "delete-location", location })
          }
        />
      )}

      {modal?.kind === "production" && (
        <ProductionModal onClose={close} onDone={done} />
      )}
      {modal?.kind === "move" && (
        <MoveModal
          target={modal.target}
          onClose={close}
          onDone={done}
          onError={showToast}
        />
      )}
      {modal?.kind === "add-product" && (
        <AddProductModal onClose={close} onDone={done} />
      )}
      {modal?.kind === "edit-product" && (
        <EditProductModal
          product={modal.product}
          onClose={close}
          onDone={done}
          onDelete={() =>
            setModal({ kind: "delete-product", product: modal.product })
          }
        />
      )}
      {modal?.kind === "add-location" && (
        <AddLocationModal onClose={close} onDone={done} />
      )}
      {modal?.kind === "end-event" && (
        <ConfirmModal
          title="イベントを終了しますか？"
          body="イベント会場の在庫をすべて自宅へ戻します。この操作は後から取り消せません。"
          confirmLabel="イベントを終了する"
          onClose={close}
          onConfirm={() => {
            const r = endEvent();
            if (r.ok) done("会場の在庫を自宅へ戻しました");
            else {
              close();
              showToast(r.message ?? "エラー");
            }
          }}
        />
      )}
      {modal?.kind === "delete-product" && (
        <ConfirmModal
          title={`${modal.product.name} を削除しますか？`}
          body="この商品を商品マスタから削除します。過去の販売履歴は残ります。"
          warning={
            stockTotal(modal.product) > 0
              ? "この商品には在庫が残っています。削除すると在庫情報も失われます。"
              : undefined
          }
          confirmLabel="削除する"
          danger
          onClose={close}
          onConfirm={() => {
            deleteProduct(modal.product.id);
            done("商品を削除しました");
          }}
        />
      )}
      {modal?.kind === "delete-location" && (
        <ConfirmModal
          title={`${modal.location.name} を削除しますか？`}
          body="この委託先を削除します。委託先に残っている在庫は自宅へ戻します。"
          confirmLabel="削除する"
          danger
          onClose={close}
          onConfirm={() => {
            deleteLocation(modal.location.id);
            done("委託先を削除しました（在庫は自宅へ戻しました）");
          }}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-8">
          <div className="rounded-full bg-[#050038] px-5 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(5,0,56,0.25)]">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
