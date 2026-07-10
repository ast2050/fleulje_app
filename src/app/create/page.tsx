"use client";

// 「つくる」= 燃焼実験ラボ（/create）。
// 実験タブ: 進行中の実験をカード格子で表示（最大10件）。タイマー開始/一時停止・ラップ・観察メモ・完了・削除。
// レシピタブ: 管理に登録したレシピからクイックスタート。
// 最大連続計測時間の自動一時停止、止め忘れ検知（1時間以上動作中）を含む。

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlaskIcon, PlusIcon, SearchIcon, SettingsIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { useStore } from "@/lib/store";
import type { Experiment, Recipe } from "@/types";

type Tab = "experiments" | "recipes";

const TONES = ["bg-[#f5c2e7]", "bg-[#bceee9]", "bg-[#fff0b3]", "bg-[#d8d3ff]"];
const STALE_MS = 60 * 60 * 1000; // 1時間

const inputClass =
  "h-12 w-full rounded-xl border border-[#c7c7de] bg-white px-3 text-sm outline-none focus:border-[#050038]";

// --- 時間ヘルパー ---
function getElapsed(exp: Experiment): number {
  return exp.accumulatedMs + (exp.startedAt ? Date.now() - exp.startedAt : 0);
}
function fmtElapsed(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`;
}
function fmtLong(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600),
    m = Math.floor((t % 3600) / 60),
    s = t % 60;
  if (h > 0) return `${h}時間${m}分${s}秒`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}
function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function recipeDetail(r: Recipe): string {
  const parts: string[] = [];
  if (r.fragrancePercent != null) parts.push(`香料 ${r.fragrancePercent}%`);
  parts.push(r.size);
  parts.push(r.wickSize ? r.wickSize : "芯なし");
  return parts.join(" ・ ");
}
function waxText(r: Recipe): string {
  if (!r.waxBlend.length) return "配合の登録なし";
  return r.waxBlend
    .map((w) => w.name + (w.grams ? ` ${w.grams}g` : ""))
    .join(" / ");
}

// --- 共通モーダル枠 ---
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
        className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_24px_60px_-12px_rgba(5,0,56,0.4)] sm:p-8"
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

function ActionButton({
  children,
  onClick,
  primary = false,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-full px-3 text-xs font-medium ${
        primary
          ? "bg-[#050038] text-white"
          : danger
            ? "text-[#d12929]"
            : "border border-[#b9b9ca] bg-white text-[#52526a]"
      }`}
    >
      {children}
    </button>
  );
}

