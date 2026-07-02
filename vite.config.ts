import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
