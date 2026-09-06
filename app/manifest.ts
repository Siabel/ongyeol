import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "온결 — 삶의 결을 잇는 기록",
    short_name: "온결",
    description: "일정, 지출, 감정과 작은 순간을 하나의 흐름으로 잇는 개인 기록 서비스",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F4F0E8",
    theme_color: "#294B45",
    orientation: "portrait-primary",
    lang: "ko-KR",
    categories: ["lifestyle", "productivity", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
