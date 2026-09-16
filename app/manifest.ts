import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "작은다음 — 오늘의 한 칸이 다음을 만들어요",
    short_name: "작다",
    description:
      "일정, 지출, 감정과 작은 순간을 기록하며 나만의 다음을 만들어가는 개인 기록 서비스",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F8FC",
    theme_color: "#4658A6",
    orientation: "portrait-primary",
    lang: "ko-KR",
    categories: ["lifestyle", "productivity", "finance"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
