"use client";

// 管理「レシピと素材」画面（/settings/recipes）。
// サブタブ: レシピ / ワックス素材。
// レシピ: 一覧＋登録/編集（作品名・配合ワックス複数・香料濃度・大きさ・芯・メモ）/削除。
// ワックス素材: 追加（同名不可）/削除（登録済みレシピには影響しない）。

import Link from "next/link";
import { useState } from "react";
import { FlaskIcon, PlusIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { useStore, type RecipeInput } from "@/lib/store";
import { RECIPE_SIZES, type Recipe, type RecipeSize } from "@/types";

type Tab = "recipes" | "wax";

const inputClass =
  "h-12 w-full rounded-xl border border-[#c7c7de] bg-white px-3 text-sm outline-none focus:border-[#050038]";

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
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_24px_60px_-12px_rgba(5,0,56,0.4)] sm:p-8"
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

// ---- レシピサブタブ ----

function RecipeCard({
  recipe,
  onEdit,
  onDelete,
}: {
  recipe: Recipe;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-[24px] border border-[#dedee8] bg-white p-5 transition hover:shadow-[0_4px_14px_rgba(5,0,56,0.06)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f5c2e7]">
            <FlaskIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-medium">{recipe.name}</h3>
            <p className="mt-1 text-xs text-[#77778d]">
              {recipe.size} ・ 芯 {recipe.wickSize || "未設定"}
            </p>
          </div>
        </div>
        <div className="flex gap-3 text-sm font-medium">
          <button type="button" onClick={onEdit}>
            編集
          </button>
          <button type="button" onClick={onDelete} className="text-[#d12929]">
            削除
          </button>
        </div>
      </div>
      {recipe.waxBlend.length > 0 && (
        <div className="mt-5 border-t border-[#e6e6ed] pt-4">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-[#77778d]">
            配合ワックス
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recipe.waxBlend.map((wax, i) => (
              <span
                key={`${wax.name}-${i}`}
                className="rounded-full bg-[#eef8f6] px-3 py-1.5 text-xs font-medium text-[#176a61]"
              >
                {wax.name}{" "}
                {wax.grams > 0 && (
                  <span className="text-[#52857e]">{wax.grams}g</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-[#77778d]">香料濃度</dt>
          <dd className="mt-1 font-medium">
            {recipe.fragrancePercent != null
              ? `${recipe.fragrancePercent}%`
              : "未設定"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-[#77778d]">メモ</dt>
          <dd className="mt-1 truncate font-medium">{recipe.memo || "—"}</dd>
        </div>
      </dl>
    </article>
  );
}

function RecipesTab({
  onAdd,
  onEdit,
  onDelete,
}: {
  onAdd: () => void;
  onEdit: (r: Recipe) => void;
  onDelete: (r: Recipe) => void;
}) {
  const { recipes } = useStore();
  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium tracking-[-0.04em]">レシピ</h2>
          <p className="mt-1 text-sm text-[#77778d]">
            配合、香り、芯のサイズを作品ごとに記録します。
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#050038] px-4 text-sm font-medium text-white"
        >
          <PlusIcon className="h-4 w-4" />
          新しいレシピを登録
        </button>
      </div>
      {recipes.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {recipes.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onEdit={() => onEdit(r)}
              onDelete={() => onDelete(r)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-[#c7c7de] bg-white py-16 text-center">
          <p className="text-sm font-medium">レシピがありません</p>
          <p className="mt-1 text-xs text-[#77778d]">
            「新しいレシピを登録」から追加してください。
          </p>
        </div>
      )}
    </section>
  );
}

// ---- ワックス素材サブタブ ----

function WaxTab({
  onNotify,
  onDelete,
}: {
  onNotify: (m: string) => void;
  onDelete: (waxId: number, name: string) => void;
}) {
  const { waxMasters, addWax } = useStore();
  const [name, setName] = useState("");

  function handleAdd() {
    const r = addWax(name);
    if (r.ok) {
      setName("");
      onNotify("ワックス素材を追加しました");
    } else {
      onNotify(r.message ?? "追加できませんでした");
    }
  }

  const tones = ["bg-[#f5c2e7]", "bg-[#bceee9]", "bg-[#fff0b3]", "bg-[#ececf1]"];

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-medium tracking-[-0.04em]">ワックス素材</h2>
        <p className="mt-1 text-sm text-[#77778d]">
          ここで登録した素材を、レシピの配合ワックスとして選べます。
        </p>
      </div>
      <div className="rounded-[24px] border border-[#dedee8] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="例：ソイワックス C3"
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={name.trim() === ""}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#050038] px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlusIcon className="h-4 w-4" />
            追加する
          </button>
        </div>
        <div className="mt-6 border-t border-[#e6e6ed] pt-5">
          {waxMasters.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {waxMasters.map((wax, index) => (
                <li
                  key={wax.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#f7f7fa] px-4 py-3"
                >
                  <span className="flex items-center gap-3 text-sm font-medium">
                    <span
                      className={`h-3 w-3 rounded-full ${tones[index % tones.length]}`}
                    />
                    {wax.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(wax.id, wax.name)}
                    className="text-sm font-medium text-[#d12929]"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm font-medium">ワックス素材がありません</p>
              <p className="mt-1 text-xs text-[#77778d]">
                上の入力から追加してください。
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ---- レシピ登録/編集モーダル ----

type BlendRow = { key: number; name: string; grams: string };

function RecipeModal({
  recipe,
  onClose,
  onDone,
}: {
  recipe: Recipe | null;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const { waxMasters, addRecipe, updateRecipe } = useStore();
  const editing = recipe !== null;

  const [name, setName] = useState(recipe?.name ?? "");
  const [rows, setRows] = useState<BlendRow[]>(
    recipe && recipe.waxBlend.length > 0
      ? recipe.waxBlend.map((w, i) => ({
          key: i,
          name: w.name,
          grams: w.grams ? String(w.grams) : "",
        }))
      : [],
  );
  const [fragrance, setFragrance] = useState(
    recipe?.fragrancePercent != null ? String(recipe.fragrancePercent) : "",
  );
  const [wick, setWick] = useState(recipe?.wickSize ?? "");
  const [size, setSize] = useState<RecipeSize>(recipe?.size ?? "大");
  const [memo, setMemo] = useState(recipe?.memo ?? "");

  const canSave = name.trim() !== "";
  const totalGrams = rows.reduce((s, r) => s + (parseInt(r.grams, 10) || 0), 0);

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: Date.now(), name: waxMasters[0]?.name ?? "", grams: "" },
    ]);
  }
  function updateRow(key: number, patch: Partial<BlendRow>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }
  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function handleSave() {
    if (!canSave) return;
    const input: RecipeInput = {
      name: name.trim(),
      waxBlend: rows
        .filter((r) => r.name)
        .map((r) => ({ name: r.name, grams: parseInt(r.grams, 10) || 0 })),
      fragrancePercent: fragrance === "" ? undefined : parseFloat(fragrance),
      size,
      wickSize: wick.trim() || undefined,
      memo: memo.trim() || undefined,
    };
    if (editing) updateRecipe(recipe.id, input);
    else addRecipe(input);
    onDone(editing ? "レシピを更新しました" : "レシピを登録しました");
  }

  return (
    <ModalShell
      title={editing ? "レシピを編集" : "新しいレシピを登録"}
      onClose={onClose}
    >
      <div className="mt-5 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">作品名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：ジャスミンピラー #3"
            autoFocus
            className={inputClass}
          />
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">配合ワックス</p>
            {totalGrams > 0 && (
              <p className="text-xs text-[#77778d]">合計 {totalGrams}g</p>
            )}
          </div>
          {waxMasters.length === 0 ? (
            <div className="rounded-xl bg-[#f7f7fa] p-4 text-xs leading-5 text-[#77778d]">
              先に「ワックス素材」タブでワックスを登録すると、ここで配合を選べます。
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {rows.length === 0 && (
                  <p className="text-xs text-[#77778d]">
                    「ワックスを追加」で配合を登録できます。
                  </p>
                )}
                {rows.map((row) => (
                  <div key={row.key} className="flex items-center gap-2">
                    <select
                      value={row.name}
                      onChange={(e) => updateRow(row.key, { name: e.target.value })}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-[#c7c7de] bg-white px-3 text-sm outline-none focus:border-[#050038]"
                    >
                      {waxMasters.map((w) => (
                        <option key={w.id} value={w.name}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex h-11 w-24 items-center rounded-xl border border-[#c7c7de] px-3 text-sm">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={row.grams}
                        onChange={(e) =>
                          updateRow(row.key, { grams: e.target.value })
                        }
                        placeholder="0"
                        className="w-full bg-transparent text-right outline-none"
                      />
                      <span className="ml-1 text-xs text-[#77778d]">g</span>
                    </div>
                    <button
                      type="button"
                      aria-label="配合を削除"
                      onClick={() => removeRow(row.key)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg text-[#77778d] hover:bg-[#f4f4f8]"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addRow}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#52526a]"
              >
                <PlusIcon className="h-4 w-4" />
                ワックスを追加
              </button>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">香料濃度（%）</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              value={fragrance}
              onChange={(e) => setFragrance(e.target.value)}
              placeholder="例：8"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">芯のサイズ</span>
            <input
              value={wick}
              onChange={(e) => setWick(e.target.value)}
              placeholder="例：CD-10"
              className={inputClass}
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">大きさ</p>
          <div className="grid grid-cols-3 gap-2">
            {RECIPE_SIZES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSize(value)}
                className={`h-10 rounded-full text-sm font-medium transition ${
                  size === value
                    ? "bg-[#050038] text-white"
                    : "border border-[#d3d3de] text-[#52526a] hover:border-[#050038]"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">メモ</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="制作時のポイントや注意事項"
            className="min-h-24 w-full rounded-xl border border-[#c7c7de] p-3 text-sm outline-none focus:border-[#050038]"
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
          onClick={handleSave}
          disabled={!canSave}
          className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          保存する
        </button>
      </div>
    </ModalShell>
  );
}

function ConfirmModal({
  title,
  body,
  note,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  note?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="mt-5 space-y-4">
        <p className="text-sm leading-6 text-[#52526a]">{body}</p>
        {note && (
          <div className="rounded-xl bg-[#f7f7fa] p-4 text-sm leading-6 text-[#52526a]">
            {note}
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
          className="h-12 flex-[1.4] rounded-full bg-[#d12929] text-sm font-semibold text-white"
        >
          削除する
        </button>
      </div>
    </ModalShell>
  );
}

// ---- ページ本体 ----

type ModalState =
  | { kind: "recipe-form"; recipe: Recipe | null }
  | { kind: "delete-recipe"; recipe: Recipe }
  | { kind: "delete-wax"; waxId: number; name: string }
  | null;

export default function SettingsRecipesPage() {
  const { ready, deleteRecipe, deleteWax } = useStore();
  const [tab, setTab] = useState<Tab>("recipes");
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
    { value: "recipes", label: "レシピ" },
    { value: "wax", label: "ワックス素材" },
  ];

  return (
    <>
      <Link
        href="/settings"
        className="mb-5 inline-flex text-sm font-medium text-[#52526a] hover:text-[#050038]"
      >
        ← 管理へ戻る
      </Link>
      <PageHeader eyebrow="MANAGE" title="レシピと素材" />
      <p className="-mt-4 mb-7 max-w-xl text-sm leading-6 text-[#77778d]">
        キャンドル制作のレシピと、配合に使うワックス素材を管理します。
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
      ) : tab === "recipes" ? (
        <RecipesTab
          onAdd={() => setModal({ kind: "recipe-form", recipe: null })}
          onEdit={(recipe) => setModal({ kind: "recipe-form", recipe })}
          onDelete={(recipe) => setModal({ kind: "delete-recipe", recipe })}
        />
      ) : (
        <WaxTab
          onNotify={showToast}
          onDelete={(waxId, name) => setModal({ kind: "delete-wax", waxId, name })}
        />
      )}

      {modal?.kind === "recipe-form" && (
        <RecipeModal recipe={modal.recipe} onClose={close} onDone={done} />
      )}
      {modal?.kind === "delete-recipe" && (
        <ConfirmModal
          title={`${modal.recipe.name} を削除しますか？`}
          body="このレシピを削除します。この操作は後から取り消せません。"
          onClose={close}
          onConfirm={() => {
            deleteRecipe(modal.recipe.id);
            done("レシピを削除しました");
          }}
        />
      )}
      {modal?.kind === "delete-wax" && (
        <ConfirmModal
          title={`${modal.name} を削除しますか？`}
          body="ワックス素材マスタから削除します。"
          note="すでに登録されているレシピの配合記録には影響しません。"
          onClose={close}
          onConfirm={() => {
            deleteWax(modal.waxId);
            done("ワックス素材を削除しました");
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
