import { useState, useEffect, Suspense, lazy } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const Room = lazy(() => import("./pages/Room").then((m) => ({ default: m.Room })));

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
      <Suspense fallback={<div className="route-loading">Carregando…</div>}>
        {session ? (
          <Room
            roomId={session.roomId}
            participantName={session.participantName}
            onLeave={handleLeave}
          />
        ) : (
          <Home onJoin={handleJoin} invitedRoom={invitedRoom} />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
