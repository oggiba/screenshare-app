import { useCallback, useRef, useState } from "react";

const VOLUME_KEY = "sr_sfx_volume";

function readVolume() {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    const n = raw != null ? Number(raw) : 60;
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 60;
  } catch {
    return 60; // storage bloqueado — volume padrão só para esta sessão
  }
}

function writeVolume(value) {
  try {
    localStorage.setItem(VOLUME_KEY, String(value));
  } catch {
    /* storage bloqueado — a preferência não persiste, sem problema */
  }
}

/**
 * Sons de interface sintetizados via Web Audio API — não são arquivos
 * de áudio externos (evita licenciamento, download e peso no bundle).
 * Cada som é só um ou dois osciladores curtos com um envelope de ganho.
 */
function playTone(ctx, masterGain, { freqFrom, freqTo, duration, type = "sine", delay = 0 }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;

  const start = ctx.currentTime + delay;
  const end = start + duration;

  osc.frequency.setValueAtTime(freqFrom, start);
  if (freqTo != null && freqTo !== freqFrom) {
    osc.frequency.linearRampToValueAtTime(freqTo, end);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(1, start + Math.min(0.015, duration / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(start);
  osc.stop(end + 0.02);
}

/**
 * Feedback sonoro curto para ações da UI (clique, mutar/desmutar,
 * iniciar/parar transmissão). Sintetizado localmente — nenhum arquivo
 * de áudio é baixado. Respeita o volume salvo em "Configurações" e
 * nunca lança se o navegador bloquear o AudioContext (autoplay, modo
 * privado restrito etc.) — só fica em silêncio.
 */
export function useSoundEffects() {
  const [volume, setVolumeState] = useState(readVolume);
  const ctxRef = useRef(null);

  const getContext = useCallback(() => {
    try {
      if (!ctxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        ctxRef.current = new Ctx();
      }
      if (ctxRef.current.state === "suspended") {
        ctxRef.current.resume().catch(() => {});
      }
      return ctxRef.current;
    } catch {
      return null; // AudioContext indisponível — segue sem som
    }
  }, []);

  const run = useCallback(
    (tones) => {
      if (volume <= 0) return;
      try {
        const ctx = getContext();
        if (!ctx) return;
        const masterGain = ctx.createGain();
        masterGain.gain.value = volume / 100;
        masterGain.connect(ctx.destination);
        tones.forEach((tone) => playTone(ctx, masterGain, tone));
      } catch {
        /* falha ao sintetizar som — silencioso, nunca deve travar a UI */
      }
    },
    [volume, getContext]
  );

  const setVolume = useCallback((value) => {
    const clamped = Math.min(100, Math.max(0, value));
    setVolumeState(clamped);
    writeVolume(clamped);
  }, []);

  const sounds = {
    click: useCallback(
      () => run([{ freqFrom: 720, freqTo: 620, duration: 0.05, type: "sine" }]),
      [run]
    ),
    mute: useCallback(
      () => run([{ freqFrom: 560, freqTo: 300, duration: 0.11, type: "sine" }]),
      [run]
    ),
    unmute: useCallback(
      () => run([{ freqFrom: 340, freqTo: 620, duration: 0.11, type: "sine" }]),
      [run]
    ),
    shareStart: useCallback(
      () =>
        run([
          { freqFrom: 440, freqTo: 440, duration: 0.09, type: "triangle" },
          { freqFrom: 660, freqTo: 660, duration: 0.14, type: "triangle", delay: 0.09 },
        ]),
      [run]
    ),
    shareStop: useCallback(
      () =>
        run([
          { freqFrom: 660, freqTo: 660, duration: 0.09, type: "triangle" },
          { freqFrom: 440, freqTo: 440, duration: 0.14, type: "triangle", delay: 0.09 },
        ]),
      [run]
    ),
  };

  return { sounds, volume, setVolume };
}
