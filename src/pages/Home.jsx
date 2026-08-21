import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut", staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

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
      <div className="ember-field" aria-hidden="true">
        <span className="ember" />
        <span className="ember" />
        <span className="ember" />
        <span className="ember" />
        <span className="ember" />
      </div>

      <motion.div className="home-card" variants={cardVariants} initial="hidden" animate="show">
        <motion.div className="home-logo" variants={itemVariants}>
          <motion.span
            className="logo-icon"
            initial={{ scale: 0.6, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
          >
            🕯️
          </motion.span>
          <h1>Kindling</h1>
          <p className="home-subtitle">
            {isInvite
              ? "Você foi convidado para uma sala"
              : "Compartilhe sua tela com seus amigos"}
          </p>
        </motion.div>

        {/* Se veio por convite, mostra a sala */}
        {isInvite && (
          <motion.div className="invite-banner" variants={itemVariants}>
            <span className="invite-icon">🎟️</span>
            <div>
              <strong>Sala</strong>
              <code>{invitedRoom}</code>
            </div>
          </motion.div>
        )}

        {/* Aviso de segurança */}
        <motion.div className="security-notice" variants={itemVariants}>
          <span className="notice-icon">🔒</span>
          <div>
            <strong>Entre apenas em salas de amigos</strong>
            <p>
              Qualquer pessoa com o link pode entrar e ver o que for transmitido.
              Nunca abra links de sala vindos de desconhecidos, e feche janelas com
              informações sensíveis antes de compartilhar sua tela.
            </p>
          </div>
        </motion.div>

        {/* Nome */}
        <motion.div className="form-group" variants={itemVariants}>
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
        </motion.div>

        {/* Confirmação */}
        <AnimatePresence>
          {confirmed && (
            <motion.div
              className="warning-confirm"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <span>⚠️</span>
              <div>
                <strong>Confirme antes de entrar</strong>
                <p>
                  {isInvite
                    ? "Você recebeu este link diretamente de alguém que conhece?"
                    : "Você vai compartilhar o link apenas com pessoas de confiança?"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          className={`primary-btn ${confirmed ? "confirm-mode" : ""}`}
          onClick={handleSubmit}
          disabled={!name.trim()}
          variants={itemVariants}
          whileHover={name.trim() ? { scale: 1.02 } : undefined}
          whileTap={name.trim() ? { scale: 0.97 } : undefined}
        >
          {confirmed
            ? "✓ Confirmo — entrar agora"
            : isInvite
            ? "Entrar na sala"
            : "Criar sala e gerar link"}
        </motion.button>

        <motion.p className="home-footer" variants={itemVariants}>
          Projeto pessoal e privado · Nada é gravado ou armazenado
        </motion.p>
      </motion.div>
    </div>
  );
}
