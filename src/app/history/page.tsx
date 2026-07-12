"use client";

// 「履歴」画面（/history）。販売履歴（sales）と実験履歴（expHistory）を時系列で表示。
// タブ: すべて / 販売 / 実験。日付グルーピング・新しい順。詳細モーダル・削除・CSV出力。
// ※ CSV出力は将来「スプレッドシートへ送信」に差し替える可能性あり（handleExport を差し替えるだけで済む構成）。

import { useMemo, useState } from "react";
import { BagIcon, ClockIcon, FlaskIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { useStore } from "@/lib/store";
import { formatYen } from "@/lib/money";
import type { ExperimentHistory, Sale } from "@/types";

type Tab = "all" | "sales" | "experiments";

const TONES = ["bg-[#fff0b3]", "bg-[#bceee9]", "bg-[#f5c2e7]", "bg-[#d8d3ff]"];

// --- 日時ヘルパー ---
const pad = (n: number) => String(n).padStart(2, "0");
function dateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
function dateLabel(key: string): string {
  const today = dateKey(Date.now());
  const yesterday = dateKey(Date.now() - 86400000);
  if (key === today) return `今日 — ${key}`;
  if (key === yesterday) return `昨日 — ${key}`;
  return key;
}
function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtHMS(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}
function saleLocationLabel(sale: Sale): string {
  return sale.location.startsWith("consignment") ? "委託先" : "イベント会場";
}
function saleTitle(sale: Sale): string {
  if (sale.items.length === 0) return "販売";
  return sale.items.length === 1
    ? sale.items[0].name
    : `${sale.items[0].name} ほか${sale.items.length - 1}点`;
}

// --- CSV ---
function toCsv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\r\n");
}
function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_24px_60px_-12px_rgba(5,0,56,0.4)] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-medium tracking-[-0.04em]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="grid h-9 w-9 place-items-center rounded-full text-xl text-[#77778d] hover:bg-[#f4f4f8]"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

