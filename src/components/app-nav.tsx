"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BagIcon, ClockIcon, FlaskIcon, GridIcon, SettingsIcon } from "./icons";

const items = [
  { href: "/", label: "ホーム", icon: GridIcon },
  { href: "/create", label: "つくる", icon: FlaskIcon },
  { href: "/sell", label: "売る", icon: BagIcon },
  { href: "/history", label: "履歴", icon: ClockIcon },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-[#dedee8] bg-white px-4 py-5 lg:flex">
        <Link href="/" className="mb-11 flex items-center gap-2 px-2 text-[19px] font-medium tracking-[-0.05em] text-[#050038]">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#ffd02f] text-sm font-bold">f</span>
          fleulje
        </Link>
        <nav className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return <Link key={href} href={href} className={`flex h-11 items-center gap-3 rounded-full px-4 text-sm font-medium transition ${active ? "bg-[#050038] text-white" : "text-[#52526a] hover:bg-[#f4f4f8] hover:text-[#050038]"}`}><Icon className="h-5 w-5"/>{label}</Link>;
          })}
        </nav>
        <div className="mt-auto border-t border-[#e6e6ed] pt-4">
          <Link href="/settings" className={`flex h-11 items-center gap-3 rounded-full px-4 text-sm font-medium ${pathname === "/settings" ? "bg-[#050038] text-white" : "text-[#52526a] hover:bg-[#f4f4f8]"}`}><SettingsIcon className="h-5 w-5"/>管理</Link>
          <div className="mt-5 flex items-center gap-3 px-3 text-sm text-[#52526a]"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f5c2e7] font-medium text-[#050038]">Y</span><span>Yui&apos;s studio</span></div>
        </div>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[74px] items-center justify-around border-t border-[#dedee8] bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return <Link key={href} href={href} className={`flex min-w-14 flex-col items-center gap-1 text-[10px] font-medium ${active ? "text-[#050038]" : "text-[#77778d]"}`}><span className={`grid h-7 w-10 place-items-center rounded-full ${active ? "bg-[#ffd02f]" : ""}`}><Icon className="h-[19px] w-[19px]"/></span>{label}</Link>;
        })}
      </nav>
    </>
  );
}
