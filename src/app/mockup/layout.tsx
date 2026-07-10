import type { ReactNode } from "react";
import { AppNav } from "./_components/app-nav";

export default function MockupLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#f7f7fa] text-[#050038]"><AppNav /><main className="mx-auto min-h-screen max-w-[1320px] px-5 pb-28 pt-6 sm:px-8 md:pt-9 lg:ml-60 lg:max-w-none lg:px-10 lg:pb-12 xl:px-14">{children}</main></div>;
}
