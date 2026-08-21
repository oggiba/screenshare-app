const SCHEMA_VERSION = 1;

/**
 * Leitura/escrita de localStorage com um envelope de versão e timestamp,
 * usado só pelos dados "sobre os amigos" (volumes, apelidos, nomes
 * conhecidos — ver useFriendPrefs.js). Dois motivos:
 *
 * 1. Corrupção: se o valor salvo não bater com o formato esperado (JSON
 *    quebrado, tipo errado, campo faltando), cai no fallback em vez de
 *    propagar um erro ou usar um valor sem sentido.
 * 2. Terreno pra uma futura sincronização entre aparelhos (ex.: Firebase):
 *    "quando foi a última escrita" é exatamente o que esse tipo de
 *    sincronização precisa pra resolver conflito quando o mesmo dado
 *    muda em dois aparelhos diferentes.
 *
 * Dado gravado ANTES deste envelope existir (sem "v"/"data") é tratado
 * como válido e lido normalmente — nunca descarta uma preferência só
 * porque ela é de uma versão anterior do app.
 */
export function readLocal(key, fallback, isValid = () => true) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    const data =
      parsed && typeof parsed === "object" && "v" in parsed && "data" in parsed
        ? parsed.data
        : parsed; // formato pré-envelope — o valor bruto já é o dado
    return isValid(data) ? data : fallback;
  } catch {
    return fallback;
  }
}

/**
 * @param {object} [options]
 * @param {number} [options.maxMapEntries] Se o valor for um objeto plano
 *   com mais entradas que isto, mantém só as mais recentes (a ordem de
 *   inserção de chaves string é estável em objetos JS). Evita que um
 *   navegador usado por muito tempo, com muita gente diferente passando
 *   pelas salas, acumule esse tipo de dado pra sempre sem limite.
 */
export function writeLocal(key, value, { maxMapEntries } = {}) {
  try {
    let data = value;
    if (maxMapEntries && data && typeof data === "object" && !Array.isArray(data)) {
      const entries = Object.entries(data);
      if (entries.length > maxMapEntries) {
        data = Object.fromEntries(entries.slice(entries.length - maxMapEntries));
      }
    }
    localStorage.setItem(
      key,
      JSON.stringify({ v: SCHEMA_VERSION, updatedAt: new Date().toISOString(), data })
    );
    return true;
  } catch {
    return false; // cota estourada ou storage bloqueado — preferência vale só nesta sessão
  }
}
