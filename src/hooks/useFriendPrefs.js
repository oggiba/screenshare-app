import { useState, useCallback } from "react";
import { readLocal, writeLocal } from "../utils/localStore";

const VOLUMES_KEY = "sr_volumes";
const NICKNAMES_KEY = "sr_nicknames";
const KNOWN_KEY = "sr_known";

// Limite de segurança contra crescimento sem fim num navegador usado por
// muito tempo com muita gente diferente passando pelas salas — mantém
// só as entradas mais recentes acima disso (ver writeLocal).
const MAX_FRIEND_ENTRIES = 300;

const isPlainObject = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** Lê um mapa { [deviceId]: valor } do localStorage, tolerando dado corrompido/antigo */
function readMap(key) {
  return readLocal(key, {}, isPlainObject);
}

function writeMap(key, value) {
  writeLocal(key, value, { maxMapEntries: MAX_FRIEND_ENTRIES });
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
