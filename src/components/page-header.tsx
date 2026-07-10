import { BellIcon, MenuIcon } from "./icons";

export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <header className="mb-7 flex items-start justify-between gap-4 md:mb-9"><div><p className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-[#77778d]">{eyebrow ?? "FLEULJE WORKSPACE"}</p><h1 className="text-[30px] font-medium leading-none tracking-[-0.06em] text-[#050038] md:text-[38px]">{title}</h1></div><div className="flex items-center gap-2"><button aria-label="メニュー" className="grid h-10 w-10 place-items-center rounded-full border border-[#dedee8] bg-white text-[#050038] lg:hidden"><MenuIcon className="h-5 w-5"/></button><button aria-label="通知" className="relative grid h-10 w-10 place-items-center rounded-full border border-[#dedee8] bg-white text-[#050038]"><BellIcon className="h-5 w-5"/><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#f24726]"/></button>{action}</div></header>;
}
