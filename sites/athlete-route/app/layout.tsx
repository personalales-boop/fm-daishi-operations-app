import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Athlete 送迎ルート",
  description: "介護送迎の顧客登録、当日搭乗者、車両別配車表、CSV/Excel取り込みをまとめて管理するWebアプリです。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
