const STORAGE_KEY = "sr_device_id";

/** Fallback para navegadores/contextos sem crypto.randomUUID (HTTP local, Safari antigo) */
function fallbackUuid() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Lê (ou cria) o ID técnico deste navegador.
 * Fora do componente para que qualquer módulo possa chamar sem hook.
 */
export function getDeviceId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : fallbackUuid();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage bloqueado (modo privado restrito) — ID só desta sessão.
    // Volume e apelidos não persistem, mas a sala funciona normalmente.
    if (!window.__srEphemeralId) {
      window.__srEphemeralId = crypto.randomUUID ? crypto.randomUUID() : fallbackUuid();
    }
    return window.__srEphemeralId;
  }
}

/**
 * Identificador técnico e estável deste navegador.
 * NUNCA é exibido na interface — serve só como chave de identidade
 * na sala e para salvar preferências locais (volume, apelidos).
 * Não é uma conta: não autentica nem prova quem a pessoa é.
 */
export function useDeviceId() {
  return getDeviceId();
}
