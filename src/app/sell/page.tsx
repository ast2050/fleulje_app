"use client";

import { useMemo, useState } from "react";
import { BagIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { useStore, type NewProductInput } from "@/lib/store";
import { calcChange, cartTotal, formatYen } from "@/lib/money";
import {
  AGE_BANDS,
  CATEGORIES,
  GENDERS,
  type AgeBand,
  type CartItem,
  type Category,
  type Gender,
  type Product,
} from "@/types";

// カテゴリごとの淡い色（モックの世界観に合わせる）
const CATEGORY_TONE: Record<Category, string> = {
  sachet: "bg-[#bceee9]",
  candle: "bg-[#f5c2e7]",
  other: "bg-[#fff0b3]",
};

export default function SellPage() {
  const { ready, products, checkoutEventSale, addProduct } = useStore();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  // 販売可能な商品（表示ON・イベント在庫あり）を検索・並び替え
  const eventProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => p.active && p.inventory.event > 0)
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .sort((a, b) =>
        a.displayOrder !== b.displayOrder
          ? a.displayOrder - b.displayOrder
          : a.id - b.id,
      );
  }, [products, search]);

  const total = cartTotal(cart);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const eventStockOf = (productId: number) =>
    products.find((p) => p.id === productId)?.inventory.event ?? 0;

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      const qty = existing ? existing.quantity : 0;
      if (qty >= product.inventory.event) {
        showToast("これ以上追加できません（在庫の上限）");
        return prev;
      }
      if (existing) {
        return prev.map((c) =>
          c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }

  function changeQty(productId: number, delta: number) {
    setCart((prev) =>
      prev.flatMap((c) => {
        if (c.productId !== productId) return [c];
        const next = c.quantity + delta;
        if (next <= 0) return [];
        if (delta > 0 && next > eventStockOf(productId)) {
          showToast("在庫が不足しています");
          return [c];
        }
        return [{ ...c, quantity: next }];
      }),
    );
  }

  function updatePrice(productId: number, value: string) {
    const price = parseInt(value, 10) || 0;
    setCart((prev) =>
      prev.map((c) => (c.productId === productId ? { ...c, price } : c)),
    );
  }

  function removeItem(productId: number) {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }

  function handleConfirm(gender: Gender, age: AgeBand) {
    checkoutEventSale(cart, gender, age);
    setCart([]);
    setCheckoutOpen(false);
    showToast("会計が完了しました");
  }

  return (
    <>
      <PageHeader eyebrow="SELL" title="売る" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-medium tracking-[-0.04em]">
                  イベント販売
                </h2>
                <p className="mt-1 text-sm text-[#77778d]">
                  イベント会場の在庫から販売します。
                </p>
              </div>
              <button
                onClick={() => setAddOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#b9b9ca] bg-white px-4 text-sm font-medium"
              >
                <PlusIcon className="h-4 w-4" />
                商品を追加
              </button>
            </div>

            <div className="mb-4 flex h-11 items-center gap-2 rounded-lg border border-[#c7c7de] bg-white px-3">
              <SearchIcon className="h-5 w-5 text-[#77778d]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="商品名で検索"
                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-[#77778d]"
              />
            </div>

            {!ready ? (
              <div className="py-16 text-center text-sm text-[#77778d]">
                読み込み中…
              </div>
            ) : eventProducts.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[#c7c7de] bg-white py-16 text-center">
                <p className="text-sm font-medium">
                  販売できる商品がありません
                </p>
                <p className="mt-1 text-xs text-[#77778d]">
                  イベント会場に在庫がある商品がここに並びます。
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {eventProducts.map((product) => {
                  const stock = product.inventory.event;
                  const low = stock <= product.alertStock;
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="rounded-[22px] border border-[#dedee8] bg-white p-3 text-left transition active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(5,0,56,0.06)] sm:p-4"
                    >
                      <span
                        className={`block aspect-square rounded-[16px] ${CATEGORY_TONE[product.category]}`}
                      >
                        <span className="grid h-full place-items-center">
                          <BagIcon className="h-7 w-7" />
                        </span>
                      </span>
                      <p className="mt-3 truncate text-sm font-medium">
                        {product.name}
                      </p>
                      <div className="mt-1 flex items-end justify-between gap-1">
                        <span className="text-sm font-medium">
                          {formatYen(product.price)}
                        </span>
                        <span
                          className={`text-[11px] ${low ? "font-semibold text-[#d12929]" : "text-[#77778d]"}`}
                        >
                          残り{stock}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="self-start rounded-[28px] bg-[#050038] p-5 text-white shadow-[0_12px_32px_-4px_rgba(5,0,56,0.2)] sm:p-6 xl:sticky xl:top-7">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">カート</h2>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs">
                {cartCount} 点
              </span>
            </div>

            <div className="mt-6 space-y-4 border-y border-white/15 py-5">
              {cart.length === 0 ? (
                <p className="py-4 text-center text-sm text-white/55">
                  カートは空です
                </p>
              ) : (
                cart.map((item) => (
                  <div key={item.productId}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{item.name}</p>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="shrink-0 text-xs text-white/60 underline underline-offset-4"
                      >
                        削除
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => changeQty(item.productId, -1)}
                          className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-base leading-none"
                          aria-label="減らす"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => changeQty(item.productId, 1)}
                          className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-base leading-none"
                          aria-label="増やす"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-white/50">¥</span>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) =>
                            updatePrice(item.productId, e.target.value)
                          }
                          className="w-20 rounded-md bg-white/10 px-2 py-1 text-right text-sm font-medium outline-none focus:bg-white/20"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 flex items-end justify-between">
              <span className="text-sm text-white/65">合計</span>
              <span className="text-4xl font-medium tracking-[-0.06em]">
                {formatYen(total)}
              </span>
            </div>

            <button
              onClick={() => setCheckoutOpen(true)}
              disabled={cart.length === 0}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-[#ffd02f] text-sm font-semibold text-[#050038] transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              会計へ進む
            </button>
            <p className="mt-3 text-center text-xs text-white/55">
              会計時に顧客情報を記録できます
            </p>
          </aside>
        </div>

      {checkoutOpen && (
        <CheckoutModal
          total={total}
          onClose={() => setCheckoutOpen(false)}
          onConfirm={handleConfirm}
        />
      )}

      {addOpen && (
        <AddProductModal
          onClose={() => setAddOpen(false)}
          onAdd={(input) => {
            addProduct(input);
            setAddOpen(false);
            showToast("商品を追加しました");
          }}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8">
          <div className="rounded-full bg-[#050038] px-5 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(5,0,56,0.25)]">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}

function AddProductModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (input: NewProductInput) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<Category>("candle");
  const [initialStock, setInitialStock] = useState("");
  const [location, setLocation] = useState<"base" | "event">("event");

  const priceNum = parseInt(price, 10) || 0;
  const canAdd = name.trim() !== "" && priceNum > 0;

  function handleAdd() {
    if (!canAdd) return;
    onAdd({
      name: name.trim(),
      price: priceNum,
      category,
      initialStock: parseInt(initialStock, 10) || 0,
      location,
    });
  }

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
          <h2 className="text-xl font-medium tracking-[-0.04em]">商品を追加</h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="grid h-9 w-9 place-items-center rounded-full text-lg text-[#77778d] hover:bg-[#f4f4f8]"
          >
            ×
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">商品名</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：Amber mist"
              autoFocus
              className="h-12 w-full rounded-xl border border-[#c7c7de] px-3 text-sm outline-none focus:border-[#050038]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">価格</label>
            <div className="flex h-12 items-center gap-1 rounded-xl border border-[#c7c7de] px-3">
              <span className="text-[#77778d]">¥</span>
              <input
                type="number"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="h-full flex-1 bg-transparent text-sm font-medium outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">カテゴリ</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`h-11 rounded-full text-sm font-medium transition ${
                    category === c.value
                      ? "bg-[#050038] text-white"
                      : "border border-[#d3d3de] text-[#52526a] hover:border-[#050038]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">初期在庫</label>
            <input
              type="number"
              inputMode="numeric"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              placeholder="0"
              className="h-12 w-full rounded-xl border border-[#c7c7de] px-3 text-sm outline-none focus:border-[#050038]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              置き場所（初期在庫）
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "event", label: "イベント会場" },
                  { value: "base", label: "自宅" },
                ] as const
              ).map((l) => (
                <button
                  key={l.value}
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
            追加する
          </button>
        </div>
        {!canAdd && (
          <p className="mt-3 text-center text-xs text-[#77778d]">
            商品名と価格（1以上）を入力してください
          </p>
        )}
      </div>
    </div>
  );
}

function CheckoutModal({
  total,
  onClose,
  onConfirm,
}: {
  total: number;
  onClose: () => void;
  onConfirm: (gender: Gender, age: AgeBand) => void;
}) {
  const [payment, setPayment] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [age, setAge] = useState<AgeBand | "">("");

  const change = calcChange(parseInt(payment, 10) || 0, total);
  const canConfirm = gender !== "" && age !== "";

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
          <h2 className="text-xl font-medium tracking-[-0.04em]">会計</h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="grid h-9 w-9 place-items-center rounded-full text-lg text-[#77778d] hover:bg-[#f4f4f8]"
          >
            ×
          </button>
        </div>

        <div className="mt-5 rounded-[20px] bg-[#f7f7fa] p-5">
          <div className="flex items-end justify-between">
            <span className="text-sm text-[#77778d]">合計</span>
            <span className="text-3xl font-medium tracking-[-0.05em]">
              {formatYen(total)}
            </span>
          </div>
          <label className="mt-5 block text-sm font-medium">預かり金額</label>
          <div className="mt-2 flex h-12 items-center gap-1 rounded-xl border border-[#c7c7de] bg-white px-3">
            <span className="text-[#77778d]">¥</span>
            <input
              type="number"
              inputMode="numeric"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              placeholder="0"
              autoFocus
              className="h-full flex-1 bg-transparent text-lg font-medium outline-none"
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-[#77778d]">お釣り</span>
            <span className="text-xl font-semibold">{formatYen(change)}</span>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-sm font-medium">性別</p>
          <div className="grid grid-cols-3 gap-2">
            {GENDERS.map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`h-11 rounded-full text-sm font-medium transition ${
                  gender === g
                    ? "bg-[#050038] text-white"
                    : "border border-[#d3d3de] text-[#52526a] hover:border-[#050038]"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-3 text-sm font-medium">年齢層</p>
          <div className="grid grid-cols-3 gap-2">
            {AGE_BANDS.map((a) => (
              <button
                key={a}
                onClick={() => setAge(a)}
                className={`h-11 rounded-full text-sm font-medium transition ${
                  age === a
                    ? "bg-[#050038] text-white"
                    : "border border-[#d3d3de] text-[#52526a] hover:border-[#050038]"
                }`}
              >
                {a}
              </button>
            ))}
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
            onClick={() => canConfirm && onConfirm(gender as Gender, age as AgeBand)}
            disabled={!canConfirm}
            className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            会計を完了
          </button>
        </div>
        {!canConfirm && (
          <p className="mt-3 text-center text-xs text-[#77778d]">
            性別と年齢層を選ぶと完了できます
          </p>
        )}
      </div>
    </div>
  );
}
