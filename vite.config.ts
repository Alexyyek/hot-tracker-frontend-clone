import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

declare const process: {
  env: Record<string, string | undefined>;
};

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://hot.kyangc.net",
        changeOrigin: true,
        secure: true
      },
      "/source-avatars": {
        target: "https://hot.kyangc.net",
        changeOrigin: true,
        secure: true
      },
      "/feed-images": {
        target: "https://hot.kyangc.net",
        changeOrigin: true,
        secure: true
      }
    }
  }
});
