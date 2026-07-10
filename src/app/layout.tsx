import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/app-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "fleulje",
  description: "fleulje 業務アプリ（つくる・売る）",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="min-h-screen bg-[#f7f7fa] text-[#050038]">
          <AppNav />
          <main className="mx-auto min-h-screen max-w-[1320px] px-5 pb-28 pt-6 sm:px-8 md:pt-9 lg:ml-60 lg:max-w-none lg:px-10 lg:pb-12 xl:px-14">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
