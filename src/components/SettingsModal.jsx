import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sun, Moon, TriangleAlert, Volume2, VolumeX } from "lucide-react";
import { useRoomContext } from "@livekit/components-react";
import { useAudioDevices, useCameraDevices } from "../hooks/useDevices";
import { QUALITY_PRESETS, DEGRADATION_MODES } from "../hooks/useStreamQuality";
import "./SettingsModal.css";

const groupVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

export function SettingsModal({
  open,
  onClose,
  quality,
  isSharing,
  theme,
  onToggleTheme,
  sfxVolume,
  onSfxVolumeChange,
}) {
  const room = useRoomContext();
  const { mics, speakers, selectedMic, selectedSpeaker, pickMic, pickSpeaker, refresh } =
    useAudioDevices();
  const { cameras, selectedCamera, pickCamera, refresh: refreshCameras } = useCameraDevices();

  useEffect(() => {
    if (open) {
      refresh();
      refreshCameras();
    }
  }, [open, refresh, refreshCameras]);

  // Fecha com ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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

  const handleCameraChange = async (deviceId) => {
    pickCamera(deviceId);
    try {
      await room.switchActiveDevice("videoinput", deviceId);
    } catch (err) {
      console.error("Erro ao trocar câmera:", err);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <motion.div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="modal-header">
              <h2>Configurações</h2>
              <motion.button
                className="modal-close"
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={16} />
              </motion.button>
            </div>

            <motion.div className="modal-body" variants={groupVariants} initial="hidden" animate="show">
              {/* Aparência */}
              <motion.div className="setting-group" variants={rowVariants}>
                <label>Aparência</label>
                <div className="mode-options">
                  <button
                    className={`mode-option ${theme === "light" ? "selected" : ""}`}
                    onClick={() => theme !== "light" && onToggleTheme()}
                  >
                    <span className="mode-label"><Sun size={14} /> Claro</span>
                    <span className="mode-hint">Fundo claro, tipo papel</span>
                  </button>
                  <button
                    className={`mode-option ${theme === "dark" ? "selected" : ""}`}
                    onClick={() => theme !== "dark" && onToggleTheme()}
                  >
                    <span className="mode-label"><Moon size={14} /> Escuro</span>
                    <span className="mode-hint">Fundo escuro e quente</span>
                  </button>
                </div>
              </motion.div>

              <div className="setting-divider" />

              {/* Sons da interface */}
              <motion.div className="setting-group" variants={rowVariants}>
                <label>Sons da interface</label>
                <div className="sfx-volume-control">
                  {sfxVolume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sfxVolume}
                    onChange={(e) => onSfxVolumeChange(Number(e.target.value))}
                  />
                  <span className="sfx-volume-value">{sfxVolume}%</span>
                </div>
                <p className="setting-hint">
                  Clique, mutar/desmutar e iniciar/parar transmissão. Sintetizado
                  localmente — nenhum arquivo é baixado.
                </p>
              </motion.div>

              <div className="setting-divider" />

              {/* Microfone */}
              <motion.div className="setting-group" variants={rowVariants}>
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
              </motion.div>

              {/* Saída de áudio */}
              <motion.div className="setting-group" variants={rowVariants}>
                <label>Saída de áudio</label>
                <select value={selectedSpeaker} onChange={(e) => handleSpeakerChange(e.target.value)}>
                  <option value="default">Padrão do sistema</option>
                  {speakers.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Saída ${d.deviceId.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              </motion.div>

              {/* Câmera */}
              <motion.div className="setting-group" variants={rowVariants}>
                <label>Câmera</label>
                <select value={selectedCamera} onChange={(e) => handleCameraChange(e.target.value)}>
                  <option value="default">Padrão do sistema</option>
                  {cameras.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Câmera ${d.deviceId.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
                {cameras.length === 0 && (
                  <p className="setting-hint">
                    Ligue a câmera uma vez para o navegador liberar a lista de dispositivos.
                  </p>
                )}
              </motion.div>

              <div className="setting-divider" />

              {/* Qualidade da transmissão */}
              <motion.div className="setting-group" variants={rowVariants}>
                <label>Qualidade da transmissão</label>
                <div className="quality-options">
                  {Object.values(QUALITY_PRESETS).map((q) => (
                    <motion.button
                      key={q.id}
                      className={`quality-option ${quality.qualityId === q.id ? "selected" : ""}`}
                      onClick={() => quality.setQuality(q.id)}
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="quality-option-head">
                        <span className="quality-label">{q.label}</span>
                        <span className="quality-detail">{q.detail}</span>
                      </div>
                      <span className="quality-hint">{q.hint}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Comportamento sob banda limitada */}
              <motion.div className="setting-group" variants={rowVariants}>
                <label>Quando a internet apertar</label>
                <div className="mode-options">
                  {Object.values(DEGRADATION_MODES).map((m) => (
                    <motion.button
                      key={m.id}
                      className={`mode-option ${quality.modeId === m.id ? "selected" : ""}`}
                      onClick={() => quality.setMode(m.id)}
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="mode-label">{m.label}</span>
                      <span className="mode-hint">{m.hint}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              <AnimatePresence>
                {isSharing && (
                  <motion.div
                    className="setting-warning"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <TriangleAlert size={15} />
                    <span>
                      Você está transmitindo agora. A nova qualidade vale a partir da
                      próxima vez que você iniciar o compartilhamento.
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="setting-divider" />

              {/* Dicas de performance */}
              <motion.div className="setting-group" variants={rowVariants}>
                <label>Dicas de performance</label>
                <ul className="perf-tips">
                  <li>Use cabo de rede em vez de Wi-Fi quando possível</li>
                  <li>Feche abas pesadas antes de transmitir</li>
                  <li>Menos telas simultâneas = menos consumo de CPU</li>
                  <li>Fones de ouvido evitam eco e microfonia</li>
                </ul>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
