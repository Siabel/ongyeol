import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { PwaManager } from "./components/pwa-manager";
import "./globals.css";
import "./theme.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4658A6",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    applicationName: "작은다음",
    title: "작은다음 — 오늘의 한 칸이 다음을 만들어요",
    description:
      "일정과 장소, 지출, 감정과 작은 순간을 기록하며 나만의 다음을 만들어가는 개인 기록 서비스",
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      shortcut: "/favicon.svg",
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "default", title: "작다" },
    openGraph: {
      title: "작은다음 — 오늘의 한 칸이 다음을 만들어요",
      description: "일정 · 장소 · 지출 · 감정 · 작은 순간을 다음으로",
      images: [{ url: `${origin}/og.png`, width: 1792, height: 937 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "작은다음 — 오늘의 한 칸이 다음을 만들어요",
      description: "일정 · 장소 · 지출 · 감정 · 작은 순간을 다음으로",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <PwaManager />
      </body>
    </html>
  );
}
