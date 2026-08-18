import { useState, useCallback } from "react";

const VOLUMES_KEY = "sr_volumes";
const NICKNAMES_KEY = "sr_nicknames";
const KNOWN_KEY = "sr_known";

/** Lê um objeto JSON do localStorage com segurança */
function readMap(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cota estourada ou storage bloqueado — preferência vale só nesta sessão.
  }
}

/**
 * Volume por amigo, salvo sob o deviceId dele (não pelo nome,
 * que pode mudar entre salas).
 * Formato: { [deviceId]: volumePercentual }
 */
export function usePersistedVolumes() {
  const [volumes, setVolumes] = useState(() => readMap(VOLUMES_KEY));

  const setVolume = useCallback((deviceId, value) => {
    setVolumes((prev) => {
      const next = { ...prev, [deviceId]: value };
      writeMap(VOLUMES_KEY, next);
      return next;
    });
  }, []);

  const resetVolume = useCallback((deviceId) => {
    setVolumes((prev) => {
      const next = { ...prev };
      delete next[deviceId];
      writeMap(VOLUMES_KEY, next);
      return next;
    });
  }, []);

  return { volumes, setVolume, resetVolume };
}

/**
 * Apelidos locais — funciona como uma agenda de contatos privada.
 * Só quem salvou enxerga; não altera o nome que o amigo escolheu.
 * Formato: { [deviceId]: apelidoLocal }
 */
export function useNicknames() {
  const [nicknames, setNicknames] = useState(() => readMap(NICKNAMES_KEY));

  const setNickname = useCallback((deviceId, nickname) => {
    const clean = String(nickname).trim().slice(0, 24);
    setNicknames((prev) => {
      const next = { ...prev };
      if (clean) next[deviceId] = clean;
      else delete next[deviceId]; // apelido vazio = voltar ao nome original
      writeMap(NICKNAMES_KEY, next);
      return next;
    });
  }, []);

  /** Nome a exibir: apelido local > nome escolhido pela pessoa > fallback */
  const displayName = useCallback(
    (participant) =>
      nicknames[participant.identity] || participant.name || "Participante",
    [nicknames]
  );

  return { nicknames, setNickname, displayName };
}

/**
 * Histórico de nomes por amigo.
 * Serve para você reconhecer alguém que voltou com outro nome:
 * o volume já é reaplicado pelo deviceId, mas sem isto você
 * olharia a lista e não saberia quem é quem.
 * Formato: { [deviceId]: ultimoNomeVisto }
 */
export function useKnownNames() {
  const [known, setKnown] = useState(() => readMap(KNOWN_KEY));

  /** Registra o nome atual; devolve o anterior se for diferente */
  const remember = useCallback((deviceId, currentName) => {
    if (!deviceId || !currentName) return;
    setKnown((prev) => {
      if (prev[deviceId] === currentName) return prev;
      const next = { ...prev, [deviceId]: currentName };
      writeMap(KNOWN_KEY, next);
      return next;
    });
  }, []);

  /** Nome anterior, só se for diferente do atual */
  const previousName = useCallback(
    (participant) => {
      const seen = known[participant.identity];
      return seen && seen !== participant.name ? seen : null;
    },
    [known]
  );

  /** Já vimos esta pessoa antes? */
  const isKnown = useCallback(
    (participant) => Boolean(known[participant.identity]),
    [known]
  );

  return { known, remember, previousName, isKnown };
}
