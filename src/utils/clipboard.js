/**
 * Copia texto para a área de transferência.
 *
 * navigator.clipboard falha silenciosamente em vários casos reais:
 * documento sem foco, permissão negada, contexto não-seguro (HTTP),
 * ou navegador dentro de app embutido. Por isso há fallback.
 *
 * Retorna true se copiou, false se o chamador precisa mostrar o texto
 * para o usuário copiar manualmente.
 */
export async function copyText(text) {
  // Caminho moderno — exige contexto seguro (HTTPS) e documento focado
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Cai para o fallback abaixo
    }
  }

  // Fallback: textarea temporário + execCommand (obsoleto mas amplamente suportado)
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);

    ta.select();
    ta.setSelectionRange(0, text.length); // iOS exige isto

    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
