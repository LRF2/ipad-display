import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Dev proxy to the Python server.
    proxy: {
      "/stream": "http://localhost:8080",
      "/ws": { target: "ws://localhost:8080", ws: true },
      "/info": "http://localhost:8080",
      "/settings": "http://localhost:8080",
      "/pair": "http://localhost:8080",
      "/pair-qr": "http://localhost:8080",
      "/pair-qr.svg": "http://localhost:8080",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