// --- カード ---
function SaleCard({
  sale,
  tone,
  onOpen,
  onDelete,
}: {
  sale: Sale;
  tone: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const time = Date.parse(sale.timestamp);
  return (
    <article className="rounded-[24px] border border-[#dedee8] bg-white p-5 transition hover:border-[#b9b9ca] hover:shadow-[0_4px_14px_rgba(5,0,56,0.06)] sm:p-6">
      <div className="flex items-start gap-4">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone}`}
        >
          <BagIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div>
              <span className="rounded-full bg-[#f7f7fa] px-2.5 py-1 text-[11px] font-semibold text-[#52526a]">
                販売
              </span>
              <h2 className="mt-2 text-lg font-medium tracking-[-0.04em]">
                {saleTitle(sale)} を販売
              </h2>
            </div>
            <p className="text-lg font-medium tracking-[-0.04em]">
              {formatYen(sale.total)}
            </p>
          </div>
          <p className="mt-4 text-sm text-[#77778d]">
            {fmtDateTime(time)}　{sale.gender}・{sale.age}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-[#52526a]">
              <span className="mr-2 rounded-full bg-[#eef8f6] px-2 py-1 text-xs font-medium text-[#176a61]">
                {saleLocationLabel(sale)}
              </span>
              {sale.locationName ?? ""}
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={onOpen}
                className="text-sm font-medium text-[#4262ff]"
              >
                詳細を見る
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="text-sm font-medium text-[#d12929]"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ExperimentCard({
  exp,
  tone,
  onOpen,
  onDelete,
}: {
  exp: ExperimentHistory;
  tone: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-[24px] border border-[#dedee8] bg-white p-5 transition hover:border-[#b9b9ca] hover:shadow-[0_4px_14px_rgba(5,0,56,0.06)] sm:p-6">
      <div className="flex items-start gap-4">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone}`}
        >
          <FlaskIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div>
              <span className="rounded-full bg-[#f7f7fa] px-2.5 py-1 text-[11px] font-semibold text-[#52526a]">
                実験
              </span>
              <h2 className="mt-2 text-lg font-medium tracking-[-0.04em]">
                {exp.masterName} の実験を完了
              </h2>
            </div>
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <ClockIcon className="h-4 w-4 text-[#77778d]" />
              {fmtHMS(exp.accumulatedMs)}
            </p>
          </div>
          <p className="mt-4 text-sm text-[#77778d]">
            {fmtDateTime(exp.finishedAt)}　ラップ {exp.laps.length}件　メモ{" "}
            {exp.memos.length}件
          </p>
          <div className="mt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onOpen}
              className="text-sm font-medium text-[#4262ff]"
            >
              詳細を見る
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="text-sm font-medium text-[#d12929]"
            >
              削除
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// --- 詳細モーダル ---
function SaleDetail({
  sale,
  tone,
  onClose,
  onDelete,
}: {
  sale: Sale;
  tone: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  const time = Date.parse(sale.timestamp);
  return (
    <ModalShell title="販売履歴の詳細" onClose={onClose}>
      <div className="mt-6">
        <div className={`rounded-[22px] p-5 ${tone}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.1em] text-[#52526a]">
                SALE
              </p>
              <h3 className="mt-2 text-xl font-medium tracking-[-0.04em]">
                {formatYen(sale.total)}
              </h3>
            </div>
            <BagIcon className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-[#52526a]">{fmtDateTime(time)}</p>
        </div>
        <section className="mt-6">
          <h3 className="text-sm font-medium">購入商品</h3>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#dedee8]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f7f7fa] text-xs text-[#77778d]">
                <tr>
                  <th className="px-4 py-3 font-medium">商品</th>
                  <th className="px-4 py-3 text-right font-medium">数量</th>
                  <th className="px-4 py-3 text-right font-medium">単価</th>
                  <th className="px-4 py-3 text-right font-medium">金額</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, i) => (
                  <tr key={i} className="border-t border-[#e6e6ed]">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      {formatYen(item.price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatYen(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <dl className="mt-6 grid gap-4 border-t border-[#e6e6ed] pt-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-[#77778d]">購入者情報</dt>
            <dd className="mt-1 text-sm font-medium">
              {sale.gender}・{sale.age}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#77778d]">販売場所</dt>
            <dd className="mt-1 text-sm font-medium">
              {saleLocationLabel(sale)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#77778d]">場所の詳細</dt>
            <dd className="mt-1 text-sm font-medium">
              {sale.locationName ?? "—"}
            </dd>
          </div>
        </dl>
        <div className="mt-6 border-t border-[#e6e6ed] pt-5 text-right">
          <button
            type="button"
            onClick={onDelete}
            className="text-sm font-medium text-[#d12929]"
          >
            この履歴を削除
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ExperimentDetail({
  exp,
  tone,
  onClose,
  onDelete,
}: {
  exp: ExperimentHistory;
  tone: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  const r = exp.masterSnapshot;
  const waxText =
    r.waxBlend && r.waxBlend.length > 0
      ? r.waxBlend
          .map((w) => w.name + (w.grams ? ` ${w.grams}g` : ""))
          .join(" / ")
      : "配合の登録なし";
  return (
    <ModalShell title="実験履歴の詳細" onClose={onClose}>
      <div className="mt-6">
        <div className={`rounded-[22px] p-5 ${tone}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.1em] text-[#52526a]">
                EXPERIMENT
              </p>
              <h3 className="mt-2 text-xl font-medium tracking-[-0.04em]">
                {exp.masterName}
              </h3>
            </div>
            <p className="flex items-center gap-1.5 text-lg font-medium">
              <ClockIcon className="h-5 w-5" />
              {fmtHMS(exp.accumulatedMs)}
            </p>
          </div>
          <p className="mt-4 text-sm text-[#52526a]">
            {fmtDateTime(exp.createdAt)} — {fmtDateTime(exp.finishedAt)}
          </p>
        </div>

        <section className="mt-6">
          <h3 className="text-sm font-medium">レシピのスナップショット</h3>
          <div className="mt-3 rounded-2xl bg-[#f7f7fa] p-4">
            <p className="text-sm font-medium">{r.name}</p>
            <p className="mt-2 text-sm leading-6 text-[#52526a]">{waxText}</p>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[#dedee8] pt-3 text-sm">
              <div>
                <dt className="text-xs text-[#77778d]">香料濃度</dt>
                <dd className="mt-1 font-medium">
                  {r.fragrancePercent != null ? `${r.fragrancePercent}%` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#77778d]">サイズ</dt>
                <dd className="mt-1 font-medium">{r.size}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#77778d]">芯</dt>
                <dd className="mt-1 font-medium">{r.wickSize || "なし"}</dd>
              </div>
            </dl>
            {r.memo && (
              <p className="mt-4 border-t border-[#dedee8] pt-3 text-sm text-[#52526a]">
                {r.memo}
              </p>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-medium">ラップ</h3>
          {exp.laps.length > 0 ? (
            <div className="mt-3 space-y-3">
              {exp.laps.map((lap, i) => (
                <div key={i} className="border-l-2 border-[#050038] pl-3">
                  <p className="text-xs font-medium text-[#77778d]">
                    {fmtHMS(lap.elapsed)}
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    {lap.memo || "（メモなし）"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#77778d]">ラップはありません。</p>
          )}
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-medium">実験メモ</h3>
          {exp.memos.length > 0 ? (
            <div className="mt-3 space-y-2">
              {exp.memos.map((memo, i) => (
                <div key={i} className="rounded-xl bg-[#f7f7fa] px-4 py-3">
                  <p className="text-xs text-[#77778d]">{fmtHMS(memo.elapsed)}</p>
                  <p className="mt-1 text-sm leading-6">{memo.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#77778d]">メモはありません。</p>
          )}
        </section>

        <div className="mt-6 border-t border-[#e6e6ed] pt-5 text-right">
          <button
            type="button"
            onClick={onDelete}
            className="text-sm font-medium text-[#d12929]"
          >
            この履歴を削除
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ExportModal({
  tab,
  onExportSales,
  onExportExperiments,
  onClose,
}: {
  tab: Tab;
  onExportSales: () => void;
  onExportExperiments: () => void;
  onClose: () => void;
}) {
  const options: { label: string; run: () => void }[] = [];
  if (tab !== "experiments")
    options.push({ label: "販売履歴CSV", run: onExportSales });
  if (tab !== "sales")
    options.push({ label: "実験履歴CSV", run: onExportExperiments });

  return (
    <ModalShell title="CSVを出力" onClose={onClose}>
      <div className="mt-5">
        <p className="text-sm leading-6 text-[#52526a]">
          出力する履歴を選んでください。ファイルがダウンロードされます。
        </p>
        <div className="mt-5 space-y-3">
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                option.run();
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-[#dedee8] p-4 text-left transition hover:border-[#050038]"
            >
              <span>
                <span className="block text-sm font-medium">
                  {option.label}を出力
                </span>
                <span className="mt-1 block text-xs text-[#77778d]">
                  記録をCSV形式でダウンロードします
                </span>
              </span>
              <span className="text-xl text-[#52526a]">↓</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-11 w-full rounded-full border border-[#b9b9ca] text-sm font-medium"
        >
          キャンセル
        </button>
      </div>
    </ModalShell>
  );
}

function ConfirmDelete({
  label,
  onConfirm,
  onClose,
}: {
  label: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell title={`${label} を削除しますか？`} onClose={onClose}>
      <p className="mt-5 text-sm leading-6 text-[#52526a]">
        この履歴を削除します。この操作は後から取り消せません。
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

// --- ページ本体 ---
type Entry =
  | { type: "sale"; time: number; date: string; index: number; sale: Sale }
  | { type: "exp"; time: number; date: string; exp: ExperimentHistory };

type ModalState =
  | { kind: "sale"; sale: Sale; index: number; tone: string }
  | { kind: "exp"; exp: ExperimentHistory; tone: string }
  | { kind: "export" }
  | { kind: "delete-sale"; index: number; label: string }
  | { kind: "delete-exp"; id: string; label: string }
  | null;

export default function HistoryPage() {
  const { ready, sales, expHistory, deleteSale, deleteExpHistory } = useStore();
  const [tab, setTab] = useState<Tab>("all");
  const [modal, setModal] = useState<ModalState>(null);

  // 実データを統合し、新しい順に並べる
  const entries = useMemo(() => {
    const list: Entry[] = [];
    sales.forEach((sale, index) => {
      const time = Date.parse(sale.timestamp);
      list.push({ type: "sale", time, date: dateKey(time), index, sale });
    });
    expHistory.forEach((exp) => {
      list.push({
        type: "exp",
        time: exp.finishedAt,
        date: dateKey(exp.finishedAt),
        exp,
      });
    });
    list.sort((a, b) => b.time - a.time);
    return list;
  }, [sales, expHistory]);

  const filtered = entries.filter((e) =>
    tab === "all" ? true : tab === "sales" ? e.type === "sale" : e.type === "exp",
  );

  // 日付ごとにグルーピング（順序は filtered のまま）
  const groups: { date: string; items: Entry[] }[] = [];
  for (const e of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) last.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  }

  const toneFor = (time: number) => TONES[time % TONES.length];

  function handleExportSales() {
    const header = [
      "日時",
      "場所",
      "場所の詳細",
      "性別",
      "年齢層",
      "商品",
      "数量",
      "単価",
      "金額",
      "会計合計",
    ];
    const rows: (string | number)[][] = [header];
    for (const sale of sales) {
      const time = fmtDateTime(Date.parse(sale.timestamp));
      for (const item of sale.items) {
        rows.push([
          time,
          saleLocationLabel(sale),
          sale.locationName ?? "",
          sale.gender,
          sale.age,
          item.name,
          item.quantity,
          item.price,
          item.price * item.quantity,
          sale.total,
        ]);
      }
    }
    downloadCsv(`販売履歴_${dateKey(Date.now())}.csv`, toCsv(rows));
  }

  function handleExportExperiments() {
    const header = [
      "レシピ名",
      "開始",
      "完了",
      "累計時間",
      "ラップ数",
      "メモ数",
    ];
    const rows: (string | number)[][] = [header];
    for (const exp of expHistory) {
      rows.push([
        exp.masterName,
        fmtDateTime(exp.createdAt),
        fmtDateTime(exp.finishedAt),
        fmtHMS(exp.accumulatedMs),
        exp.laps.length,
        exp.memos.length,
      ]);
    }
    downloadCsv(`実験履歴_${dateKey(Date.now())}.csv`, toCsv(rows));
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: "all", label: "すべて" },
    { value: "sales", label: "販売" },
    { value: "experiments", label: "実験" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="ACTIVITY"
        title="履歴"
        action={
          <button
            type="button"
            onClick={() => setModal({ kind: "export" })}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#050038] px-4 text-sm font-medium text-white"
          >
            <span className="text-base leading-none">↓</span>
            CSVを出力
          </button>
        }
      />
      <p className="-mt-4 mb-7 max-w-xl text-sm leading-6 text-[#77778d]">
        販売と実験の記録を、時系列で確認できます。
      </p>

      <div className="mb-7 flex w-fit gap-1 overflow-x-auto rounded-full bg-[#ececf1] p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            aria-pressed={tab === t.value}
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
      ) : groups.length === 0 ? (
        <div className="max-w-4xl rounded-[24px] border border-dashed border-[#c7c7de] bg-white py-16 text-center">
          <p className="text-sm font-medium">履歴がありません</p>
          <p className="mt-1 text-xs text-[#77778d]">
            会計や実験の完了をすると、ここに記録が残ります。
          </p>
        </div>
      ) : (
        <section className="max-w-4xl space-y-7">
          {groups.map((group) => (
            <div key={group.date}>
              <div className="mb-3 flex items-center gap-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-[#77778d]">
                  {dateLabel(group.date)}
                </p>
                <span className="h-px flex-1 bg-[#dedee8]" />
              </div>
              <div className="space-y-3">
                {group.items.map((e) =>
                  e.type === "sale" ? (
                    <SaleCard
                      key={`s-${e.index}`}
                      sale={e.sale}
                      tone={toneFor(e.time)}
                      onOpen={() =>
                        setModal({
                          kind: "sale",
                          sale: e.sale,
                          index: e.index,
                          tone: toneFor(e.time),
                        })
                      }
                      onDelete={() =>
                        setModal({
                          kind: "delete-sale",
                          index: e.index,
                          label: `${saleTitle(e.sale)} の販売`,
                        })
                      }
                    />
                  ) : (
                    <ExperimentCard
                      key={`e-${e.exp.id}`}
                      exp={e.exp}
                      tone={toneFor(e.time)}
                      onOpen={() =>
                        setModal({
                          kind: "exp",
                          exp: e.exp,
                          tone: toneFor(e.time),
                        })
                      }
                      onDelete={() =>
                        setModal({
                          kind: "delete-exp",
                          id: e.exp.id,
                          label: `${e.exp.masterName} の実験`,
                        })
                      }
                    />
                  ),
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {modal?.kind === "sale" && (
        <SaleDetail
          sale={modal.sale}
          tone={modal.tone}
          onClose={() => setModal(null)}
          onDelete={() =>
            setModal({
              kind: "delete-sale",
              index: modal.index,
              label: `${saleTitle(modal.sale)} の販売`,
            })
          }
        />
      )}
      {modal?.kind === "exp" && (
        <ExperimentDetail
          exp={modal.exp}
          tone={modal.tone}
          onClose={() => setModal(null)}
          onDelete={() =>
            setModal({
              kind: "delete-exp",
              id: modal.exp.id,
              label: `${modal.exp.masterName} の実験`,
            })
          }
        />
      )}
      {modal?.kind === "export" && (
        <ExportModal
          tab={tab}
          onExportSales={handleExportSales}
          onExportExperiments={handleExportExperiments}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === "delete-sale" && (
        <ConfirmDelete
          label={modal.label}
          onClose={() => setModal(null)}
          onConfirm={() => {
            deleteSale(modal.index);
            setModal(null);
          }}
        />
      )}
      {modal?.kind === "delete-exp" && (
        <ConfirmDelete
          label={modal.label}
          onClose={() => setModal(null)}
          onConfirm={() => {
            deleteExpHistory(modal.id);
            setModal(null);
          }}
        />
      )}
    </>
  );
}
