import { useEffect, useRef, useState } from "react";
import { useToken } from "../hooks/useToken";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  ControlBar,
  useRoomContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

// Componente interno — acessa contexto da sala
function RoomContent({ roomId, onLeave }) {
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  const screenshares = tracks.filter((t) => t.source === Track.Source.ScreenShare);
  const cameras = tracks.filter((t) => t.source !== Track.Source.ScreenShare);

  return (
    <div className="room-layout">
      {/* Header */}
      <div className="room-header">
        <div className="room-id-display">
          <span className="room-label">Sala:</span>
          <code className="room-id-code">{roomId}</code>
          <button
            className="copy-btn"
            onClick={() => {
              navigator.clipboard.writeText(roomId);
            }}
            title="Copiar ID da sala"
          >
            📋 Copiar ID
          </button>
        </div>
        <div className="room-warning-pill">
          🔒 Compartilhe este ID somente com amigos de confiança
        </div>
        <button className="leave-btn" onClick={onLeave}>
          Sair da sala
        </button>
      </div>

      {/* Área principal de vídeo */}
      <div className="video-area">
        {screenshares.length === 0 && cameras.length === 0 && (
          <div className="empty-room">
            <span>🖥️</span>
            <p>Nenhuma tela sendo compartilhada ainda.</p>
            <p className="empty-hint">
              Clique em <strong>Compartilhar tela</strong> na barra abaixo para começar.
            </p>
          </div>
        )}

        {/* Screenshares em destaque */}
        {screenshares.length > 0 && (
          <div className={`screenshare-grid count-${Math.min(screenshares.length, 4)}`}>
            {screenshares.map((track) => (
              <ParticipantTile
                key={track.participant.identity + track.source}
                trackRef={track}
                className="screenshare-tile"
              />
            ))}
          </div>
        )}

        {/* Câmeras menores embaixo */}
        {cameras.length > 0 && (
          <div className="camera-strip">
            {cameras.map((track) => (
              <ParticipantTile
                key={track.participant.identity + track.source}
                trackRef={track}
                className="camera-tile"
              />
            ))}
          </div>
        )}
      </div>

      {/* Áudio de todos os participantes */}
      <RoomAudioRenderer />

      {/* Barra de controle nativa do LiveKit */}
      <div className="control-bar-wrapper">
        <ControlBar
          controls={{
            microphone: true,
            camera: false,        // Foco em screenshare
            screenShare: true,
            leave: false,         // Usamos nosso próprio botão
          }}
        />
      </div>
    </div>
  );
}

// Componente pai — gerencia token e conexão
export function Room({ roomId, participantName, onLeave }) {
  const { token, loading, error, fetchToken } = useToken();
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!fetched) {
      setFetched(true);
      fetchToken(roomId, participantName);
    }
  }, []);

  if (!LIVEKIT_URL) {
    return (
      <div className="error-screen">
        <h2>⚙️ Configuração incompleta</h2>
        <p>
          A variável <code>VITE_LIVEKIT_URL</code> não está definida.
          <br />
          Veja o README para instruções de configuração.
        </p>
        <button onClick={onLeave}>Voltar</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Conectando à sala…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>❌ Erro ao conectar</h2>
        <p>{error}</p>
        <button onClick={onLeave}>Voltar</button>
      </div>
    );
  }

  if (!token) return null;

  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={LIVEKIT_URL}
      data-lk-theme="default"
      onDisconnected={onLeave}
      style={{ height: "100vh" }}
    >
      <RoomContent roomId={roomId} onLeave={onLeave} />
    </LiveKitRoom>
  );
}
