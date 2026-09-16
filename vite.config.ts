import vinext from "vinext";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const isMobileDevelopment = process.env.npm_lifecycle_event === "dev:mobile";

export default defineConfig(({ command }) => ({
  server: isMobileDevelopment
    ? { host: "0.0.0.0", port: 3002, strictPort: true }
    : undefined,
  plugins: [vinext(), tailwindcss(), ...(command === "build" ? [nitro()] : [])],
}));
