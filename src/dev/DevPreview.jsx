import { useState, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoomContext } from "@livekit/components-react";
import {
  Flame,
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
  Monitor,
  Maximize,
  SunMedium,
  ChevronsUpDown,
  Pencil,
  X,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { FlameLoader } from "../components/FlameLoader";
import { MOCK_PARTICIPANTS } from "./mockData";
import "../pages/Room.css";
import "../components/Stage.css";
import "../components/ControlDock.css";
import "../components/ParticipantList.css";
import "./DevPreview.css";

const SettingsModal = lazy(() =>
  import("../components/SettingsModal").then((m) => ({ default: m.SettingsModal }))
);

// SettingsModal só precisa de switchActiveDevice() do RoomContext real —
// esse stub basta pra ela renderizar fora de uma sala LiveKit de verdade.
const fakeRoom = { switchActiveDevice: async () => {} };

/**
 * Página só de desenvolvimento (?dev=1) — nunca aparece no fluxo normal.
 * Espelha visualmente Stage/ControlDock/ParticipantList com dados falsos,
 * sem depender de uma conexão LiveKit real (que este ambiente não tem
 * credenciais para abrir). Único objetivo: pegar bugs visuais/responsivos
 * antes do QA humano numa sala de verdade.
 */
export function DevPreview() {
  const { theme, toggleTheme } = useTheme();
  const { sounds, volume: sfxVolume, setVolume: setSfxVolume } = useSoundEffects();

  const [stageView, setStageView] = useState("grid"); // empty | focused | grid
  const [participants, setParticipants] = useState(MOCK_PARTICIPANTS);
  const [micOn, setMicOn] = useState(true);
  const [deafened, setDeafened] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [busy] = useState(false);
  const [shareError, setShareError] = useState(null);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [showBrightness, setShowBrightness] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [volumes, setVolumes] = useState({});
  const [expandedRow, setExpandedRow] = useState(null);

  const toggleParticipant = (identity, field) => {
    setParticipants((prev) =>
      prev.map((p) => (p.identity === identity ? { ...p, [field]: !p[field] } : p))
    );
  };

  const simulateUnsupportedShare = () => {
    sounds.click();
    setShareError("Este navegador não permite compartilhar tela. Tente o Chrome no computador, ou no Android use o Chrome mais recente.");
    setTimeout(() => setShareError(null), 5000);
  };

  return (
    <div className="dev-preview" data-theme={theme}>
      <div className="dev-panel">
        <strong>DevPreview — só bugs visuais</strong>
        <div className="dev-panel-row">
          <span>Tema</span>
          <button onClick={toggleTheme}>{theme === "dark" ? "escuro" : "claro"}</button>
        </div>
        <div className="dev-panel-row">
          <span>Palco</span>
          <button onClick={() => setStageView("empty")} className={stageView === "empty" ? "active" : ""}>ninguém</button>
          <button onClick={() => setStageView("focused")} className={stageView === "focused" ? "active" : ""}>foco</button>
          <button onClick={() => setStageView("grid")} className={stageView === "grid" ? "active" : ""}>grade</button>
        </div>
        <div className="dev-panel-row">
          <span>Falando</span>
          <button onClick={() => toggleParticipant("dev-ana", "speaking")}>toggle Ana</button>
        </div>
        <div className="dev-panel-row">
          <span>Fullscreen limpo</span>
          <button onClick={() => setControlsHidden((v) => !v)}>{controlsHidden ? "mostrar" : "esconder"} controles</button>
        </div>
        <div className="dev-panel-row">
          <span>Erro de share</span>
          <button onClick={simulateUnsupportedShare}>simular não suportado</button>
        </div>
        <div className="dev-panel-row">
          <span>Settings modal</span>
          <button onClick={() => setSettingsOpen(true)}>abrir</button>
        </div>
        <div className="dev-panel-row">
          <span>Flame loader</span>
          <FlameLoader size={22} />
        </div>
      </div>

      <div className="dev-stage-frame">
        <main className={`stage ${controlsHidden ? "controls-hidden" : ""}`}>
          {stageView === "empty" && (
            <div className="people-view">
              <div className={`people-grid count-${Math.min(participants.length, 6)}`}>
                {participants.map((p) => (
                  <div key={p.identity} className={`person-card ${p.speaking ? "speaking" : ""} ${participants.length <= 2 ? "big" : ""}`}>
                    <div className="person-avatar">{p.name.charAt(0).toUpperCase()}</div>
                    <div className="person-footer">
                      <span className="person-name">{p.name}</span>
                      {p.muted && <span className="person-mic"><MicOff size={11} /></span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="stage-callout">
                <span><Monitor size={20} strokeWidth={1.75} /></span>
                <div>
                  <strong>Ninguém está compartilhando a tela</strong>
                  <p>Clique em <b>Compartilhar tela</b> na barra abaixo.</p>
                </div>
              </div>
            </div>
          )}

          {stageView !== "empty" && (
            <div className={stageView === "focused" ? "focus-main" : `screen-grid count-${Math.min(participants.length, 4)}`}>
              {(stageView === "focused" ? [participants[1]] : participants).map((p) => (
                <div key={p.identity} className={`screen-tile ${stageView === "focused" ? "focused" : ""} ${p.speaking ? "speaking" : ""}`}>
                  <div className="screen-video" style={{ background: "linear-gradient(135deg, #333, #111)", filter: showBrightness ? `brightness(${brightness}%)` : undefined }} />
                  <div className="tile-bar">
                    <span className="tile-name"><Monitor size={13} /> {p.name}</span>
                    <div className="tile-bar-actions">
                      <button className={`tile-action ${brightness !== 100 ? "adjusted" : ""}`} onClick={() => setShowBrightness((v) => !v)}>
                        <SunMedium size={13} />
                      </button>
                      <button className="tile-action"><Maximize size={13} /></button>
                    </div>
                  </div>
                  {showBrightness && (
                    <div className="brightness-popover">
                      <span className="brightness-label">Brilho (só pra você)</span>
                      <input type="range" min="50" max="180" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} />
                      <div className="brightness-row">
                        <span className="brightness-value">{brightness}%</span>
                        {brightness !== 100 && <button className="brightness-reset" onClick={() => setBrightness(100)}>Redefinir</button>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {controlsHidden && (
            <button className="reveal-controls-btn" onClick={() => setControlsHidden(false)}>
              <ChevronsUpDown size={16} />
            </button>
          )}
        </main>

        <aside className="participant-sidebar dev-sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">Na sala</span>
            <div className="sidebar-header-right">
              <span className="participant-count">{participants.length}</span>
            </div>
          </div>
          <div className="participant-scroll">
            {participants.map((p) => (
              <div key={p.identity} className={`participant-row ${p.speaking ? "speaking" : ""}`}>
                <div className="participant-main" onClick={() => !p.isLocal && setExpandedRow(expandedRow === p.identity ? null : p.identity)}>
                  <div className={`avatar ${p.speaking ? "pulse" : ""}`}>{p.name.charAt(0).toUpperCase()}</div>
                  <div className="participant-info">
                    <span className="participant-name">
                      {p.name}
                      {p.isLocal && <span className="you-badge">você</span>}
                    </span>
                    <div className="participant-status">
                      {p.sharing && <span className="status-chip sharing"><MonitorUp size={11} /> transmitindo</span>}
                    </div>
                  </div>
                  <div className="participant-icons">
                    <span className={`mic-icon ${p.muted ? "muted" : ""}`}>{p.muted ? <MicOff size={15} /> : <Mic size={15} />}</span>
                  </div>
                </div>
                {expandedRow === p.identity && !p.isLocal && (
                  <div className="row-controls">
                    <div className="volume-control">
                      <span className="volume-label">Volume</span>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={volumes[p.identity] ?? 100}
                        onChange={(e) => setVolumes((v) => ({ ...v, [p.identity]: Number(e.target.value) }))}
                      />
                      <span className="volume-value">{volumes[p.identity] ?? 100}%</span>
                    </div>
                    <button className="rename-btn"><Pencil size={13} /> Dar um apelido</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="sidebar-footer">
            <p className="sidebar-hint">Clique em alguém para ajustar o volume ou dar um apelido.</p>
          </div>
        </aside>
      </div>

      <div className="control-dock">
        <div className="quality-pip q-good">
          <span className="q-dot" />
          <span className="q-text">32ms</span>
        </div>
        <div className="usage-pip">↓ 128 MB</div>
        <div className="stream-quality-tag">720p · 30fps</div>

        <div className="dock-buttons">
          <button className={`dock-btn ${micOn ? "active" : "off"}`} onClick={() => { setMicOn((v) => !v); micOn ? sounds.mute() : sounds.unmute(); }} disabled={busy}>
            {micOn ? <Mic size={16} /> : <MicOff size={16} />}
            <span>{micOn ? "Mic ligado" : "Mic mudo"}</span>
          </button>
          <button className={`dock-btn ${deafened ? "off" : "active"}`} onClick={() => { setDeafened((v) => !v); deafened ? sounds.unmute() : sounds.mute(); }}>
            {deafened ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{deafened ? "Áudio mudo" : "Áudio ligado"}</span>
          </button>
          <div className="dock-btn-wrap">
            <button
              className={`dock-btn screen ${screenOn ? "sharing" : ""}`}
              onClick={() => { setScreenOn((v) => !v); screenOn ? sounds.shareStop() : sounds.shareStart(); }}
            >
              {screenOn ? <Square size={15} /> : <MonitorUp size={16} />}
              <span>{screenOn ? "Parar transmissão" : "Compartilhar tela"}</span>
            </button>
            <AnimatePresence>
              {shareError && (
                <motion.div className="dock-toast" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
                  {shareError}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="dock-btn subtle" onClick={() => { sounds.click(); toggleTheme(); }}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="dock-btn subtle" onClick={() => { sounds.click(); setSettingsOpen(true); }}>
            <SettingsIcon size={16} />
          </button>
          <button className="dock-btn danger" onClick={() => sounds.click()}>
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </div>

      <RoomContext.Provider value={fakeRoom}>
        <Suspense fallback={<div className="route-loading"><FlameLoader size={24} /></div>}>
          <SettingsModal
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            quality={{
              qualityId: "standard",
              modeId: "motion",
              setQuality: () => {},
              setMode: () => {},
              current: { hint: "Mesmo padrão do Discord", detail: "720p · 30fps · 2 Mbps" },
            }}
            isSharing={screenOn}
            theme={theme}
            onToggleTheme={toggleTheme}
            sfxVolume={sfxVolume}
            onSfxVolumeChange={setSfxVolume}
          />
        </Suspense>
      </RoomContext.Provider>
    </div>
  );
}
