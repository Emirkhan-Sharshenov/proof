import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev server: serve the app shell for /app/* and /v/* (production uses public/_redirects).
const appFallback = (): Plugin => ({
  name: "app-fallback",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const path = req.url?.split("?")[0] ?? "";
      if ((path === "/app" || path.startsWith("/app/") || path.startsWith("/v/") || path.startsWith("/t/")) && !path.includes(".")) {
        req.url = "/app/index.html";
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), appFallback()],
  build: {
    rollupOptions: {
      input: {
        landing: resolve(import.meta.dirname, "index.html"),
        app: resolve(import.meta.dirname, "app/index.html"),
      },
    },
  },
});
