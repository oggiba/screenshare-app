import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, MicOff, Maximize, SunMedium, ChevronsUpDown } from "lucide-react";
import { VideoTrack, useIsSpeaking } from "@livekit/components-react";
import { Track } from "livekit-client";
import "./Stage.css";

/* ============================================================
   Card de participante — mostrado quando ninguém compartilha,
   igual à visão de canal de voz do Discord.
   ============================================================ */
function PersonCard({ participant, label, big }) {
  const isSpeaking = useIsSpeaking(participant);
  const micPub = participant.getTrackPublication(Track.Source.Microphone);
  const isMuted = !micPub || micPub.isMuted;
  const camPub = participant.getTrackPublication(Track.Source.Camera);
  const hasCamera = Boolean(camPub && !camPub.isMuted && camPub.track);

  return (
    <motion.div
      layout
      className={`person-card ${isSpeaking ? "speaking" : ""} ${big ? "big" : ""} ${
        hasCamera ? "has-camera" : ""
      }`}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {hasCamera ? (
        <VideoTrack
          trackRef={{ participant, publication: camPub, source: Track.Source.Camera }}
          className="person-camera-video"
        />
      ) : (
        <div className="person-avatar">{label.charAt(0).toUpperCase()}</div>
      )}
      <div className="person-footer">
        <span className="person-name">{label}</span>
        {isMuted && (
          <span className="person-mic">
            <MicOff size={11} />
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ============================================================
   Tile de tela compartilhada
   layoutId compartilhado entre grade/foco/filmstrip: o Framer Motion
   anima a transição de posição/tamanho em vez de trocar abruptamente.
   ============================================================ */
function ScreenTile({ trackRef, label, isFocused, onSelect, onFullscreen, compact }) {
  const isSpeaking = useIsSpeaking(trackRef.participant);
  const sid = trackRef.publication.trackSid;

  // Ajuste de brilho é só local — nunca sai desta aba nem afeta quem
  // transmite. Serve pra compensar câmera/tela escura ou clara demais
  // do lado de quem está assistindo. Reseta se o tile desmontar.
  const [brightness, setBrightness] = useState(100);
  const [showBrightness, setShowBrightness] = useState(false);
  const isAdjusted = brightness !== 100;

  return (
    <motion.div
      layoutId={`tile-${sid}`}
      layout
      className={`screen-tile ${isFocused ? "focused" : ""} ${compact ? "compact" : ""} ${
        isSpeaking ? "speaking" : ""
      }`}
      onClick={() => onSelect(trackRef)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onFullscreen(trackRef);
      }}
      title={compact ? `Clique para ver ${label}` : "Duplo clique para tela cheia"}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ layout: { duration: 0.35, ease: "easeInOut" }, default: { duration: 0.2 } }}
      whileHover={{ scale: compact ? 1.03 : 1.005 }}
    >
      <VideoTrack
        trackRef={trackRef}
        className="screen-video"
        style={isAdjusted ? { filter: `brightness(${brightness}%)` } : undefined}
      />

      <div className="tile-bar">
        <span className="tile-name">
          <Monitor size={13} /> {label}
        </span>
        {!compact && (
          <div className="tile-bar-actions">
            <motion.button
              className={`tile-action ${isAdjusted ? "adjusted" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowBrightness((v) => !v);
              }}
              title="Ajustar brilho (só pra você)"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <SunMedium size={13} />
            </motion.button>

            <motion.button
              className="tile-action"
              onClick={(e) => {
                e.stopPropagation();
                onFullscreen(trackRef);
              }}
              title="Tela cheia"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <Maximize size={13} />
            </motion.button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showBrightness && (
          <motion.div
            className="brightness-popover"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <span className="brightness-label">Brilho (só pra você)</span>
            <input
              type="range"
              min="50"
              max="180"
              value={brightness}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setBrightness(Number(e.target.value))}
            />
            <div className="brightness-row">
              <span className="brightness-value">{brightness}%</span>
              {isAdjusted && (
                <button
                  className="brightness-reset"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBrightness(100);
                  }}
                >
                  Redefinir
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ============================================================
   Palco
   ============================================================ */
export function Stage({ screenTracks, participants, displayName }) {
  const [focusedSid, setFocusedSid] = useState(null);
  const stageRef = useRef(null);

  // Modo tela cheia "limpa": some com a barra do tile depois de alguns
  // segundos, deixando só a transmissão. Um botão flutuante mínimo
  // reabre — sem ele, todo o resto (nome, brilho, sair da tela cheia)
  // ficaria inacessível.
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setControlsHidden(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (!isFullscreen || controlsHidden) return;
    const t = setTimeout(() => setControlsHidden(true), 2500);
    return () => clearTimeout(t);
  }, [isFullscreen, controlsHidden]);

  const focused = screenTracks.find((t) => t.publication?.trackSid === focusedSid);

  // Foca automaticamente quando existe só uma transmissão.
  // Se uma segunda pessoa começa a transmitir, volta para a grade
  // para que ninguém "perca" a tela do outro sem perceber.
  useEffect(() => {
    if (screenTracks.length === 1) {
      setFocusedSid(screenTracks[0].publication.trackSid);
    } else if (focusedSid && !focused) {
      setFocusedSid(null);
    }
  }, [screenTracks, focusedSid, focused]);

  const goFullscreen = useCallback((trackRef) => {
    setFocusedSid(trackRef.publication.trackSid);
    const el = stageRef.current;
    if (!el) return;
    // Ambos os lados da API de tela cheia retornam Promise e podem
    // rejeitar (gesto do usuário expirado, navegador bloqueando, estado
    // já mudou). .catch(() => {}) evita rejeição não tratada no console
    // e, mais importante, garante que um clique duplo malsucedido nunca
    // deixa a UI presa a meio caminho.
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const handleSelect = useCallback(
    (trackRef) => {
      const sid = trackRef.publication.trackSid;
      setFocusedSid((cur) => (cur === sid ? null : sid));
    },
    []
  );

  // ESC sai do foco (o navegador já trata a saída de tela cheia)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !document.fullscreenElement) setFocusedSid(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* --- Ninguém transmitindo: mostra as pessoas --- */
  if (screenTracks.length === 0) {
    return (
      <main className="stage" ref={stageRef}>
        <div className="people-view">
          <motion.div
            layout
            className={`people-grid count-${Math.min(participants.length, 6)}`}
          >
            <AnimatePresence>
              {participants.map((p) => (
                <PersonCard
                  key={p.identity}
                  participant={p}
                  label={displayName(p)}
                  big={participants.length <= 2}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          <motion.div
            className="stage-callout"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
          >
            <span>
              <Monitor size={20} strokeWidth={1.75} />
            </span>
            <div>
              <strong>Ninguém está compartilhando a tela</strong>
              <p>
                Clique em <b>Compartilhar tela</b> na barra abaixo. Vários
                participantes podem transmitir ao mesmo tempo.
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  /* --- Uma tela em foco + miniaturas das outras --- */
  if (focused) {
    const others = screenTracks.filter((t) => t.publication.trackSid !== focusedSid);

    return (
      <main
        className={`stage focused-mode ${controlsHidden ? "controls-hidden" : ""}`}
        ref={stageRef}
      >
        <div className="focus-main">
          <ScreenTile
            trackRef={focused}
            label={displayName(focused.participant)}
            isFocused
            onSelect={handleSelect}
            onFullscreen={goFullscreen}
          />
        </div>

        {others.length > 0 && (
          <div className="filmstrip">
            <AnimatePresence>
              {others.map((t) => (
                <ScreenTile
                  key={t.publication.trackSid}
                  trackRef={t}
                  label={displayName(t.participant)}
                  compact
                  onSelect={handleSelect}
                  onFullscreen={goFullscreen}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {isFullscreen && controlsHidden && (
          <motion.button
            className="reveal-controls-btn"
            onClick={() => setControlsHidden(false)}
            title="Mostrar controles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronsUpDown size={16} />
          </motion.button>
        )}
      </main>
    );
  }

  /* --- Grade com todas as telas --- */
  return (
    <main className="stage" ref={stageRef}>
      <motion.div layout className={`screen-grid count-${Math.min(screenTracks.length, 4)}`}>
        <AnimatePresence>
          {screenTracks.map((t) => (
            <ScreenTile
              key={t.publication.trackSid}
              trackRef={t}
              label={displayName(t.participant)}
              onSelect={handleSelect}
              onFullscreen={goFullscreen}
            />
          ))}
        </AnimatePresence>
      </motion.div>
      <p className="stage-tip">
        Clique numa tela para ampliar · duplo clique para tela cheia
      </p>
    </main>
  );
}
