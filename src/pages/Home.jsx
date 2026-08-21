import { useState, useEffect } from "react";
import "./Home.css";

/** Gera ID curto e legível — evita caracteres ambíguos (0/O, 1/l/I) */
function generateRoomId() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 9; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
    if (i === 2 || i === 5) id += "-"; // formato: abc-def-ghi
  }
  return id;
}

export function Home({ onJoin, invitedRoom }) {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("sr_name") || "";
    } catch {
      return ""; // storage bloqueado — segue sem nome pré-preenchido
    }
  });
  const [confirmed, setConfirmed] = useState(false);

  // Modo convite: chegou por link com ?room=
  const isInvite = Boolean(invitedRoom);

  useEffect(() => {
    if (!name) return;
    try {
      localStorage.setItem("sr_name", name);
    } catch {
      /* storage bloqueado — nome não fica salvo entre visitas, tudo bem */
    }
  }, [name]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    const room = invitedRoom || generateRoomId();
    onJoin(room, name.trim());
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <div className="home-logo">
          <span className="logo-icon">⬡</span>
          <h1>Kindling</h1>
          <p className="home-subtitle">
            {isInvite
              ? "Você foi convidado para uma sala"
              : "Compartilhe sua tela com seus amigos"}
          </p>
        </div>

        {/* Se veio por convite, mostra a sala */}
        {isInvite && (
          <div className="invite-banner">
            <span className="invite-icon">🎟️</span>
            <div>
              <strong>Sala</strong>
              <code>{invitedRoom}</code>
            </div>
          </div>
        )}

        {/* Aviso de segurança */}
        <div className="security-notice">
          <span className="notice-icon">🔒</span>
          <div>
            <strong>Entre apenas em salas de amigos</strong>
            <p>
              Qualquer pessoa com o link pode entrar e ver o que for transmitido.
              Nunca abra links de sala vindos de desconhecidos, e feche janelas com
              informações sensíveis antes de compartilhar sua tela.
            </p>
          </div>
        </div>

        {/* Nome */}
        <div className="form-group">
          <label>Seu nome</label>
          <input
            type="text"
            maxLength={24}
            placeholder="Como seus amigos te chamam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </div>

        {/* Confirmação */}
        {confirmed && (
          <div className="warning-confirm">
            <span>⚠️</span>
            <div>
              <strong>Confirme antes de entrar</strong>
              <p>
                {isInvite
                  ? "Você recebeu este link diretamente de alguém que conhece?"
                  : "Você vai compartilhar o link apenas com pessoas de confiança?"}
              </p>
            </div>
          </div>
        )}

        <button
          className={`primary-btn ${confirmed ? "confirm-mode" : ""}`}
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          {confirmed
            ? "✓ Confirmo — entrar agora"
            : isInvite
            ? "Entrar na sala"
            : "Criar sala e gerar link"}
        </button>

        <p className="home-footer">
          Projeto pessoal e privado · Nada é gravado ou armazenado
        </p>
      </div>
    </div>
  );
}
