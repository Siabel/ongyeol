import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "온결 — 삶의 결을 잇는 기록",
    short_name: "온결",
    description: "일정, 지출, 감정과 작은 순간을 하나의 흐름으로 잇는 개인 기록 서비스",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F0E8",
    theme_color: "#294B45",
    orientation: "portrait-primary",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
