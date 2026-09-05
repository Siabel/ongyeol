import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./ongyeol.css";


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#294B45",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    title: "온결 — 삶의 결을 잇는 기록",
    description: "일정과 장소, 지출, 감정과 작은 순간을 하나의 흐름으로 잇는 개인 기록 서비스",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "default", title: "온결" },
    openGraph: { title: "온결 — 삶의 결을 잇는 기록", description: "일정 · 장소 · 지출 · 감정 · 작은 순간을 하나의 결로", images: [{ url: `${origin}/og.png`, width: 1792, height: 937 }] },
    twitter: { card: "summary_large_image", title: "온결 — 삶의 결을 잇는 기록", description: "일정 · 장소 · 지출 · 감정 · 작은 순간을 하나의 결로", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
