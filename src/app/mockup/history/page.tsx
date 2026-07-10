import { BagIcon, FlaskIcon, SearchIcon } from "../_components/icons";
import { PageHeader } from "../_components/page-header";

const records = [
  { date: "今日", time: "10:24", title: "Jasmine pillar の観察", text: "プール径 52mm · 炎は安定", icon: FlaskIcon, tone: "bg-[#f5c2e7]" },
  { date: "今日", time: "09:10", title: "Summer Market の在庫を移動", text: "Petal candle を 6点 搬入", icon: BagIcon, tone: "bg-[#bceee9]" },
  { date: "昨日", time: "16:30", title: "Amber mist を販売", text: "2点 · ¥4,400", icon: BagIcon, tone: "bg-[#fff0b3]" },
  { date: "昨日", time: "13:20", title: "Sunday garden の実験を完了", text: "燃焼時間 4:12:45 · 記録 4件", icon: FlaskIcon, tone: "bg-[#d8d3ff]" },
];

export default function HistoryPage() {
  return <><PageHeader eyebrow="ACTIVITY" title="履歴"/><div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex w-full gap-1 overflow-x-auto rounded-full bg-[#ececf1] p-1 sm:w-fit"><button className="h-9 shrink-0 rounded-full bg-[#050038] px-4 text-sm font-medium text-white">すべて</button><button className="h-9 shrink-0 rounded-full px-4 text-sm font-medium text-[#52526a]">実験</button><button className="h-9 shrink-0 rounded-full px-4 text-sm font-medium text-[#52526a]">販売</button><button className="h-9 shrink-0 rounded-full px-4 text-sm font-medium text-[#52526a]">在庫</button></div><div className="flex h-10 items-center gap-2 rounded-lg border border-[#c7c7de] bg-white px-3 sm:w-60"><SearchIcon className="h-4 w-4 text-[#77778d]"/><span className="text-sm text-[#77778d]">履歴を検索</span></div></div><section className="max-w-3xl overflow-hidden rounded-[24px] border border-[#dedee8] bg-white">{records.map((record, index) => { const Icon = record.icon; const previousDate = records[index - 1]?.date; return <div key={record.title} className="px-5 sm:px-7">{record.date !== previousDate && <p className="border-b border-[#ececf1] py-4 text-xs font-semibold tracking-[0.1em] text-[#77778d]">{record.date}</p>}<article className="flex gap-4 py-5"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${record.tone}`}><Icon className="h-5 w-5"/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="text-sm font-medium">{record.title}</h2><time className="text-xs text-[#77778d]">{record.time}</time></div><p className="mt-1.5 text-sm text-[#77778d]">{record.text}</p><button className="mt-3 text-xs font-medium text-[#4262ff]">詳細を見る</button></div></article></div>})}</section></>;
}
