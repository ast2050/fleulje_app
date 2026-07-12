"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { CloudIcon, SpinnerIcon, CheckIcon } from "@/components/icons";
import {
  loadSyncConfig,
  saveSyncConfig,
  syncSales,
  syncExpHistory,
  syncProducts,
  syncRecipes,
  syncBackup,
  type SyncResult,
} from "@/lib/sheets";

// アプリの設定（/settings/app）: いまはスプレッドシート連携（書き出し）を提供する。
// URL と合言葉は localStorage に保存し、各ボタンで sheets.ts の送信関数を呼ぶ。

export default function AppSettingsPage() {
  const { sales, expHistory, products, recipes } = useStore();

  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  // 実行中のボタンキーと、各書き出しの結果メッセージ
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SyncResult>>({});

  // マウント後に保存済み設定を読み込む（SSR では window が無いため）
  useEffect(() => {
    const c = loadSyncConfig();
    setUrl(c.url);
    setToken(c.token);
  }, []);

  function handleSave() {
    saveSyncConfig({ url, token });
    setSavedMsg("保存しました");
    setTimeout(() => setSavedMsg(""), 2500);
  }

  async function run(key: string, fn: () => Promise<SyncResult>) {
    setRunning(key);
    const result = await fn();
    setResults((prev) => ({ ...prev, [key]: result }));
    setRunning(null);
  }

  const exports = [
    {
      key: "sales",
      label: "販売履歴を書き出す",
      desc: "新しい会計だけを追記（過去は消えません）",
      fn: () => syncSales(sales),
    },
    {
      key: "expHistory",
      label: "実験履歴を書き出す",
      desc: "新しい実験だけを追記",
      fn: () => syncExpHistory(expHistory),
    },
    {
      key: "products",
      label: "商品・在庫を書き出す",
      desc: "最新の状態でシートを上書き",
      fn: () => syncProducts(products),
    },
    {
      key: "recipes",
      label: "レシピを書き出す",
      desc: "最新の状態でシートを上書き",
      fn: () => syncRecipes(recipes),
    },
    {
      key: "backup",
      label: "全データをバックアップ",
      desc: "全データのJSONを日時付きで追記（世代保存）",
      fn: () => syncBackup(),
    },
  ];

  const configured = url.trim().length > 0;

  return (
    <>
      <PageHeader eyebrow="MANAGE" title="アプリの設定" />
      <p className="-mt-4 mb-7 max-w-xl text-sm leading-6 text-[#77778d]">
        Googleスプレッドシートへデータを書き出します。まず連携先を設定してから、書き出しボタンを押してください。
      </p>

      {/* 連携先の設定 */}
      <section className="mb-6 max-w-2xl rounded-[24px] border border-[#dedee8] bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#bceee9]">
            <CloudIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-medium">連携先の設定</p>
            <p className="text-sm text-[#77778d]">
              Apps Scriptで公開したURLと、決めた合言葉を入力します。
            </p>
          </div>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">ウェブアプリのURL</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="w-full rounded-[14px] border border-[#dedee8] px-4 py-2.5 text-sm outline-none focus:border-[#4262ff]"
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">合言葉（トークン）</span>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="GASのTOKENと同じ文字列"
            className="w-full rounded-[14px] border border-[#dedee8] px-4 py-2.5 text-sm outline-none focus:border-[#4262ff]"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="h-10 rounded-full bg-[#050038] px-5 text-sm font-medium text-white transition hover:opacity-90"
          >
            設定を保存
          </button>
          {savedMsg && (
            <span className="flex items-center gap-1 text-sm text-[#1a8f5a]">
              <CheckIcon className="h-4 w-4" />
              {savedMsg}
            </span>
          )}
        </div>
      </section>

      {/* 書き出し */}
      <section className="max-w-2xl rounded-[24px] border border-[#dedee8] bg-white p-5 sm:p-6">
        <p className="mb-1 text-base font-medium">スプレッドシートへ書き出す</p>
        {!configured && (
          <p className="mb-4 rounded-[14px] bg-[#fff0b3] px-4 py-2.5 text-sm text-[#050038]">
            先に上の「連携先の設定」を保存してください。
          </p>
        )}
        <div className="mt-4 grid gap-3">
          {exports.map(({ key, label, desc, fn }) => {
            const result = results[key];
            const isRunning = running === key;
            return (
              <div
                key={key}
                className="rounded-[18px] border border-[#dedee8] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="mt-0.5 text-xs text-[#77778d]">{desc}</p>
                  </div>
                  <button
                    onClick={() => run(key, fn)}
                    disabled={!configured || isRunning}
                    className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#b9b9ca] px-4 text-sm font-medium transition hover:bg-[#f7f7fa] disabled:opacity-40"
                  >
                    {isRunning && <SpinnerIcon className="h-4 w-4 animate-spin" />}
                    {isRunning ? "送信中…" : "書き出す"}
                  </button>
                </div>
                {result && (
                  <p
                    className={`mt-3 rounded-[12px] px-3 py-2 text-sm ${
                      result.ok
                        ? "bg-[#e8f7ef] text-[#1a8f5a]"
                        : "bg-[#fdecea] text-[#c0392b]"
                    }`}
                  >
                    {result.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
