import { useEffect } from "react";

/**
 * No celular, o teclado virtual pode cobrir o campo que a pessoa acabou
 * de tocar (ou botões logo abaixo dele) — principalmente dentro de
 * painéis com position:fixed (a gaveta de participantes), onde o
 * "resize" do viewport que o navegador faz sozinho nem sempre reflui
 * pra dentro do elemento fixo. Sempre que o teclado abre/fecha
 * (visualViewport dispara "resize"), rola o campo focado pro centro
 * visível. Sem visualViewport (navegador antigo), não faz nada —
 * degrada normalmente.
 */
export function useKeyboardSafeInputs() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const el = document.activeElement;
      if (!el) return;
      const tag = el.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA") return;
      // Pequeno atraso: no iOS a animação do teclado ainda está em
      // andamento quando o primeiro "resize" dispara.
      setTimeout(() => {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 60);
    };

    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);
}
