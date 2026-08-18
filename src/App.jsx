import { useState, useEffect } from "react";
import { Home } from "./pages/Home";
import { Room } from "./pages/Room";
import "./App.css";

/** Sanitiza o ID vindo da URL */
function cleanRoomId(raw) {
  if (!raw) return null;
  const clean = raw.replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 64);
  return clean || null;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [invitedRoom, setInvitedRoom] = useState(null);

  // Lê ?room= da URL na primeira carga
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInvitedRoom(cleanRoomId(params.get("room")));
  }, []);

  const handleJoin = (roomId, participantName) => {
    setSession({ roomId, participantName });
    // Mantém o link compartilhável na barra de endereço
    window.history.replaceState({}, "", `?room=${roomId}`);
  };

  const handleLeave = () => {
    setSession(null);
    setInvitedRoom(null);
    window.history.replaceState({}, "", "/");
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

  return <Home onJoin={handleJoin} invitedRoom={invitedRoom} />;
}
