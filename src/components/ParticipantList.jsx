import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useParticipants,
  useLocalParticipant,
  useIsSpeaking,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { ErrorBoundary } from "./ErrorBoundary";
import "./ParticipantList.css";

function RowFallback({ name }) {
  return (
    <div className="participant-row">
      <div className="participant-main">
        <div className="avatar">?</div>
        <span className="participant-name">{name || "Participante"}</span>
      </div>
    </div>
  );
}

function ParticipantRow({
  participant,
  isLocal,
  volume,
  onVolumeChange,
  nickname,
  onNicknameChange,
  displayName,
  previousName,
  isKnown,
}) {
  const isSpeaking = useIsSpeaking(participant);
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(nickname || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  const micPub = participant.getTrackPublication(Track.Source.Microphone);
  const isMuted = !micPub || micPub.isMuted;
  const isSharing = participant.isScreenShareEnabled;
  const isSilenced = volume === 0;

  const commitRename = () => {
    onNicknameChange(participant.identity, draft);
    setRenaming(false);
  };

  return (
    <motion.div
      className={`participant-row ${isSpeaking ? "speaking" : ""}`}
      layout
      initial={{ opacity: 0, x: -14, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, x: 14, height: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div
        className="participant-main"
        onClick={() => !isLocal && !renaming && setExpanded(!expanded)}
      >
        <motion.div
          className={`avatar ${isSpeaking ? "pulse" : ""}`}
          animate={isSpeaking ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={{ duration: 0.6, repeat: isSpeaking ? Infinity : 0, ease: "easeInOut" }}
        >
          {displayName.charAt(0).toUpperCase()}
        </motion.div>

        <div className="participant-info">
          {renaming ? (
            <input
              ref={inputRef}
              className="nickname-input"
              maxLength={24}
              value={draft}
              placeholder={participant.name || "Apelido"}
              onChange={(e) => setDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setDraft(nickname || ""); setRenaming(false); }
              }}
              onBlur={commitRename}
            />
          ) : (
            <span className="participant-name">
              {displayName}
              {isLocal && <span className="you-badge">você</span>}
              {nickname && !isLocal && (
                <span className="nick-badge" title={`Nome real: ${participant.name}`}>
                  apelido
                </span>
              )}
            </span>
          )}

          <div className="participant-status">
            {previousName && !nickname && (
              <span className="status-chip known" title="Mesmo dispositivo, nome diferente">
                antes: {previousName}
              </span>
            )}
            {isSharing && <span className="status-chip sharing">🖥️ transmitindo</span>}
            {isSilenced && !isLocal && <span className="status-chip silenced">silenciado</span>}
          </div>
        </div>

        <div className="participant-icons">
          {isMuted ? (
            <span className="mic-icon muted" title="Microfone desligado">🔇</span>
          ) : (
            <span className="mic-icon on" title="Microfone ligado">🎙️</span>
          )}
        </div>
      </div>

      {/* Controles individuais — só para outros participantes */}
      <AnimatePresence>
        {expanded && !isLocal && (
          <motion.div
            className="row-controls"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="volume-control">
              <span className="volume-label">Volume</span>
              <input
                type="range"
                min="0"
                max="200"
                value={volume}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onVolumeChange(participant.identity, Number(e.target.value))}
              />
              <span className="volume-value">{volume}%</span>
            </div>

            <button
              className="rename-btn"
              onClick={(e) => {
                e.stopPropagation();
                setDraft(nickname || "");
                setRenaming(true);
              }}
            >
              ✏️ {nickname ? "Editar apelido" : "Dar um apelido"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ParticipantList({
  volumes,
  onVolumeChange,
  nicknames,
  onNicknameChange,
  getDisplayName,
  getPreviousName,
  getIsKnown,
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  return (
    <aside className="participant-sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Na sala</span>
        <span className="participant-count">{participants.length}</span>
      </div>

      <div className="participant-scroll">
        <AnimatePresence initial={false}>
          {participants.map((p) => (
            // Cada linha isolada numa fronteira própria: se algo quebrar
            // ao renderizar UM participante específico, o resto da lista
            // (e a sala inteira) continua de pé.
            <ErrorBoundary key={p.identity} fallback={<RowFallback name={p.identity} />}>
              <ParticipantRow
                participant={p}
                isLocal={p.identity === localParticipant.identity}
                volume={volumes[p.identity] ?? 100}
                onVolumeChange={onVolumeChange}
                nickname={nicknames[p.identity]}
                onNicknameChange={onNicknameChange}
                displayName={getDisplayName(p)}
                previousName={getPreviousName(p)}
                isKnown={getIsKnown(p)}
              />
            </ErrorBoundary>
          ))}
        </AnimatePresence>
      </div>

      <div className="sidebar-footer">
        <p className="sidebar-hint">
          Clique em alguém para ajustar o volume ou dar um apelido. Apelidos são
          privados — só você os vê.
        </p>
      </div>
    </aside>
  );
}
