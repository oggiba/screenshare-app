import { useState, useEffect } from "react";
import { Home } from "./pages/Home";
import { Room } from "./pages/Room";
import "./App.css";

export default function App() {
  const [session, setSession] = useState(null); // { roomId, participantName }

  // Suporte a link direto: shareroom.netlify.app/?room=abc123
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");
    if (roomFromUrl) {
      // Salva o roomId para pré-preencher no formulário
      window.__pendingRoom = roomFromUrl.replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 64);
    }
  }, []);

  const handleJoin = (roomId, participantName) => {
    setSession({ roomId, participantName });
    // Atualiza a URL para facilitar compartilhamento
    window.history.pushState({}, "", `?room=${roomId}`);
  };

  const handleLeave = () => {
    setSession(null);
    window.history.pushState({}, "", "/");
  };

  if (session) {
    return (
      <Room
        roomId={session.roomId}
        participantName={session.participantName}
        onLeave={handleLeave}
      />
    );
  }

  return <Home onJoin={handleJoin} />;
}
