"use client";

// ホーム（/）= ダッシュボード。ストアの実データに接続して表示する。
// - 進行中の実験（1件をピックアップ・1秒ごとにタイマー更新）
// - 在庫アラート（在庫わずか/売切れの件数）
// - クイックアクション（各画面への導線＋件数）
// - 最近の動き（販売履歴＋実験履歴を統合し新しい順に最大5件）

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowIcon,
  BagIcon,
  ClockIcon,
  FlaskIcon,
  PlusIcon,
  SparkIcon,
} from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { useStore } from "@/lib/store";
import { formatYen } from "@/lib/money";
import type { Experiment, ExperimentHistory, Product, Recipe, Sale } from "@/types";

// --- 時間・日付ヘルパー ---
const pad = (n: number) => String(n).padStart(2, "0");
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function greeting(hour: number): string {
  if (hour < 5) return "おそくまでおつかれさまです";
  if (hour < 11) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "こんばんは";
}

function dateJP(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`;
}

/** HH:MM:SS 表記（進行中実験のタイマー用） */
function fmtElapsed(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}

/** 「2時間34分」のような読みやすい表記 */
function fmtLong(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}時間${m}分`;
  if (m > 0) return `${m}分`;
  return `${s}秒`;
}

/** 最近の動き用の相対時刻ラベル */
function relTime(ms: number): string {
  const now = new Date();
  const d = new Date(ms);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yesterday = new Date(now.getTime() - 86400000);
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (sameDay(d, now)) return hm;
  if (sameDay(d, yesterday)) return `昨日 ${hm}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 実験の現在の経過ミリ秒（計測中なら開始からの差分を足す） */
function getElapsed(exp: Experiment): number {
  return exp.accumulatedMs + (exp.startedAt ? Date.now() - exp.startedAt : 0);
}

function recipeDetail(r: Recipe): string {
  const parts: string[] = [];
  if (r.fragrancePercent != null) parts.push(`香料 ${r.fragrancePercent}%`);
  parts.push(r.size);
  if (r.wickSize) parts.push(r.wickSize);
  return parts.join(" ・ ");
}

/** 全場所を合算した在庫数 */
function totalStock(p: Product): number {
  return (
    p.inventory.base +
    p.inventory.event +
    Object.values(p.inventory.consignments).reduce((s, n) => s + n, 0)
  );
}

// --- 最近の動き（販売・実験を統合した1行） ---
type Activity = {
  key: string;
  time: number;
  title: string;
  note: string;
  tone: string;
  icon: typeof BagIcon;
};

function buildActivities(
  sales: Sale[],
  expHistory: ExperimentHistory[],
): Activity[] {
  const list: Activity[] = [];
  sales.forEach((s, i) => {
    const first = s.items[0]?.name ?? "販売";
    const title =
      s.items.length > 1 ? `${first} ほか${s.items.length - 1}点を販売` : `${first} を販売`;
    const place = s.location.startsWith("consignment") ? "委託" : "イベント";
    list.push({
      key: `s-${s.id ?? i}`,
      time: Date.parse(s.timestamp),
      title,
      note: `${formatYen(s.total)} ・ ${place}`,
      tone: "bg-[#fff0b3]",
      icon: BagIcon,
    });
  });
  expHistory.forEach((e) => {
    list.push({
      key: `e-${e.id}`,
      time: e.finishedAt,
      title: `${e.masterName} の実験を完了`,
      note: `累計 ${fmtLong(e.accumulatedMs)} ・ ラップ${e.laps.length}件`,
      tone: "bg-[#bceee9]",
      icon: FlaskIcon,
    });
  });
  return list.sort((a, b) => b.time - a.time).slice(0, 5);
}

export default function HomePage() {
  const { ready, products, sales, experiments, expHistory } = useStore();

  // 1秒ごとに再描画してタイマー表示を進める
  const [, setNow] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // 進行中の実験：計測中を優先し、経過が最も長いものを1件ピック
  const featured = useMemo(() => {
    if (experiments.length === 0) return null;
    const running = experiments.filter((e) => e.startedAt != null);
    const pool = running.length > 0 ? running : experiments;
    return pool.reduce((a, b) => (getElapsed(a) >= getElapsed(b) ? a : b));
    // getElapsed は Date.now() に依存するが、選択の安定性には十分
  }, [experiments]);
  const runningCount = experiments.filter((e) => e.startedAt != null).length;

  // 在庫アラート：販売中の商品のうち、合計在庫が閾値以下のもの
  const lowStock = useMemo(
    () => products.filter((p) => p.active && totalStock(p) <= p.alertStock),
    [products],
  );
  const soldOutCount = lowStock.filter((p) => totalStock(p) === 0).length;

  const activities = useMemo(
    () => buildActivities(sales, expHistory),
    [sales, expHistory],
  );

  // 今日の販売集計（挨拶エリアの下に軽く出す）
  const now = new Date();

  if (!ready) {
    return (
      <>
        <PageHeader eyebrow="FLEULJE WORKSPACE" title="ホーム" />
        <div className="py-16 text-center text-sm text-[#77778d]">
          読み込み中…
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={dateJP(now).toUpperCase()}
        title={greeting(now.getHours())}
      />

      {/* 進行中の実験 ＋ 在庫の確認 */}
      <section className="mb-7 grid gap-4 md:mb-9 md:grid-cols-[1.55fr_1fr]">
        {/* 進行中の実験カード */}
        <div className="relative overflow-hidden rounded-[28px] bg-[#050038] p-6 text-white shadow-[0_12px_32px_-4px_rgba(5,0,56,0.2)] sm:p-8">
          <div className="relative z-10">
            <span className="inline-flex rounded-full bg-[#ffd02f] px-3 py-1 text-xs font-semibold text-[#050038]">
              {featured ? "進行中の実験" : "実験ラボ"}
            </span>
            {featured ? (
              <>
                <p className="mt-7 text-sm text-white/70">
                  {featured.masterName} ・ {recipeDetail(featured.masterSnapshot)}
                </p>
                <p className="mt-2 text-5xl font-medium tracking-[-0.07em] sm:text-6xl">
                  {fmtElapsed(getElapsed(featured))}
                </p>
                <p className="mt-2 text-sm text-white/65">
                  {featured.startedAt != null
                    ? `計測中 ・ 開始から${fmtLong(getElapsed(featured))}`
                    : `一時停止中 ・ 累計${fmtLong(getElapsed(featured))}`}
                </p>
                <div className="mt-7 flex flex-wrap gap-2">
                  <Link
                    href="/create"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-[#050038]"
                  >
                    <PlusIcon className="h-4 w-4" />
                    実験を記録
                  </Link>
                  <Link
                    href="/create"
                    className="inline-flex h-11 items-center rounded-full border border-white/30 px-5 text-sm font-medium text-white"
                  >
                    実験を開く{runningCount > 1 ? `（計測中 ${runningCount}件）` : ""}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-7 text-2xl font-medium tracking-[-0.05em]">
                  進行中の実験はありません
                </p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  レシピを選んで、燃焼実験の計測を始めましょう。
                </p>
                <div className="mt-7">
                  <Link
                    href="/create"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-[#050038]"
                  >
                    <PlusIcon className="h-4 w-4" />
                    実験を始める
                  </Link>
                </div>
              </>
            )}
          </div>
          <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-[#4262ff] opacity-90" />
          <div className="absolute bottom-[-90px] right-10 h-40 w-40 rounded-full border-[22px] border-[#f5c2e7] opacity-90" />
        </div>

        {/* 在庫の確認カード */}
        <div className="rounded-[28px] bg-[#bceee9] p-6 text-[#050038] sm:p-8">
          <div className="flex items-start justify-between">
            <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">
              在庫の確認
            </span>
            <SparkIcon className="h-6 w-6" />
          </div>
          <p className="mt-10 text-4xl font-medium tracking-[-0.06em]">
            {lowStock.length}
            <span className="ml-1 text-lg">
              {lowStock.length === 0 ? "件" : "商品"}
            </span>
          </p>
          <p className="mt-2 text-sm leading-6 text-[#303057]">
            {lowStock.length === 0
              ? "在庫は十分です。補充が必要な商品はありません。"
              : soldOutCount > 0
                ? `補充が必要です。うち${soldOutCount}商品は売切れです。`
                : "在庫が残りわずかの商品があります。"}
          </p>
          <Link
            href="/sell"
            className="mt-6 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
          >
            在庫を確認 <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* クイックアクション */}
      <section className="mb-9">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-medium tracking-[-0.04em]">
            今日のワークスペース
          </h2>
          <span className="text-xs text-[#77778d]">
            {now.getMonth() + 1}月{now.getDate()}日（{WEEKDAYS[now.getDay()]}）
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/create"
            className="group rounded-[24px] border border-[#dedee8] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(5,0,56,0.06)]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f5c2e7]">
              <FlaskIcon className="h-5 w-5" />
            </span>
            <p className="mt-8 text-base font-medium">実験ラボを開く</p>
            <p className="mt-1 text-sm text-[#77778d]">
              {experiments.length > 0
                ? `${experiments.length} / 10 件が進行中`
                : "レシピからすぐに開始"}
            </p>
          </Link>
          <Link
            href="/sell"
            className="group rounded-[24px] border border-[#dedee8] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(5,0,56,0.06)]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fff0b3]">
              <BagIcon className="h-5 w-5" />
            </span>
            <p className="mt-8 text-base font-medium">イベント販売を開く</p>
            <p className="mt-1 text-sm text-[#77778d]">
              {lowStock.length > 0
                ? `要補充 ${lowStock.length}商品`
                : "会計・在庫をひとつの画面で"}
            </p>
          </Link>
          <Link
            href="/history"
            className="group rounded-[24px] border border-[#dedee8] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(5,0,56,0.06)]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#d8d3ff]">
              <ClockIcon className="h-5 w-5" />
            </span>
            <p className="mt-8 text-base font-medium">記録を見る</p>
            <p className="mt-1 text-sm text-[#77778d]">
              販売 {sales.length}件 ・ 実験 {expHistory.length}件
            </p>
          </Link>
        </div>
      </section>

      {/* 最近の動き */}
      <section className="max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-medium tracking-[-0.04em]">最近の動き</h2>
          <Link href="/history" className="text-sm font-medium text-[#4262ff]">
            すべて見る
          </Link>
        </div>
        {activities.length > 0 ? (
          <div className="overflow-hidden rounded-[20px] border border-[#dedee8] bg-white">
            {activities.map(({ key, time, title, note, tone, icon: Icon }) => (
              <div
                key={key}
                className="flex items-center gap-4 border-b border-[#ececf1] px-4 py-4 last:border-0 sm:px-5"
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="mt-0.5 truncate text-xs text-[#77778d]">{note}</p>
                </div>
                <time className="shrink-0 text-xs text-[#77778d]">
                  {relTime(time)}
                </time>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-[#c7c7de] bg-white py-14 text-center">
            <p className="text-sm font-medium">まだ記録がありません</p>
            <p className="mt-1 text-xs text-[#77778d]">
              販売や実験の完了をすると、ここに最近の動きが表示されます。
            </p>
          </div>
        )}
      </section>
    </>
  );
}