// --- 実験カード ---
function ExperimentCard({
  exp,
  tone,
  onToggle,
  onLap,
  onMemo,
  onEditLap,
  onComplete,
  onDelete,
  onForgot,
}: {
  exp: Experiment;
  tone: string;
  onToggle: () => void;
  onLap: () => void;
  onMemo: () => void;
  onEditLap: (index: number) => void;
  onComplete: () => void;
  onDelete: () => void;
  onForgot: () => void;
}) {
  const running = exp.startedAt != null;
  const overdue = running && exp.startedAt != null && Date.now() - exp.startedAt >= STALE_MS;
  return (
    <article className="overflow-hidden rounded-[26px] border border-[#dedee8] bg-white">
      <div className={`p-5 sm:p-6 ${tone}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold ${
                running ? "text-[#176a61]" : "text-[#52526a]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${running ? "bg-[#13a36b]" : "bg-[#9292a8]"}`}
              />
              {running ? "計測中" : "一時停止中"}
            </span>
            <h2 className="mt-4 text-xl font-medium tracking-[-0.04em]">
              {exp.masterName}
            </h2>
            <p className="mt-1 text-sm text-[#52526a]">
              {recipeDetail(exp.masterSnapshot)}
            </p>
          </div>
          {overdue && (
            <button
              type="button"
              onClick={onForgot}
              className="shrink-0 rounded-full bg-[#fff0b3] px-3 py-1 text-xs font-semibold text-[#8a6d00]"
            >
              停止を確認
            </button>
          )}
        </div>
        <div className="mt-6">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-[#52526a]">
            ELAPSED TIME
          </p>
          <p className="mt-1 text-[38px] font-medium tracking-[-0.07em] text-[#050038]">
            {fmtElapsed(getElapsed(exp))}
          </p>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <ActionButton primary onClick={onToggle}>
            {running ? "一時停止" : "再開"}
          </ActionButton>
          <ActionButton onClick={onMemo}>観察を記録</ActionButton>
          <ActionButton onClick={onLap}>ラップ</ActionButton>
          <ActionButton onClick={onComplete}>完了</ActionButton>
          <ActionButton danger onClick={onDelete}>
            削除
          </ActionButton>
        </div>

        <section className="mt-6">
          <h3 className="text-sm font-medium">ラップ</h3>
          {exp.laps.length > 0 ? (
            <div className="mt-3 space-y-2">
              {exp.laps.map((lap, i) => (
                <div
                  key={lap.recordedAt}
                  className="flex items-start gap-3 border-l-2 border-[#050038] pl-3"
                >
                  <span className="shrink-0 text-xs text-[#77778d]">
                    {fmtElapsed(lap.elapsed)}
                  </span>
                  <p className="min-w-0 flex-1 text-sm leading-5">
                    {lap.memo || "（メモなし）"}
                  </p>
                  <button
                    type="button"
                    onClick={() => onEditLap(i)}
                    className="shrink-0 text-xs font-medium text-[#52526a]"
                  >
                    編集
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#77778d]">まだラップはありません。</p>
          )}
        </section>

        <section className="mt-5 border-t border-[#e6e6ed] pt-4">
          <h3 className="text-sm font-medium">観察メモ</h3>
          {exp.memos.length > 0 ? (
            <div className="mt-3 space-y-2">
              {exp.memos.map((memo) => (
                <div
                  key={memo.recordedAt}
                  className="rounded-xl bg-[#f7f7fa] px-3 py-2"
                >
                  <p className="text-[11px] text-[#77778d]">
                    {fmtElapsed(memo.elapsed)}
                  </p>
                  <p className="mt-1 text-sm leading-5">{memo.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#77778d]">
              まだ観察メモはありません。
            </p>
          )}
        </section>
      </div>
    </article>
  );
}

// --- モーダル群 ---
function NewExperimentModal({
  recipes,
  initialRecipeId,
  onClose,
  onStart,
}: {
  recipes: Recipe[];
  initialRecipeId: number | null;
  onClose: () => void;
  onStart: (recipe: Recipe) => void;
}) {
  const [recipeId, setRecipeId] = useState<number | null>(
    initialRecipeId ?? recipes[0]?.id ?? null,
  );
  const selected = recipes.find((r) => r.id === recipeId) ?? null;

  if (recipes.length === 0) {
    return (
      <ModalShell title="新しい実験" onClose={onClose}>
        <p className="mt-5 text-sm leading-6 text-[#52526a]">
          レシピがまだありません。先に「管理 → レシピと素材」でレシピを登録してください。
        </p>
        <div className="mt-7 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-full border border-[#b9b9ca] text-sm font-medium"
          >
            閉じる
          </button>
          <Link
            href="/settings/recipes"
            className="grid h-12 flex-[1.4] place-items-center rounded-full bg-[#050038] text-sm font-semibold text-white"
          >
            レシピを登録する
          </Link>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="新しい実験" onClose={onClose}>
      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">レシピ</span>
          <select
            value={recipeId ?? ""}
            onChange={(e) => setRecipeId(Number(e.target.value))}
            className={inputClass}
          >
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <div className="rounded-2xl bg-[#f7f7fa] p-4">
            <p className="text-xs font-semibold tracking-[0.1em] text-[#77778d]">
              レシピのプレビュー
            </p>
            <p className="mt-2 text-sm font-medium">{selected.name}</p>
            <p className="mt-1 text-sm leading-6 text-[#52526a]">
              {waxText(selected)}
            </p>
            <dl className="mt-3 grid grid-cols-3 text-xs">
              <div>
                <dt className="text-[#77778d]">香料</dt>
                <dd className="mt-1 font-medium">
                  {selected.fragrancePercent != null
                    ? `${selected.fragrancePercent}%`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[#77778d]">大きさ</dt>
                <dd className="mt-1 font-medium">{selected.size}</dd>
              </div>
              <div>
                <dt className="text-[#77778d]">芯</dt>
                <dd className="mt-1 font-medium">
                  {selected.wickSize || "なし"}
                </dd>
              </div>
            </dl>
            {selected.memo && (
              <p className="mt-3 text-xs leading-5 text-[#77778d]">
                {selected.memo}
              </p>
            )}
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
          disabled={!selected}
          onClick={() => selected && onStart(selected)}
          className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          実験を開始する
        </button>
      </div>
    </ModalShell>
  );
}

function RecordModal({
  title,
  elapsed,
  label,
  placeholder,
  initial,
  confirmLabel,
  onDeleteLabel,
  onDelete,
  onClose,
  onConfirm,
}: {
  title: string;
  elapsed?: number;
  label: string;
  placeholder: string;
  initial?: string;
  confirmLabel: string;
  onDeleteLabel?: string;
  onDelete?: () => void;
  onClose: () => void;
  onConfirm: (text: string) => void;
}) {
  const [text, setText] = useState(initial ?? "");
  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="mt-5 space-y-4">
        {elapsed != null && (
          <div>
            <p className="mb-2 text-sm font-medium">経過時間</p>
            <div className="flex h-12 items-center rounded-xl bg-[#f7f7fa] px-3 text-lg font-medium tracking-[-0.04em]">
              {fmtElapsed(elapsed)}
            </div>
          </div>
        )}
        <label className="block">
          <span className="mb-2 block text-sm font-medium">{label}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className="min-h-28 w-full rounded-xl border border-[#c7c7de] p-3 text-sm outline-none focus:border-[#050038]"
          />
        </label>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-sm font-medium text-[#d12929]"
          >
            {onDeleteLabel}
          </button>
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
          onClick={() => onConfirm(text)}
          className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white"
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

function CompleteModal({
  exp,
  elapsed,
  onClose,
  onConfirm,
}: {
  exp: Experiment;
  elapsed: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title="実験を完了しますか？" onClose={onClose}>
      <div className="mt-5 rounded-2xl bg-[#f7f7fa] p-4">
        <p className="text-sm font-medium">{exp.masterName}</p>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-[#77778d]">累計時間</dt>
            <dd className="mt-1 font-medium">{fmtLong(elapsed)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#77778d]">開始日時</dt>
            <dd className="mt-1 font-medium">{fmtDateTime(exp.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#77778d]">ラップ</dt>
            <dd className="mt-1 font-medium">{exp.laps.length}件</dd>
          </div>
          <div>
            <dt className="text-xs text-[#77778d]">メモ</dt>
            <dd className="mt-1 font-medium">{exp.memos.length}件</dd>
          </div>
        </dl>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#52526a]">
        完了すると、この実験は履歴に保存され、進行中の一覧から外れます。
      </p>
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
          className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white"
        >
          履歴に保存して完了
        </button>
      </div>
    </ModalShell>
  );
}

function DeleteModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title="実験を削除しますか？" onClose={onClose}>
      <p className="mt-5 text-sm leading-6 text-[#52526a]">
        この実験は履歴に残さず破棄されます。この操作は後から取り消せません。
      </p>
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

function SettingsModal({
  current,
  onClose,
  onSave,
}: {
  current: number;
  onClose: () => void;
  onSave: (hours: number) => void;
}) {
  const [value, setValue] = useState(String(current));
  return (
    <ModalShell title="実験の設定" onClose={onClose}>
      <div className="mt-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">
            最大連続計測時間（時間）
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputClass}
          />
        </label>
        <p className="mt-2 text-xs leading-5 text-[#77778d]">
          0を設定すると、連続計測時間は無制限になります。
        </p>
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
          onClick={() => onSave(parseInt(value, 10) || 0)}
          className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white"
        >
          保存する
        </button>
      </div>
    </ModalShell>
  );
}

function ForgotModal({
  exp,
  onKeepGoing,
  onStopAt,
  onClose,
}: {
  exp: Experiment;
  onKeepGoing: () => void;
  onStopAt: (ts: number) => void;
  onClose: () => void;
}) {
  const [stopTime, setStopTime] = useState(toLocalInput(new Date()));
  const elapsed = getElapsed(exp);
  return (
    <ModalShell title="まだ計測中ですか？" onClose={onClose}>
      <div className="mt-5 space-y-4">
        <p className="text-sm leading-6 text-[#52526a]">
          <strong>{exp.masterName}</strong> の計測が長時間続いています（経過{" "}
          {fmtLong(elapsed)}）。止め忘れていないか確認してください。
        </p>
        <button
          type="button"
          onClick={onKeepGoing}
          className="flex w-full items-center justify-between rounded-xl border border-[#050038] p-4 text-left"
        >
          <span>
            <span className="block text-sm font-medium">まだ計測中</span>
            <span className="mt-1 block text-xs text-[#77778d]">
              そのまま計測を続けます。
            </span>
          </span>
          <span>→</span>
        </button>
        <div className="rounded-xl bg-[#f7f7fa] p-4">
          <p className="text-sm font-medium">止め忘れ</p>
          <p className="mt-1 text-xs text-[#77778d]">
            実際に停止した時刻を指定して、一時停止にします。
          </p>
          <input
            type="datetime-local"
            value={stopTime}
            max={toLocalInput(new Date())}
            onChange={(e) => setStopTime(e.target.value)}
            className="mt-3 h-11 w-full rounded-xl border border-[#c7c7de] bg-white px-3 text-sm"
          />
        </div>
      </div>
      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-12 flex-1 rounded-full border border-[#b9b9ca] text-sm font-medium"
        >
          閉じる
        </button>
        <button
          type="button"
          onClick={() => {
            const ts = new Date(stopTime).getTime();
            if (!Number.isNaN(ts)) onStopAt(ts);
          }}
          className="h-12 flex-[1.4] rounded-full bg-[#050038] text-sm font-semibold text-white"
        >
          停止時刻を記録する
        </button>
      </div>
    </ModalShell>
  );
}

// --- ページ本体 ---
type ModalState =
  | { kind: "new"; recipeId: number | null }
  | { kind: "lap"; exp: Experiment; elapsed: number }
  | { kind: "memo"; exp: Experiment; elapsed: number }
  | { kind: "edit-lap"; exp: Experiment; index: number }
  | { kind: "complete"; exp: Experiment; elapsed: number }
  | { kind: "delete"; exp: Experiment }
  | { kind: "settings" }
  | null;

export default function CreatePage() {
  const {
    ready,
    recipes,
    experiments,
    labSettings,
    autoStopNotice,
    clearAutoStopNotice,
    startExperiment,
    toggleTimer,
    deleteExperiment,
    addLap,
    updateLap,
    deleteLap,
    addExpMemo,
    completeExperiment,
    stopExperimentAt,
    setMaxDurationHours,
  } = useStore();

  const [tab, setTab] = useState<Tab>("experiments");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [forgotQueue, setForgotQueue] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // 1秒ごとに再描画してタイマー表示を進める
  const [, setNow] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  function showToast(m: string) {
    setToast(m);
    window.setTimeout(() => setToast(null), 2200);
  }

  // 自動一時停止の通知をトーストで表示
  useEffect(() => {
    if (autoStopNotice) {
      showToast(autoStopNotice);
      clearAutoStopNotice();
    }
  }, [autoStopNotice, clearAutoStopNotice]);

  // 初回：1時間以上動作中の実験を止め忘れとして確認
  const staleCheckedRef = useRef(false);
  useEffect(() => {
    if (!ready || staleCheckedRef.current) return;
    staleCheckedRef.current = true;
    const now = Date.now();
    const stale = experiments
      .filter((e) => e.startedAt && e.accumulatedMs + (now - e.startedAt) >= STALE_MS)
      .map((e) => e.id);
    if (stale.length) setForgotQueue(stale);
  }, [ready, experiments]);

  function close() {
    setModal(null);
  }
  function handleStart(recipe: Recipe) {
    const r = startExperiment(recipe);
    if (r.ok) {
      close();
      setTab("experiments");
      showToast("実験を開始しました");
    } else {
      showToast(r.message ?? "開始できませんでした");
    }
  }

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? recipes.filter((r) => r.name.toLowerCase().includes(q))
      : recipes;
  }, [recipes, search]);

  const forgotExp = experiments.find((e) => e.id === forgotQueue[0]) ?? null;
  function advanceForgot() {
    setForgotQueue((q) => q.slice(1));
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: "experiments", label: "実験" },
    { value: "recipes", label: "レシピ" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="MAKE"
        title="つくる"
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModal({ kind: "settings" })}
              aria-label="実験の設定"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#dedee8] bg-white"
            >
              <SettingsIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setModal({ kind: "new", recipeId: null })}
              className="hidden h-10 items-center gap-2 rounded-full bg-[#050038] px-4 text-sm font-medium text-white sm:inline-flex"
            >
              <PlusIcon className="h-4 w-4" />
              新しい実験
            </button>
          </div>
        }
      />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit gap-1 overflow-x-auto rounded-full bg-[#ececf1] p-1">
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
        <button
          type="button"
          onClick={() => setModal({ kind: "new", recipeId: null })}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#050038] px-4 text-sm font-medium text-white sm:hidden"
        >
          <PlusIcon className="h-4 w-4" />
          新しい実験
        </button>
      </div>

      {!ready ? (
        <div className="py-16 text-center text-sm text-[#77778d]">
          読み込み中…
        </div>
      ) : tab === "experiments" ? (
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium tracking-[-0.04em]">
                進行中の実験
              </h2>
              <p className="mt-1 text-sm text-[#77778d]">
                最大10件の燃焼実験を並行して記録できます。
              </p>
            </div>
            <span className="rounded-full bg-[#f2f2f6] px-3 py-1.5 text-xs font-medium text-[#52526a]">
              {experiments.length} / 10 件
            </span>
          </div>
          {experiments.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {experiments.map((exp, i) => (
                <ExperimentCard
                  key={exp.id}
                  exp={exp}
                  tone={TONES[i % TONES.length]}
                  onToggle={() => toggleTimer(exp.id)}
                  onLap={() =>
                    setModal({ kind: "lap", exp, elapsed: getElapsed(exp) })
                  }
                  onMemo={() =>
                    setModal({ kind: "memo", exp, elapsed: getElapsed(exp) })
                  }
                  onEditLap={(index) =>
                    setModal({ kind: "edit-lap", exp, index })
                  }
                  onComplete={() =>
                    setModal({ kind: "complete", exp, elapsed: getElapsed(exp) })
                  }
                  onDelete={() => setModal({ kind: "delete", exp })}
                  onForgot={() => setForgotQueue([exp.id])}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#c7c7de] bg-white py-16 text-center">
              <p className="text-sm font-medium">進行中の実験はありません</p>
              <p className="mt-1 text-xs text-[#77778d]">
                「新しい実験」から開始してください。
              </p>
            </div>
          )}
        </section>
      ) : (
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium tracking-[-0.04em]">
                レシピから始める
              </h2>
              <p className="mt-1 text-sm text-[#77778d]">
                管理に登録したレシピを選んで、すぐに実験を開始できます。
              </p>
            </div>
            <Link
              href="/settings/recipes"
              className="text-sm font-medium text-[#52526a] hover:text-[#050038]"
            >
              レシピを管理 →
            </Link>
          </div>
          <div className="mb-5 flex h-11 max-w-md items-center gap-2 rounded-xl border border-[#c7c7de] bg-white px-3">
            <SearchIcon className="h-5 w-5 text-[#77778d]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="レシピを検索"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          {recipes.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#c7c7de] bg-white py-16 text-center">
              <p className="text-sm font-medium">レシピがありません</p>
              <p className="mt-1 text-xs text-[#77778d]">
                管理 → レシピと素材 で登録してください。
              </p>
              <Link
                href="/settings/recipes"
                className="mt-4 inline-flex text-sm font-medium text-[#4262ff]"
              >
                レシピを管理する
              </Link>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#77778d]">
              一致するレシピがありません。
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredRecipes.map((recipe, i) => (
                <article
                  key={recipe.id}
                  className="rounded-[24px] border border-[#dedee8] bg-white p-5"
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-2xl ${TONES[i % TONES.length]}`}
                  >
                    <FlaskIcon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-6 text-lg font-medium tracking-[-0.04em]">
                    {recipe.name}
                  </h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-[#77778d]">
                    {waxText(recipe)}
                  </p>
                  <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[#e6e6ed] pt-4 text-xs">
                    <div>
                      <dt className="text-[#77778d]">香料</dt>
                      <dd className="mt-1 font-medium">
                        {recipe.fragrancePercent != null
                          ? `${recipe.fragrancePercent}%`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#77778d]">大きさ</dt>
                      <dd className="mt-1 font-medium">{recipe.size}</dd>
                    </div>
                    <div>
                      <dt className="text-[#77778d]">芯</dt>
                      <dd className="mt-1 font-medium">
                        {recipe.wickSize || "なし"}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() =>
                      setModal({ kind: "new", recipeId: recipe.id })
                    }
                    className="mt-5 h-10 w-full rounded-full border border-[#b9b9ca] text-sm font-medium"
                  >
                    このレシピで始める
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* モーダル */}
      {modal?.kind === "new" && (
        <NewExperimentModal
          recipes={recipes}
          initialRecipeId={modal.recipeId}
          onClose={close}
          onStart={handleStart}
        />
      )}
      {modal?.kind === "lap" && (
        <RecordModal
          title="ラップを記録"
          elapsed={modal.elapsed}
          label="メモ"
          placeholder="例：プール径 52mm"
          confirmLabel="記録する"
          onClose={close}
          onConfirm={(text) => {
            addLap(modal.exp.id, modal.elapsed, text.trim());
            close();
            showToast("ラップを記録しました");
          }}
        />
      )}
      {modal?.kind === "memo" && (
        <RecordModal
          title="観察メモを追加"
          label="本文"
          placeholder="観察したことを記録"
          confirmLabel="記録する"
          onClose={close}
          onConfirm={(text) => {
            if (text.trim() === "") return;
            addExpMemo(modal.exp.id, modal.elapsed, text.trim());
            close();
            showToast("観察メモを追加しました");
          }}
        />
      )}
      {modal?.kind === "edit-lap" && (
        <RecordModal
          title="ラップを編集"
          label="メモ"
          placeholder="例：プール径 52mm"
          initial={modal.exp.laps[modal.index]?.memo ?? ""}
          confirmLabel="保存する"
          onDeleteLabel="このラップを削除"
          onDelete={() => {
            deleteLap(modal.exp.id, modal.index);
            close();
            showToast("ラップを削除しました");
          }}
          onClose={close}
          onConfirm={(text) => {
            updateLap(modal.exp.id, modal.index, text.trim());
            close();
            showToast("ラップを更新しました");
          }}
        />
      )}
      {modal?.kind === "complete" && (
        <CompleteModal
          exp={modal.exp}
          elapsed={modal.elapsed}
          onClose={close}
          onConfirm={() => {
            completeExperiment(modal.exp.id);
            close();
            showToast("実験を履歴に保存しました");
          }}
        />
      )}
      {modal?.kind === "delete" && (
        <DeleteModal
          onClose={close}
          onConfirm={() => {
            deleteExperiment(modal.exp.id);
            close();
            showToast("実験を削除しました");
          }}
        />
      )}
      {modal?.kind === "settings" && (
        <SettingsModal
          current={labSettings.maxDurationHours}
          onClose={close}
          onSave={(hours) => {
            setMaxDurationHours(hours);
            close();
            showToast("設定を保存しました");
          }}
        />
      )}
      {forgotExp && (
        <ForgotModal
          exp={forgotExp}
          onKeepGoing={advanceForgot}
          onClose={advanceForgot}
          onStopAt={(ts) => {
            stopExperimentAt(forgotExp.id, ts);
            advanceForgot();
            showToast("指定時刻で一時停止しました");
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
