"use client";

// アプリ全体で共有するデータストア。
// localStorage を主データとし、初回マウント時に読み込み → 変更のたびに保存する。
// 各画面（売る・在庫・委託・履歴・ホーム）はこの useStore() を通してデータを扱う。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AgeBand, CartItem, Gender, Location, Product, Sale } from "@/types";
import {
  STORAGE_KEYS,
  loadLocations,
  loadProducts,
  loadSales,
  saveProducts,
  saveSales,
} from "@/lib/storage";
import { cartTotal } from "@/lib/money";

/** 初回起動時だけ投入するサンプル商品（デプロイ直後から動作確認できるように） */
const SEED_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Amber mist",
    price: 2200,
    category: "candle",
    active: true,
    alertStock: 5,
    displayOrder: 1,
    inventory: { base: 0, event: 8, consignments: {} },
  },
  {
    id: 2,
    name: "Sunday garden",
    price: 2400,
    category: "candle",
    active: true,
    alertStock: 5,
    displayOrder: 2,
    inventory: { base: 0, event: 3, consignments: {} },
  },
  {
    id: 3,
    name: "Morning sachet",
    price: 800,
    category: "sachet",
    active: true,
    alertStock: 5,
    displayOrder: 3,
    inventory: { base: 0, event: 12, consignments: {} },
  },
  {
    id: 4,
    name: "Petal candle",
    price: 1600,
    category: "candle",
    active: true,
    alertStock: 5,
    displayOrder: 4,
    inventory: { base: 0, event: 1, consignments: {} },
  },
];

interface StoreValue {
  /** localStorage の読み込みが完了したか（描画のちらつき防止に使う） */
  ready: boolean;
  products: Product[];
  locations: Location[];
  sales: Sale[];
  /** イベント会場での会計（在庫を減らし、販売履歴に記録） */
  checkoutEventSale: (cart: CartItem[], gender: Gender, age: AgeBand) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // 初回マウント時に localStorage から読み込む（未初期化ならサンプルを投入）
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.localStorage.getItem(STORAGE_KEYS.products) === null
    ) {
      saveProducts(SEED_PRODUCTS);
    }
    setProducts(loadProducts());
    setLocations(loadLocations());
    setSales(loadSales());
    setReady(true);
  }, []);

  const checkoutEventSale = useCallback(
    (cart: CartItem[], gender: Gender, age: AgeBand) => {
      if (cart.length === 0) return;

      // イベント在庫を減らす
      setProducts((prev) => {
        const next = prev.map((p) => {
          const item = cart.find((c) => c.productId === p.id);
          if (!item) return p;
          return {
            ...p,
            inventory: {
              ...p.inventory,
              event: Math.max(0, p.inventory.event - item.quantity),
            },
          };
        });
        saveProducts(next);
        return next;
      });

      // 販売履歴に記録
      const sale: Sale = {
        timestamp: new Date().toISOString(),
        items: cart.map((c) => ({
          productId: c.productId,
          name: c.name,
          price: c.price,
          quantity: c.quantity,
        })),
        gender,
        age,
        total: cartTotal(cart),
        location: "event",
      };
      setSales((prev) => {
        const next = [...prev, sale];
        saveSales(next);
        return next;
      });
    },
    [],
  );

  return (
    <StoreContext.Provider
      value={{ ready, products, locations, sales, checkoutEventSale }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore は StoreProvider の内側で使ってください");
  }
  return ctx;
}
