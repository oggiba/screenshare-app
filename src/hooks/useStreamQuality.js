import { useState, useCallback } from "react";
import { ScreenSharePresets } from "livekit-client";

const QUALITY_KEY = "sr_quality";
const MODE_KEY = "sr_quality_mode";

/**
 * Presets de transmissão.
 * Os valores de bitrate vêm dos presets oficiais do LiveKit — cada resolução
 * tem um bitrate calibrado. Pedir 1080p com bitrate de 720p produz imagem
 * pior do que simplesmente transmitir em 720p.
 */
export const QUALITY_PRESETS = {
  economy: {
    id: "economy",
    label: "Econômico",
    detail: "360p · 15fps · 0.4 Mbps",
    hint: "Para internet fraca ou muitas telas ao mesmo tempo",
    preset: ScreenSharePresets.h360fps15,
  },
  standard: {
    id: "standard",
    label: "Padrão",
    detail: "720p · 30fps · 2 Mbps",
    hint: "Mesmo padrão do Discord — melhor equilíbrio",
    preset: ScreenSharePresets.h720fps30,
  },
  reading: {
    id: "reading",
    label: "Leitura",
    detail: "1080p · 15fps · 2.5 Mbps",
    hint: "Texto e código nítidos, movimento menos fluido",
    preset: ScreenSharePresets.h1080fps15,
  },
  high: {
    id: "high",
    label: "Alta",
    detail: "1080p · 30fps · 5 Mbps",
    hint: "Exige upload bom. Pesa na CPU de quem assiste",
    preset: ScreenSharePresets.h1080fps30,
  },
};

/**
 * Como o encoder reage quando a banda aperta.
 * Este é o mesmo trade-off que o Discord expõe como
 * "Melhor qualidade" vs "Vídeo mais fluido".
 */
export const DEGRADATION_MODES = {
  motion: {
    id: "motion",
    label: "Priorizar fluidez",
    hint: "Jogos e vídeo — derruba a resolução para manter os fps",
    value: "maintain-framerate",
  },
  clarity: {
    id: "clarity",
    label: "Priorizar nitidez",
    hint: "Código e documentos — derruba os fps para manter o texto legível",
    value: "maintain-resolution",
  },
};

export function useStreamQuality() {
  const [qualityId, setQualityId] = useState(() => {
    const saved = localStorage.getItem(QUALITY_KEY);
    return QUALITY_PRESETS[saved] ? saved : "standard";
  });

  const [modeId, setModeId] = useState(() => {
    const saved = localStorage.getItem(MODE_KEY);
    return DEGRADATION_MODES[saved] ? saved : "motion";
  });

  const setQuality = useCallback((id) => {
    if (!QUALITY_PRESETS[id]) return;
    setQualityId(id);
    try { localStorage.setItem(QUALITY_KEY, id); } catch { /* storage bloqueado */ }
  }, []);

  const setMode = useCallback((id) => {
    if (!DEGRADATION_MODES[id]) return;
    setModeId(id);
    try { localStorage.setItem(MODE_KEY, id); } catch { /* storage bloqueado */ }
  }, []);

  /** Opções de captura para setScreenShareEnabled */
  const captureOptions = useCallback(() => {
    const { preset } = QUALITY_PRESETS[qualityId];
    return {
      audio: true,
      resolution: preset.resolution,
      // Evita o efeito espelho de compartilhar a própria aba do ShareRoom
      selfBrowserSurface: "exclude",
      // Permite trocar de janela sem reiniciar a transmissão
      surfaceSwitching: "include",
    };
  }, [qualityId]);

  /** Opções de publicação — bitrate casado com a resolução escolhida */
  const publishOptions = useCallback(() => {
    const { preset } = QUALITY_PRESETS[qualityId];
    return {
      videoEncoding: preset.encoding,
      screenShareEncoding: preset.encoding,
      degradationPreference: DEGRADATION_MODES[modeId].value,
      // Screenshare não usa simulcast: as camadas extras custam CPU do
      // transmissor sem ganho real quando todos assistem em tela cheia.
      simulcast: false,
    };
  }, [qualityId, modeId]);

  return {
    qualityId,
    modeId,
    setQuality,
    setMode,
    captureOptions,
    publishOptions,
    current: QUALITY_PRESETS[qualityId],
    currentMode: DEGRADATION_MODES[modeId],
  };
}
