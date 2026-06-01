import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  plugins: [
    react(),

    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "masked-icon.svg",
      ],

      manifest: {
        name: "VK Cafe POS",

        short_name: "VK POS",

        description: "Restaurant POS System",

        theme_color: "#111827",

        background_color: "#111827",

        display: "standalone",

        scope: "/",

        start_url: "/",

        orientation: "portrait",

        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },

          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },

          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],

        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === "image",

            handler: "CacheFirst",

            options: {
              cacheName: "images",

              expiration: {
                maxEntries: 50,
              },
            },
          },

          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style",

            handler: "StaleWhileRevalidate",

            options: {
              cacheName: "assets",
            },
          },
        ],
      },

      // Disable dev service worker to avoid intercepting module requests
      // during development which can cause aborted requests / blank pages.
      devOptions: {
        enabled: false,
      },
    }),
  ],

  server: {
    host: true,
    port: 5173,
  },

  preview: {
    host: true,
    port: 4173,
  },
});