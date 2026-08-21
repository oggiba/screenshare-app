import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  useLocalParticipant,
  useRoomContext,
  useConnectionQualityIndicator,
} from "@livekit/components-react";
import { ConnectionQuality } from "livekit-client";
import "./ControlDock.css";

const tap = { scale: 0.93 };
const hover = { scale: 1.04 };

/**
 * Consumo desta sessão.
 * O plano gratuito do LiveKit corta o serviço ao estourar a cota mensal,
 * então ver o gasto acontecendo evita a surpresa de a sala parar no meio.
 */
function UsagePip() {
  const room = useRoomContext();
  const [mb, setMb] = useState(0);

  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        let bytes = 0;
        for (const p of room.remoteParticipants.values()) {
          for (const pub of p.trackPublications.values()) {
            const stats = await pub.track?.getRTCStatsReport?.();
            if (!stats) continue;
            stats.forEach((r) => {
              if (r.type === "inbound-rtp" && r.bytesReceived) bytes += r.bytesReceived;
            });
          }
        }
        if (alive && bytes > 0) setMb(bytes / 1_000_000);
      } catch {
        /* stats não são críticas */
      }
    };

    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [room]);

  if (mb < 1) return null;

  const label = mb >= 1000 ? `${(mb / 1000).toFixed(2)} GB` : `${Math.round(mb)} MB`;

  return (
    <div className="usage-pip" title="Dados recebidos nesta sessão — conta na cota mensal do LiveKit">
      ↓ {label}
    </div>
  );
}

/** Indicador de qualidade de conexão (ping visual) */
function QualityPip() {
  const { localParticipant } = useLocalParticipant();
  const { quality } = useConnectionQualityIndicator({ participant: localParticipant });
  const [ping, setPing] = useState(null);

  // Coleta RTT real das estatísticas WebRTC.
  // Usa qualquer track publicada (mic ou tela) — se nenhuma estiver ativa,
  // cai no indicador qualitativo do LiveKit.
  useEffect(() => {
    let alive = true;

    const measure = async () => {
      try {
        const pubs = Array.from(localParticipant.trackPublications.values());
        for (const pub of pubs) {
          const stats = await pub.track?.getRTCStatsReport?.();
          if (!stats) continue;
          let found = null;
          stats.forEach((report) => {
            if (
              report.type === "candidate-pair" &&
              report.state === "succeeded" &&
              report.currentRoundTripTime != null
            ) {
              found = Math.round(report.currentRoundTripTime * 1000);
            }
          });
          if (found != null && alive) {
            setPing(found);
            return;
          }
        }
        if (alive) setPing(null);
      } catch {
        /* silencioso — stats não são críticas */
      }
    };

    measure();
    const interval = setInterval(measure, 3000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [localParticipant]);

  const label = {
    [ConnectionQuality.Excellent]: { text: "Ótima", cls: "q-good" },
    [ConnectionQuality.Good]: { text: "Boa", cls: "q-ok" },
    [ConnectionQuality.Poor]: { text: "Ruim", cls: "q-bad" },
    [ConnectionQuality.Lost]: { text: "Perdida", cls: "q-bad" },
  }[quality] || { text: "—", cls: "q-ok" };

  return (
    <div className={`quality-pip ${label.cls}`} title="Qualidade da conexão">
      <span className="q-dot" />
      <span className="q-text">{ping != null ? `${ping}ms` : label.text}</span>
    </div>
  );
}

export function ControlDock({ deafened, onToggleDeafen, onOpenSettings, onLeave, quality, theme, onToggleTheme }) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const [micOn, setMicOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [busy, setBusy] = useState(false);

  // Sincroniza estado local com o estado real das tracks
  useEffect(() => {
    const sync = () => {
      setMicOn(localParticipant.isMicrophoneEnabled);
      setScreenOn(localParticipant.isScreenShareEnabled);
    };
    sync();
    room.on("localTrackPublished", sync);
    room.on("localTrackUnpublished", sync);
    room.on("trackMuted", sync);
    room.on("trackUnmuted", sync);
    return () => {
      room.off("localTrackPublished", sync);
      room.off("localTrackUnpublished", sync);
      room.off("trackMuted", sync);
      room.off("trackUnmuted", sync);
    };
  }, [room, localParticipant]);

  const toggleMic = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await localParticipant.setMicrophoneEnabled(!micOn);
      setMicOn(!micOn);
    } catch (err) {
      console.error("Erro no microfone:", err);
    } finally {
      setBusy(false);
    }
  };

  const toggleScreen = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Resolução e bitrate vêm do preset escolhido nas configurações.
      // Manter os dois casados é o que evita imagem borrada.
      await localParticipant.setScreenShareEnabled(
        !screenOn,
        quality.captureOptions(),
        quality.publishOptions()
      );
      setScreenOn(!screenOn);
    } catch (err) {
      // Usuário cancelou o seletor de tela — não é erro real
      if (err?.name !== "NotAllowedError") console.error("Erro no screenshare:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="control-dock">
      <QualityPip />
      <UsagePip />

      <div className="stream-quality-tag" title={quality.current.hint}>
        {quality.current.detail}
      </div>

      <div className="dock-buttons">
        {/* Microfone */}
        <motion.button
          className={`dock-btn ${micOn ? "active" : "off"}`}
          onClick={toggleMic}
          disabled={busy}
          title={micOn ? "Desligar microfone" : "Ligar microfone"}
          whileHover={hover}
          whileTap={tap}
        >
          <motion.span
            key={micOn ? "on" : "off"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            {micOn ? "🎙️" : "🔇"}
          </motion.span>
          <span>{micOn ? "Mic ligado" : "Mic mudo"}</span>
        </motion.button>

        {/* Ensurdecer (mutar tudo) */}
        <motion.button
          className={`dock-btn ${deafened ? "off" : "active"}`}
          onClick={onToggleDeafen}
          title={deafened ? "Reativar todo o áudio" : "Mutar todo o áudio da sala"}
          whileHover={hover}
          whileTap={tap}
        >
          {deafened ? "🔕" : "🔊"}
          <span>{deafened ? "Áudio mudo" : "Áudio ligado"}</span>
        </motion.button>

        {/* Compartilhar tela */}
        <motion.button
          className={`dock-btn screen ${screenOn ? "sharing" : ""}`}
          onClick={toggleScreen}
          disabled={busy}
          title={screenOn ? "Parar de compartilhar" : "Compartilhar tela"}
          whileHover={hover}
          whileTap={tap}
          animate={screenOn ? { boxShadow: "0 0 0 4px var(--accent-glow)" } : { boxShadow: "0 0 0 0px transparent" }}
        >
          {screenOn ? "⏹️" : "🖥️"}
          <span>{screenOn ? "Parar transmissão" : "Compartilhar tela"}</span>
        </motion.button>

        {/* Tema */}
        <motion.button
          className="dock-btn subtle"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
          whileHover={hover}
          whileTap={{ ...tap, rotate: 25 }}
        >
          <motion.span
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ display: "inline-block" }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </motion.span>
        </motion.button>

        {/* Configurações */}
        <motion.button
          className="dock-btn subtle"
          onClick={onOpenSettings}
          title="Configurações de áudio"
          whileHover={{ ...hover, rotate: 40 }}
          whileTap={tap}
        >
          ⚙️
        </motion.button>

        {/* Sair */}
        <motion.button
          className="dock-btn danger"
          onClick={onLeave}
          title="Sair da sala"
          whileHover={hover}
          whileTap={tap}
        >
          📴
          <span>Sair</span>
        </motion.button>
      </div>
    </div>
  );
}
