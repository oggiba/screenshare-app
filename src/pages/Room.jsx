import { useEffect, useState, useCallback, useMemo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
  useParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useToken } from "../hooks/useToken";
import { usePersistedVolumes, useNicknames, useKnownNames } from "../hooks/useFriendPrefs";
import { useStreamQuality } from "../hooks/useStreamQuality";
import { ControlDock } from "../components/ControlDock";
import { ParticipantList } from "../components/ParticipantList";
import { SettingsModal } from "../components/SettingsModal";
import "@livekit/components-styles";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

/** Tile de tela compartilhada com controles de foco */
function ScreenTile({ trackRef, isFocused, onFocus, onUnfocus, label }) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className={`screen-tile ${isFocused ? "focused" : ""}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onDoubleClick={() => (isFocused ? onUnfocus() : onFocus(trackRef))}
    >
      <VideoTrack trackRef={trackRef} className="screen-video" />

      <div className={`tile-overlay ${hovering ? "visible" : ""}`}>
        <span className="tile-name">🖥️ {label}</span>
        <button
          className="tile-focus-btn"
          onClick={(e) => {
            e.stopPropagation();
            isFocused ? onUnfocus() : onFocus(trackRef);
          }}
        >
          {isFocused ? "Sair do foco" : "Focar"}
        </button>
      </div>
    </div>
  );
}

function RoomContent({ roomId, onLeave }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [focusedId, setFocusedId] = useState(null);
  const [copied, setCopied] = useState(false);

  const participants = useParticipants();
  const isLocalSharing = participants.some((p) => p.isLocal && p.isScreenShareEnabled);
  const { volumes, setVolume } = usePersistedVolumes();
  const { nicknames, setNickname, displayName } = useNicknames();
  const { remember, previousName, isKnown } = useKnownNames();
  const quality = useStreamQuality();

  // Só assina screenshares — economiza banda e CPU
  const screenTracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: true,
  });

  /** Aplica um volume nas tracks de áudio de um participante remoto */
  const applyVolume = useCallback((participant, percent) => {
    if (!participant?.setVolume || participant.isLocal) return;
    const v = percent / 100;
    participant.setVolume(v, Track.Source.Microphone);
    participant.setVolume(v, Track.Source.ScreenShareAudio);
  }, []);

  // Reaplica volumes salvos sempre que a lista de participantes muda.
  // Sem isto, um amigo que você silenciou semana passada entraria em 100%.
  // O LiveKit guarda o valor no volumeMap mesmo se a track de áudio ainda
  // não chegou, e aplica sozinho no momento da inscrição.
  useEffect(() => {
    participants.forEach((p) => {
      if (p.isLocal) return;
      const saved = volumes[p.identity];
      if (saved != null && saved !== 100) applyVolume(p, saved);
    });
  }, [participants, volumes, applyVolume]);

  // Guarda o nome atual de cada amigo para reconhecê-lo se voltar com outro.
  // Roda depois da leitura acima para não competir pelo mesmo render.
  useEffect(() => {
    participants.forEach((p) => {
      if (!p.isLocal && p.name) remember(p.identity, p.name);
    });
  }, [participants, remember]);

  const handleVolumeChange = useCallback(
    (deviceId, value) => {
      setVolume(deviceId, value);
      const p = participants.find((x) => x.identity === deviceId);
      if (p) applyVolume(p, value);
    },
    [participants, setVolume, applyVolume]
  );

  // Deafen: o RoomAudioRenderer com muted faz o servidor PARAR de enviar
  // os dados de áudio — economiza banda de verdade, não só silencia local.
  const toggleDeafen = useCallback(() => setDeafened((d) => !d), []);

  const copyLink = () => {
    const url = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const focused = useMemo(
    () => screenTracks.find((t) => t.publication?.trackSid === focusedId),
    [screenTracks, focusedId]
  );

  useEffect(() => {
    if (focusedId && !focused) setFocusedId(null);
  }, [focusedId, focused]);

  const visibleTracks = focused ? [focused] : screenTracks;
  const gridCount = Math.min(visibleTracks.length, 4);

  return (
    <div className="room-shell">
      <header className="room-topbar">
        <div className="topbar-left">
          <span className="topbar-logo">⬡</span>
          <div className="topbar-room">
            <span className="topbar-label">Sala</span>
            <code>{roomId}</code>
          </div>
        </div>

        <button className={`invite-btn ${copied ? "copied" : ""}`} onClick={copyLink}>
          {copied ? "✓ Link copiado!" : "🔗 Copiar link do convite"}
        </button>

        <div className="topbar-warning">🔒 Envie o link apenas para amigos</div>
      </header>

      <div className="room-body">
        <main className="stage">
          {visibleTracks.length === 0 ? (
            <div className="stage-empty">
              <span className="empty-icon">🖥️</span>
              <h3>Nenhuma tela sendo compartilhada</h3>
              <p>
                Clique em <strong>Compartilhar tela</strong> abaixo para começar.
                <br />
                Vários participantes podem transmitir ao mesmo tempo.
              </p>
              <div className="empty-tip">
                💡 Marque <strong>"Compartilhar áudio da guia"</strong> no seletor do
                navegador para transmitir o som junto.
              </div>
            </div>
          ) : (
            <div className={`stage-grid count-${gridCount}`}>
              {visibleTracks.map((t) => (
                <ScreenTile
                  key={t.publication.trackSid}
                  trackRef={t}
                  label={displayName(t.participant)}
                  isFocused={focusedId === t.publication.trackSid}
                  onFocus={(ref) => setFocusedId(ref.publication.trackSid)}
                  onUnfocus={() => setFocusedId(null)}
                />
              ))}
            </div>
          )}
        </main>

        <ParticipantList
          volumes={volumes}
          onVolumeChange={handleVolumeChange}
          nicknames={nicknames}
          onNicknameChange={setNickname}
          getDisplayName={displayName}
          getPreviousName={previousName}
          getIsKnown={isKnown}
        />
      </div>

      <RoomAudioRenderer muted={deafened} />

      <ControlDock
        deafened={deafened}
        onToggleDeafen={toggleDeafen}
        onOpenSettings={() => setSettingsOpen(true)}
        onLeave={onLeave}
        quality={quality}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        quality={quality}
        isSharing={isLocalSharing}
      />
    </div>
  );
}

export function Room({ roomId, participantName, onLeave }) {
  const { token, loading, error, fetchToken } = useToken();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) {
      setStarted(true);
      // O deviceId é resolvido dentro do useToken — nenhum componente
      // precisa carregá-lo manualmente, então não há como esquecer de enviá-lo.
      fetchToken(roomId, participantName);
    }
  }, [started, roomId, participantName, fetchToken]);

  const roomOptions = useMemo(
    () => ({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        videoCodec: "vp8",
        audioPreset: { maxBitrate: 32_000 },
        dtx: true,
        red: true,
        // Encoding do screenshare NÃO fica aqui: é passado a cada publicação,
        // conforme o preset que o usuário escolheu nas configurações.
      },
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      disconnectOnPageLeave: true,
    }),
    []
  );

  if (!LIVEKIT_URL) {
    return (
      <div className="error-screen">
        <h2>⚙️ Configuração incompleta</h2>
        <p>
          A variável <code>VITE_LIVEKIT_URL</code> não está definida no Netlify.
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
        <h2>❌ Não foi possível conectar</h2>
        <p>{error}</p>
        <button onClick={onLeave}>Voltar ao início</button>
      </div>
    );
  }

  if (!token) return null;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={LIVEKIT_URL}
      connect={true}
      video={false}
      audio={false}
      options={roomOptions}
      onDisconnected={onLeave}
      data-lk-theme="default"
      style={{ height: "100dvh" }}
    >
      <RoomContent roomId={roomId} onLeave={onLeave} />
    </LiveKitRoom>
  );
}
