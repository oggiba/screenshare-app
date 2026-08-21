import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MonitorUp,
  Square,
  Sun,
  Moon,
  Settings as SettingsIcon,
  LogOut,
  ArrowDown,
  Camera,
  CameraOff,
} from "lucide-react";
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
      <ArrowDown size={11} /> {label}
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

export function ControlDock({ deafened, onToggleDeafen, onOpenSettings, onLeave, quality, theme, onToggleTheme, sounds }) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const [micOn, setMicOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shareError, setShareError] = useState(null);

  // getDisplayMedia simplesmente não existe na maioria dos navegadores
  // mobile (Safari iOS sempre, Chrome Android em muitas versões) — sem
  // checar isso, o botão "Compartilhar tela" fica clicável mas não faz
  // nada, e o erro só aparece silencioso no console. Aqui a pessoa recebe
  // um aviso explicando por quê, em vez de achar que o app travou.
  const screenShareSupported =
    typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia);

  // Sincroniza estado local com o estado real das tracks
  useEffect(() => {
    const sync = () => {
      setMicOn(localParticipant.isMicrophoneEnabled);
      setScreenOn(localParticipant.isScreenShareEnabled);
      setCameraOn(localParticipant.isCameraEnabled);
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
      const next = !micOn;
      await localParticipant.setMicrophoneEnabled(next);
      setMicOn(next);
      next ? sounds?.unmute() : sounds?.mute();
    } catch (err) {
      console.error("Erro no microfone:", err);
    } finally {
      setBusy(false);
    }
  };

  const toggleCamera = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = !cameraOn;
      await localParticipant.setCameraEnabled(next);
      setCameraOn(next);
      sounds?.click();
    } catch (err) {
      // Permissão negada ou câmera em uso por outro app — não trava a UI
      if (err?.name !== "NotAllowedError") console.error("Erro na câmera:", err);
    } finally {
      setBusy(false);
    }
  };

  const toggleScreen = async () => {
    if (busy) return;

    if (!screenOn && !screenShareSupported) {
      sounds?.click();
      setShareError(
        "Este navegador não permite compartilhar tela. Tente o Chrome no computador, ou no Android use o Chrome mais recente."
      );
      setTimeout(() => setShareError(null), 5000);
      return;
    }

    setBusy(true);
    const next = !screenOn;
    // Em alguns navegadores Chromium no Android (relatado no Brave), o
    // seletor nativo "escolha o que compartilhar" aparece atrás da página
    // em vez de por cima. Suspeita forte: elementos com layout do Framer
    // Motion mantêm uma camada de composição GPU ativa mesmo parados —
    // causa conhecida desse tipo de UI nativa "sumir" atrás de conteúdo
    // com transform. Desliga transform/will-change na página inteira
    // (ver base.css, body.picker-opening) e, mais importante, espera
    // dois frames depois de marcar "busy" (que já dispara um re-render
    // dos botões do dock) para o navegador realmente assentar essa
    // repintura ANTES de pedir o seletor — chamá-lo no mesmo tick do
    // clique corre o risco de competir com uma repintura em andamento.
    if (next) {
      document.body.classList.add("picker-opening");
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );
    }
    try {
      // Resolução e bitrate vêm do preset escolhido nas configurações.
      // Manter os dois casados é o que evita imagem borrada.
      await localParticipant.setScreenShareEnabled(
        next,
        quality.captureOptions(),
        quality.publishOptions()
      );
      setScreenOn(next);
      next ? sounds?.shareStart() : sounds?.shareStop();
    } catch (err) {
      // Usuário cancelou o seletor de tela — não é erro real
      if (err?.name !== "NotAllowedError") {
        console.error("Erro no screenshare:", err);
        setShareError("Não foi possível iniciar o compartilhamento de tela.");
        setTimeout(() => setShareError(null), 5000);
      }
    } finally {
      setBusy(false);
      document.body.classList.remove("picker-opening");
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
            style={{ display: "inline-flex" }}
          >
            {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          </motion.span>
          <span>{micOn ? "Mic ligado" : "Mic mudo"}</span>
        </motion.button>

        {/* Câmera */}
        <motion.button
          className={`dock-btn ${cameraOn ? "active" : "off"}`}
          onClick={toggleCamera}
          disabled={busy}
          title={cameraOn ? "Desligar câmera" : "Ligar câmera"}
          whileHover={hover}
          whileTap={tap}
        >
          {cameraOn ? <Camera size={16} /> : <CameraOff size={16} />}
          <span>{cameraOn ? "Câmera ligada" : "Câmera desligada"}</span>
        </motion.button>

        {/* Ensurdecer (mutar tudo) */}
        <motion.button
          className={`dock-btn ${deafened ? "off" : "active"}`}
          onClick={() => {
            deafened ? sounds?.unmute() : sounds?.mute();
            onToggleDeafen();
          }}
          title={deafened ? "Reativar todo o áudio" : "Mutar todo o áudio da sala"}
          whileHover={hover}
          whileTap={tap}
        >
          {deafened ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span>{deafened ? "Áudio mudo" : "Áudio ligado"}</span>
        </motion.button>

        {/* Compartilhar tela */}
        <div className="dock-btn-wrap">
          <motion.button
            className={`dock-btn screen ${screenOn ? "sharing" : ""}`}
            onClick={toggleScreen}
            disabled={busy}
            title={screenOn ? "Parar de compartilhar" : "Compartilhar tela"}
            whileHover={hover}
            whileTap={tap}
            animate={screenOn ? { boxShadow: "0 0 0 4px var(--accent-glow)" } : { boxShadow: "0 0 0 0px transparent" }}
          >
            {screenOn ? <Square size={15} /> : <MonitorUp size={16} />}
            <span>{screenOn ? "Parar transmissão" : "Compartilhar tela"}</span>
          </motion.button>

          <AnimatePresence>
            {shareError && (
              <motion.div
                className="dock-toast"
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {shareError}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tema */}
        <motion.button
          className="dock-btn subtle"
          onClick={() => {
            sounds?.click();
            onToggleTheme();
          }}
          title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
          whileHover={hover}
          whileTap={{ ...tap, rotate: 25 }}
        >
          <motion.span
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ display: "inline-flex" }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </motion.span>
        </motion.button>

        {/* Configurações */}
        <motion.button
          className="dock-btn subtle"
          onClick={() => {
            sounds?.click();
            onOpenSettings();
          }}
          title="Configurações de áudio"
          whileHover={{ ...hover, rotate: 40 }}
          whileTap={tap}
        >
          <SettingsIcon size={16} />
        </motion.button>

        {/* Sair */}
        <motion.button
          className="dock-btn danger"
          onClick={() => {
            sounds?.click();
            onLeave();
          }}
          title="Sair da sala"
          whileHover={hover}
          whileTap={tap}
        >
          <LogOut size={16} />
          <span>Sair</span>
        </motion.button>
      </div>
    </div>
  );
}
