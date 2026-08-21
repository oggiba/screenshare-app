import { useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { useAudioDevices } from "../hooks/useDevices";
import { QUALITY_PRESETS, DEGRADATION_MODES } from "../hooks/useStreamQuality";

export function SettingsModal({ open, onClose, quality, isSharing, theme, onToggleTheme }) {
  const room = useRoomContext();
  const { mics, speakers, selectedMic, selectedSpeaker, pickMic, pickSpeaker, refresh } =
    useAudioDevices();

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  // Fecha com ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleMicChange = async (deviceId) => {
    pickMic(deviceId);
    try {
      await room.switchActiveDevice("audioinput", deviceId);
    } catch (err) {
      console.error("Erro ao trocar microfone:", err);
    }
  };

  const handleSpeakerChange = async (deviceId) => {
    pickSpeaker(deviceId);
    try {
      await room.switchActiveDevice("audiooutput", deviceId);
    } catch (err) {
      console.error("Erro ao trocar saída de áudio:", err);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configurações</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Aparência */}
          <div className="setting-group">
            <label>Aparência</label>
            <div className="mode-options">
              <button
                className={`mode-option ${theme === "light" ? "selected" : ""}`}
                onClick={() => theme !== "light" && onToggleTheme()}
              >
                <span className="mode-label">☀️ Claro</span>
                <span className="mode-hint">Fundo claro, tipo papel</span>
              </button>
              <button
                className={`mode-option ${theme === "dark" ? "selected" : ""}`}
                onClick={() => theme !== "dark" && onToggleTheme()}
              >
                <span className="mode-label">🌙 Escuro</span>
                <span className="mode-hint">Fundo escuro e quente</span>
              </button>
            </div>
          </div>

          <div className="setting-divider" />

          {/* Microfone */}
          <div className="setting-group">
            <label>Microfone</label>
            <select value={selectedMic} onChange={(e) => handleMicChange(e.target.value)}>
              <option value="default">Padrão do sistema</option>
              {mics.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microfone ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
            {mics.length === 0 && (
              <p className="setting-hint">
                Ligue o microfone uma vez para o navegador liberar a lista de dispositivos.
              </p>
            )}
          </div>

          {/* Saída de áudio */}
          <div className="setting-group">
            <label>Saída de áudio</label>
            <select value={selectedSpeaker} onChange={(e) => handleSpeakerChange(e.target.value)}>
              <option value="default">Padrão do sistema</option>
              {speakers.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Saída ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-divider" />

          {/* Qualidade da transmissão */}
          <div className="setting-group">
            <label>Qualidade da transmissão</label>
            <div className="quality-options">
              {Object.values(QUALITY_PRESETS).map((q) => (
                <button
                  key={q.id}
                  className={`quality-option ${quality.qualityId === q.id ? "selected" : ""}`}
                  onClick={() => quality.setQuality(q.id)}
                >
                  <div className="quality-option-head">
                    <span className="quality-label">{q.label}</span>
                    <span className="quality-detail">{q.detail}</span>
                  </div>
                  <span className="quality-hint">{q.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Comportamento sob banda limitada */}
          <div className="setting-group">
            <label>Quando a internet apertar</label>
            <div className="mode-options">
              {Object.values(DEGRADATION_MODES).map((m) => (
                <button
                  key={m.id}
                  className={`mode-option ${quality.modeId === m.id ? "selected" : ""}`}
                  onClick={() => quality.setMode(m.id)}
                >
                  <span className="mode-label">{m.label}</span>
                  <span className="mode-hint">{m.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {isSharing && (
            <div className="setting-warning">
              ⚠️ Você está transmitindo agora. A nova qualidade vale a partir da
              próxima vez que você iniciar o compartilhamento.
            </div>
          )}

          <div className="setting-divider" />

          {/* Dicas de performance */}
          <div className="setting-group">
            <label>Dicas de performance</label>
            <ul className="perf-tips">
              <li>Use cabo de rede em vez de Wi-Fi quando possível</li>
              <li>Feche abas pesadas antes de transmitir</li>
              <li>Menos telas simultâneas = menos consumo de CPU</li>
              <li>Fones de ouvido evitam eco e microfonia</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
