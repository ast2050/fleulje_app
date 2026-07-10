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
import type {
  AgeBand,
  CartItem,
  Category,
  Gender,
  Inventory,
  Location,
  Product,
  Recipe,
  Sale,
  WaxMaster,
} from "@/types";
import {
  STORAGE_KEYS,
  createId,
  loadLocations,
  loadProducts,
  loadRecipes,
  loadSales,
  loadWaxMasters,
  saveLocations,
  saveProducts,
  saveRecipes,
  saveSales,
  saveWaxMasters,
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

/** 在庫の場所を表す文字列: "base" | "event" | "consignment:{locationId}" */
export type StockLocation = string;

/** 操作の結果（UIでメッセージ表示に使う） */
export interface ActionResult {
  ok: boolean;
  message?: string;
}

/** 指定の場所の在庫数を読む */
function stockAt(inv: Inventory, loc: StockLocation): number {
  if (loc === "base" || loc === "event") return inv[loc];
  if (loc.startsWith("consignment:")) {
    return inv.consignments[loc.split(":")[1]] ?? 0;
  }
  return 0;
}

/** 指定の場所の在庫数を書き込む（委託先が0以下なら削除） */
function setStock(inv: Inventory, loc: StockLocation, value: number): void {
  if (loc === "base" || loc === "event") {
    inv[loc] = value;
    return;
  }
  if (loc.startsWith("consignment:")) {
    const id = loc.split(":")[1];
    if (value <= 0) delete inv.consignments[id];
    else inv.consignments[id] = value;
  }
}

/** 商品追加モーダルからの入力 */
export interface NewProductInput {
  name: string;
  price: number;
  category: Category;
  /** 初期在庫（省略時0） */
  initialStock?: number;
  /** 初期在庫を置く場所（省略時 event） */
  location?: "base" | "event";
  alertStock?: number;
  displayOrder?: number;
}

/** 商品編集モーダルからの入力（在庫は含まない） */
export interface ProductEdit {
  name: string;
  price: number;
  category: Category;
  alertStock: number;
  displayOrder: number;
  active: boolean;
}

/** レシピ登録・編集モーダルからの入力（id は含まない） */
export type RecipeInput = Omit<Recipe, "id">;

interface StoreValue {
  /** localStorage の読み込みが完了したか（描画のちらつき防止に使う） */
  ready: boolean;
  products: Product[];
  locations: Location[];
  sales: Sale[];
  /** イベント会場での会計（在庫を減らし、販売履歴に記録） */
  checkoutEventSale: (cart: CartItem[], gender: Gender, age: AgeBand) => void;
  /** 商品を新規登録する */
  addProduct: (input: NewProductInput) => void;
  /** 商品マスタを編集する（在庫以外） */
  updateProduct: (productId: number, edit: ProductEdit) => void;
  /** 商品を削除する */
  deleteProduct: (productId: number) => void;
  /** 委託先を追加する */
  addLocation: (name: string) => void;
  /** 委託先を削除する（残った委託在庫は自宅へ戻す） */
  deleteLocation: (locationId: number) => ActionResult;
  /** 在庫を1件だけ増減する（±ボタン） */
  adjustInventory: (
    productId: number,
    location: StockLocation,
    delta: number,
  ) => void;
  /** 制作・入庫（自宅在庫を増やす） */
  addProduction: (productId: number, quantity: number) => void;
  /** 在庫移動（場所間） */
  moveInventory: (
    productId: number,
    from: StockLocation,
    to: StockLocation,
    quantity: number,
  ) => ActionResult;
  /** イベント終了（イベント在庫をすべて自宅へ戻す） */
  endEvent: () => ActionResult;

  // --- レシピ / ワックス素材 ---
  recipes: Recipe[];
  waxMasters: WaxMaster[];
  /** レシピを登録する */
  addRecipe: (input: RecipeInput) => void;
  /** レシピを編集する */
  updateRecipe: (recipeId: number, input: RecipeInput) => void;
  /** レシピを削除する */
  deleteRecipe: (recipeId: number) => void;
  /** ワックス素材を追加する（同名は不可） */
  addWax: (name: string) => ActionResult;
  /** ワックス素材を削除する（登録済みレシピには影響しない） */
  deleteWax: (waxId: number) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [waxMasters, setWaxMasters] = useState<WaxMaster[]>([]);

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
    setRecipes(loadRecipes());
    setWaxMasters(loadWaxMasters());
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

  const addProduct = useCallback((input: NewProductInput) => {
    const location = input.location ?? "event";
    const stock = Math.max(0, input.initialStock ?? 0);
    const product: Product = {
      id: createId(),
      name: input.name,
      price: input.price,
      category: input.category,
      active: true,
      alertStock: input.alertStock ?? 5,
      displayOrder: input.displayOrder ?? 999,
      inventory: {
        base: location === "base" ? stock : 0,
        event: location === "event" ? stock : 0,
        consignments: {},
      },
    };
    setProducts((prev) => {
      const next = [...prev, product];
      saveProducts(next);
      return next;
    });
  }, []);

  const updateProduct = useCallback((productId: number, edit: ProductEdit) => {
    setProducts((prev) => {
      const next = prev.map((p) =>
        p.id === productId ? { ...p, ...edit } : p,
      );
      saveProducts(next);
      return next;
    });
  }, []);

  const deleteProduct = useCallback((productId: number) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      saveProducts(next);
      return next;
    });
  }, []);

  const addLocation = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLocations((prev) => {
      const next: Location[] = [
        ...prev,
        { id: createId(), name: trimmed, type: "consignment" },
      ];
      saveLocations(next);
      return next;
    });
  }, []);

  const deleteLocation = useCallback((locationId: number): ActionResult => {
    const key = String(locationId);
    // その委託先の在庫を自宅へ戻す
    setProducts((prev) => {
      const next = prev.map((p) => {
        const qty = p.inventory.consignments[key] ?? 0;
        if (qty <= 0) return p;
        const consignments = { ...p.inventory.consignments };
        delete consignments[key];
        return {
          ...p,
          inventory: {
            ...p.inventory,
            base: p.inventory.base + qty,
            consignments,
          },
        };
      });
      saveProducts(next);
      return next;
    });
    // 委託先を一覧から削除
    setLocations((prev) => {
      const next = prev.filter((l) => l.id !== locationId);
      saveLocations(next);
      return next;
    });
    return { ok: true };
  }, []);

  const adjustInventory = useCallback(
    (productId: number, location: StockLocation, delta: number) => {
      setProducts((prev) => {
        const next = prev.map((p) => {
          if (p.id !== productId) return p;
          const inv: Inventory = {
            ...p.inventory,
            consignments: { ...p.inventory.consignments },
          };
          const value = stockAt(inv, location) + delta;
          if (value < 0) return p; // 0未満にはしない（変更なし）
          setStock(inv, location, value);
          return { ...p, inventory: inv };
        });
        saveProducts(next);
        return next;
      });
    },
    [],
  );

  const addProduction = useCallback((productId: number, quantity: number) => {
    if (quantity < 1) return;
    setProducts((prev) => {
      const next = prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              inventory: { ...p.inventory, base: p.inventory.base + quantity },
            }
          : p,
      );
      saveProducts(next);
      return next;
    });
  }, []);

  const moveInventory = useCallback(
    (
      productId: number,
      from: StockLocation,
      to: StockLocation,
      quantity: number,
    ): ActionResult => {
      if (from === to)
        return { ok: false, message: "同じ場所へは移動できません" };
      if (quantity < 1)
        return { ok: false, message: "数量を正しく入力してください" };
      const product = products.find((p) => p.id === productId);
      if (!product) return { ok: false, message: "商品が見つかりません" };
      if (stockAt(product.inventory, from) < quantity)
        return { ok: false, message: "移動元の在庫が不足しています" };

      setProducts((prev) => {
        const next = prev.map((p) => {
          if (p.id !== productId) return p;
          const inv: Inventory = {
            ...p.inventory,
            consignments: { ...p.inventory.consignments },
          };
          setStock(inv, from, stockAt(inv, from) - quantity);
          setStock(inv, to, stockAt(inv, to) + quantity);
          return { ...p, inventory: inv };
        });
        saveProducts(next);
        return next;
      });
      return { ok: true };
    },
    [products],
  );

  const endEvent = useCallback((): ActionResult => {
    const hasEventStock = products.some((p) => p.inventory.event > 0);
    if (!hasEventStock)
      return { ok: false, message: "イベント会場に在庫がありません" };
    setProducts((prev) => {
      const next = prev.map((p) =>
        p.inventory.event > 0
          ? {
              ...p,
              inventory: {
                ...p.inventory,
                base: p.inventory.base + p.inventory.event,
                event: 0,
              },
            }
          : p,
      );
      saveProducts(next);
      return next;
    });
    return { ok: true };
  }, [products]);

  // --- レシピ ---
  const addRecipe = useCallback((input: RecipeInput) => {
    setRecipes((prev) => {
      const next = [...prev, { ...input, id: createId() }];
      saveRecipes(next);
      return next;
    });
  }, []);

  const updateRecipe = useCallback((recipeId: number, input: RecipeInput) => {
    setRecipes((prev) => {
      const next = prev.map((r) =>
        r.id === recipeId ? { ...input, id: recipeId } : r,
      );
      saveRecipes(next);
      return next;
    });
  }, []);

  const deleteRecipe = useCallback((recipeId: number) => {
    setRecipes((prev) => {
      const next = prev.filter((r) => r.id !== recipeId);
      saveRecipes(next);
      return next;
    });
  }, []);

  // --- ワックス素材 ---
  const addWax = useCallback(
    (name: string): ActionResult => {
      const trimmed = name.trim();
      if (!trimmed)
        return { ok: false, message: "ワックス名を入力してください" };
      if (waxMasters.some((w) => w.name === trimmed))
        return { ok: false, message: "同じ名前のワックスが既にあります" };
      const next = [...waxMasters, { id: createId(), name: trimmed }];
      setWaxMasters(next);
      saveWaxMasters(next);
      return { ok: true };
    },
    [waxMasters],
  );

  const deleteWax = useCallback((waxId: number) => {
    setWaxMasters((prev) => {
      const next = prev.filter((w) => w.id !== waxId);
      saveWaxMasters(next);
      return next;
    });
  }, []);

  return (
    <StoreContext.Provider
      value={{
        ready,
        products,
        locations,
        sales,
        checkoutEventSale,
        addProduct,
        updateProduct,
        deleteProduct,
        addLocation,
        deleteLocation,
        adjustInventory,
        addProduction,
        moveInventory,
        endEvent,
        recipes,
        waxMasters,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        addWax,
        deleteWax,
      }}
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
