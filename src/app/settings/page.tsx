import Link from "next/link";
import { ArrowIcon, BagIcon, FlaskIcon, SettingsIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

const sections = [
  { title: "商品と在庫", text: "商品、在庫アラート、販売場所を管理します。", icon: BagIcon, tone: "bg-[#fff0b3]", href: "/settings/inventory" },
  { title: "レシピと素材", text: "レシピ、ワックス、芯のマスタを管理します。", icon: FlaskIcon, tone: "bg-[#f5c2e7]", href: "/settings/recipes" },
  { title: "アプリの設定", text: "バックアップ、データの復元、実験の既定値。", icon: SettingsIcon, tone: "bg-[#bceee9]" },
];

export default function SettingsPage() {
  return <><PageHeader eyebrow="MANAGE" title="管理"/><p className="-mt-4 mb-7 max-w-xl text-sm leading-6 text-[#77778d]">日常的な作業から切り離した、マスタデータとアプリ設定のための画面です。</p><section className="grid max-w-4xl gap-3">{sections.map(({ title, text, icon: Icon, tone, href }) => { const content = <><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${tone}`}><Icon className="h-6 w-6"/></span><span className="min-w-0 flex-1"><span className="block text-base font-medium">{title}</span><span className="mt-1 block text-sm text-[#77778d]">{text}</span></span><ArrowIcon className="h-5 w-5 shrink-0 text-[#77778d]"/></>; const className = "flex items-center gap-4 rounded-[22px] border border-[#dedee8] bg-white p-5 text-left transition hover:shadow-[0_4px_12px_rgba(5,0,56,0.06)] sm:p-6"; return href ? <Link key={title} href={href} className={className}>{content}</Link> : <button key={title} className={className}>{content}</button>; })}</section><section className="mt-9 max-w-4xl rounded-[24px] border border-[#dedee8] bg-white p-5 sm:p-6"><p className="text-xs font-semibold tracking-[0.1em] text-[#77778d]">WORKSPACE</p><div className="mt-4 flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Seika&apos;s studio</p><p className="mt-1 text-sm text-[#77778d]">fleulje workspace · 1 member</p></div><button className="h-10 shrink-0 rounded-full border border-[#b9b9ca] px-4 text-sm font-medium">編集</button></div></section></>;
}
