import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    modulePreload: {
      // Por padrão o Vite injeta <link rel="modulepreload"> para todo chunk
      // alcançável, mesmo os que só são usados via import() dinâmico — isso
      // baixaria o SDK do LiveKit já na Home, anulando o motivo de Room ser
      // lazy(). Exclui só esse chunk do preload; ele passa a ser buscado no
      // momento real do import() dinâmico (entrar numa sala).
      resolveDependencies: (_filename, deps) => deps.filter((dep) => !dep.includes("livekit")),
    },
    // Sem manualChunks: Home/Room/SettingsModal já são divididos pelas
    // fronteiras reais de React.lazy() (ver App.jsx e Room.jsx). Forçar
    // "react" e "livekit" em buckets nomeados causava o Rollup colocar uma
    // cópia interna do React dentro do chunk do livekit (interop de uma
    // dependência CJS), fazendo o entry principal precisar dela mesmo sem
    // usar nada do LiveKit — o próprio download que o code-splitting devia
    // evitar. O agrupamento automático do Rollup segue os limites reais do
    // grafo de import() e não tem esse problema.
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
