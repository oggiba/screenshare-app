import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Separa o SDK do LiveKit do código da app.
        // O SDK muda pouco → fica em cache no navegador do usuário
        // entre deploys, deixando o carregamento seguinte quase instantâneo.
        manualChunks: {
          livekit: ["livekit-client", "@livekit/components-react"],
          react: ["react", "react-dom"],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  server: {
    proxy: {
      "/.netlify/functions": {
        target: "http://localhost:8888",
        changeOrigin: true,
      },
    },
  },
});
