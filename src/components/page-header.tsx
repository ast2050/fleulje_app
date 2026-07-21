export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <header className="mb-7 flex items-start justify-between gap-4 md:mb-9"><div><p className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-[#77778d]">{eyebrow ?? "FLEULJE WORKSPACE"}</p><h1 className="text-[30px] font-medium leading-none tracking-[-0.06em] text-[#050038] md:text-[38px]">{title}</h1></div>{action ? <div className="flex items-center gap-2">{action}</div> : null}</header>;
}
