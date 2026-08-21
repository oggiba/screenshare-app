import { useState, useEffect } from "react";
import { Home } from "./pages/Home";
import { Room } from "./pages/Room";
import { ErrorBoundary } from "./components/ErrorBoundary";

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

  // Fronteira de nível raiz: cobre também a tela inicial (Home).
  // Room já tem sua própria fronteira interna, mais específica.
  return (
    <ErrorBoundary onReset={handleLeave}>
      {session ? (
        <Room
          roomId={session.roomId}
          participantName={session.participantName}
          onLeave={handleLeave}
        />
      ) : (
        <Home onJoin={handleJoin} invitedRoom={invitedRoom} />
      )}
    </ErrorBoundary>
  );
}
