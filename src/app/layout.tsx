import type { Metadata, Viewport } from "next";
import { BIZ_UDPGothic, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

const bodyFont = BIZ_UDPGothic({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  preload: false,
});

const displayFont = Zen_Kaku_Gothic_New({
  weight: ["700", "900"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "資格クエスト",
    template: "%s | 資格クエスト",
  },
  description: "情報系・ものづくり系の資格を体系的に取るための、自分用の勉強・記録アプリ",
  applicationName: "資格クエスト",
  appleWebApp: { capable: true, title: "資格クエスト", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5fa" },
    { media: "(prefers-color-scheme: dark)", color: "#121a33" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
