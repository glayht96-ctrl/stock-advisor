import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.svg", "icon-512.svg"],
      manifest: {
        name: "Stock Advisor",
        short_name: "StockAI",
        description: "日本株・米国株 テクニカル分析 & AI見立て",
        theme_color: "#030712",
        background_color: "#030712",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.port === "8000" || url.hostname.endsWith(".onrender.com"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});
