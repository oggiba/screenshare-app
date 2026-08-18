import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export function Home({ onJoin }) {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [mode, setMode] = useState("create"); // "create" | "join"
  const [warning, setWarning] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) return;
    if (!warning) { setWarning(true); return; }
    const newRoom = uuidv4().slice(0, 8);
    onJoin(newRoom, name.trim());
  };

  const handleJoin = () => {
    if (!name.trim() || !roomId.trim()) return;
    if (!warning) { setWarning(true); return; }
    onJoin(roomId.trim(), name.trim());
  };

  return (
    <div className="home-container">
      <div className="home-card">
        {/* Logo / título */}
        <div className="home-logo">
          <span className="logo-icon">⬡</span>
          <h1>ShareRoom</h1>
          <p className="home-subtitle">Compartilhamento de tela em tempo real, sem complicação.</p>
        </div>

        {/* Aviso de segurança — sempre visível */}
        <div className="security-notice">
          <span className="notice-icon">🔒</span>
          <div>
            <strong>Use apenas com pessoas conhecidas</strong>
            <p>
              Nunca entre em salas de estranhos. Os IDs de sala devem ser
              compartilhados <em>somente</em> com amigos e pessoas de confiança.
              Ao entrar em uma sala, você pode ver e ser visto por todos os participantes.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-row">
          <button
            className={`tab-btn ${mode === "create" ? "active" : ""}`}
            onClick={() => { setMode("create"); setWarning(false); }}
          >
            Criar sala
          </button>
          <button
            className={`tab-btn ${mode === "join" ? "active" : ""}`}
            onClick={() => { setMode("join"); setWarning(false); }}
          >
            Entrar em sala
          </button>
        </div>

        {/* Formulário */}
        <div className="form-group">
          <label>Seu nome</label>
          <input
            type="text"
            maxLength={32}
            placeholder="Como seus amigos te conhecem"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (mode === "create" ? handleCreate() : handleJoin())}
          />
        </div>

        {mode === "join" && (
          <div className="form-group">
            <label>ID da sala</label>
            <input
              type="text"
              maxLength={64}
              placeholder="Cole o ID recebido do seu amigo"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </div>
        )}

        {/* Confirmação de ciência antes de entrar */}
        {warning && (
          <div className="warning-confirm">
            <span>⚠️</span>
            <div>
              <strong>Confirme antes de continuar</strong>
              <p>
                Você confirma que está entrando em uma sala <strong>com pessoas que conhece</strong> e que recebeu
                este ID diretamente de um amigo?
              </p>
            </div>
          </div>
        )}

        <button
          className={`primary-btn ${warning ? "confirm-mode" : ""}`}
          onClick={mode === "create" ? handleCreate : handleJoin}
          disabled={!name.trim() || (mode === "join" && !roomId.trim())}
        >
          {warning
            ? "✓ Sim, confirmo — entrar agora"
            : mode === "create"
            ? "Criar sala"
            : "Entrar na sala"}
        </button>

        <p className="home-footer">
          Projeto pessoal e privado · Sem coleta de dados · Código-fonte no GitHub
        </p>
      </div>
    </div>
  );
}
