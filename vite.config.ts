// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { liveVoiceDev } from "./live-vite-plugin";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      // Exact-match aliases only: email rendering needs entities v4, while parse5 keeps its own
      // nested v6 for subpaths like "entities/decode" — a prefix alias would break those.
      alias: [
        { find: /^entities\/lib\/decode\.js$/, replacement: path.resolve(__dirname, "node_modules/entities/lib/decode.js") },
        { find: /^entities\/lib\/encode\.js$/, replacement: path.resolve(__dirname, "node_modules/entities/lib/encode.js") },
        { find: /^entities$/, replacement: path.resolve(__dirname, "node_modules/entities") },
      ],
    },
    plugins: [
      liveVoiceDev(),
      mcpPlugin(),
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: { enabled: false },
        manifest: false,
        filename: "sw.js",
        outDir: "dist/client",
        workbox: {
          globPatterns: ["**/*.{js,css,png,jpg,svg,woff2}"],
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/~oauth") && !url.pathname.startsWith("/api"),
              handler: "NetworkFirst",
              options: { cacheName: "ghost-pages", networkTimeoutSeconds: 4, expiration: { maxEntries: 40 } },
            },
            {
              urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/"),
              handler: "CacheFirst",
              options: { cacheName: "ghost-assets", expiration: { maxEntries: 200 } },
            },
            {
              urlPattern: ({ url }) => url.origin.includes("fonts.g"),
              handler: "StaleWhileRevalidate",
              options: { cacheName: "ghost-fonts" },
            },
          ],
        },
      }),
    ],
  },
});
