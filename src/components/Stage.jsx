import { useState, useRef, useEffect, useCallback } from "react";
import { VideoTrack, useIsSpeaking } from "@livekit/components-react";
import { Track } from "livekit-client";

/* ============================================================
   Card de participante — mostrado quando ninguém compartilha,
   igual à visão de canal de voz do Discord.
   ============================================================ */
function PersonCard({ participant, label, big }) {
  const isSpeaking = useIsSpeaking(participant);
  const micPub = participant.getTrackPublication(Track.Source.Microphone);
  const isMuted = !micPub || micPub.isMuted;

  return (
    <div className={`person-card ${isSpeaking ? "speaking" : ""} ${big ? "big" : ""}`}>
      <div className="person-avatar">{label.charAt(0).toUpperCase()}</div>
      <div className="person-footer">
        <span className="person-name">{label}</span>
        {isMuted && <span className="person-mic">🔇</span>}
      </div>
    </div>
  );
}

/* ============================================================
   Tile de tela compartilhada
   ============================================================ */
function ScreenTile({ trackRef, label, isFocused, onSelect, onFullscreen, compact }) {
  const isSpeaking = useIsSpeaking(trackRef.participant);

  return (
    <div
      className={`screen-tile ${isFocused ? "focused" : ""} ${compact ? "compact" : ""} ${
        isSpeaking ? "speaking" : ""
      }`}
      onClick={() => onSelect(trackRef)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onFullscreen(trackRef);
      }}
      title={compact ? `Clique para ver ${label}` : "Duplo clique para tela cheia"}
    >
      <VideoTrack trackRef={trackRef} className="screen-video" />

      <div className="tile-bar">
        <span className="tile-name">🖥️ {label}</span>
        {!compact && (
          <button
            className="tile-action"
            onClick={(e) => {
              e.stopPropagation();
              onFullscreen(trackRef);
            }}
            title="Tela cheia"
          >
            ⛶
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Palco
   ============================================================ */
export function Stage({ screenTracks, participants, displayName }) {
  const [focusedSid, setFocusedSid] = useState(null);
  const stageRef = useRef(null);

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
          <div className={`people-grid count-${Math.min(participants.length, 6)}`}>
            {participants.map((p) => (
              <PersonCard
                key={p.identity}
                participant={p}
                label={displayName(p)}
                big={participants.length <= 2}
              />
            ))}
          </div>

          <div className="stage-callout">
            <span>🖥️</span>
            <div>
              <strong>Ninguém está compartilhando a tela</strong>
              <p>
                Clique em <b>Compartilhar tela</b> na barra abaixo. Vários
                participantes podem transmitir ao mesmo tempo.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* --- Uma tela em foco + miniaturas das outras --- */
  if (focused) {
    const others = screenTracks.filter((t) => t.publication.trackSid !== focusedSid);

    return (
      <main className="stage focused-mode" ref={stageRef}>
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
          </div>
        )}
      </main>
    );
  }

  /* --- Grade com todas as telas --- */
  return (
    <main className="stage" ref={stageRef}>
      <div className={`screen-grid count-${Math.min(screenTracks.length, 4)}`}>
        {screenTracks.map((t) => (
          <ScreenTile
            key={t.publication.trackSid}
            trackRef={t}
            label={displayName(t.participant)}
            onSelect={handleSelect}
            onFullscreen={goFullscreen}
          />
        ))}
      </div>
      <p className="stage-tip">
        Clique numa tela para ampliar · duplo clique para tela cheia
      </p>
    </main>
  );
}
