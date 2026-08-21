import { useEffect, useState, useCallback, useMemo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useToken } from "../hooks/useToken";
import { usePersistedVolumes, useNicknames, useKnownNames } from "../hooks/useFriendPrefs";
import { useStreamQuality } from "../hooks/useStreamQuality";
import { useTheme } from "../hooks/useTheme";
import { copyText } from "../utils/clipboard";
import { Stage } from "../components/Stage";
import { ControlDock } from "../components/ControlDock";
import { ParticipantList } from "../components/ParticipantList";
import { SettingsModal } from "../components/SettingsModal";
import { ErrorBoundary } from "../components/ErrorBoundary";
import "@livekit/components-styles";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

function RoomContent({ roomId, onLeave }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);

  const participants = useParticipants();
  const isLocalSharing = participants.some((p) => p.isLocal && p.isScreenShareEnabled);
  const { volumes, setVolume } = usePersistedVolumes();
  const { nicknames, setNickname, displayName } = useNicknames();
  const { remember, previousName, isKnown } = useKnownNames();
  const quality = useStreamQuality();
  const { theme, toggleTheme } = useTheme();

  // Só assina screenshares — economiza banda e CPU
  const screenTracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: true,
  });

  /**
   * Aplica um volume nas tracks de áudio de um participante remoto.
   *
   * setVolume() mexe direto num GainNode do Web Audio API por baixo do
   * pano. Se o AudioContext do navegador estiver suspenso ou fechado —
   * o que acontece de forma legítima ao voltar de um diálogo de
   * permissão, aba em segundo plano, ou políticas de autoplay — essa
   * chamada lança uma exceção que nem o SDK do LiveKit nem o React
   * capturam sozinhos. Sem o try/catch aqui, um erro assim dentro do
   * useEffect abaixo derruba a sala inteira. Nunca deixe este método
   * propagar uma exceção.
   */
  const applyVolume = useCallback((participant, percent) => {
    if (!participant?.setVolume || participant.isLocal) return;
    try {
      const v = percent / 100;
      participant.setVolume(v, Track.Source.Microphone);
      participant.setVolume(v, Track.Source.ScreenShareAudio);
    } catch (err) {
      console.error("Falha ao ajustar volume (ignorada):", err);
    }
  }, []);

  // Reaplica volumes salvos sempre que a lista de participantes muda.
  // Sem isto, um amigo que você silenciou semana passada entraria em 100%.
  // O LiveKit guarda o valor no volumeMap mesmo se a track de áudio ainda
  // não chegou, e aplica sozinho no momento da inscrição.
  //
  // Depende de "participantKey" (identidades unidas), não do array
  // "participants" bruto — useParticipants() retorna uma referência nova
  // a cada render, o que faria este efeito rodar (e reaplicar volume em
  // todo mundo) a cada pixel arrastado no slider, multiplicando o risco
  // de bater numa falha do Web Audio API sem necessidade.
  const participantKey = participants.map((p) => p.identity).join(",");
  useEffect(() => {
    participants.forEach((p) => {
      if (p.isLocal) return;
      const saved = volumes[p.identity];
      if (saved != null && saved !== 100) applyVolume(p, saved);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantKey, volumes, applyVolume]);

  // Guarda o nome atual de cada amigo para reconhecê-lo se voltar com outro.
  // Roda depois da leitura acima para não competir pelo mesmo render.
  // Mesma lógica de estabilidade de dependência do efeito anterior.
  useEffect(() => {
    participants.forEach((p) => {
      if (!p.isLocal && p.name) remember(p.identity, p.name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantKey, remember]);

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

  const inviteUrl = `${window.location.origin}/?room=${roomId}`;

  const copyLink = async () => {
    const ok = await copyText(inviteUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Cópia bloqueada pelo navegador — mostra o link para copiar à mão
      setShowLink(true);
    }
  };

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

      {showLink && (
        <div className="link-fallback">
          <span>Seu navegador bloqueou a cópia automática. Copie o link à mão:</span>
          <input readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
          <button onClick={() => setShowLink(false)}>Fechar</button>
        </div>
      )}

      <div className="room-body">
        <Stage
          screenTracks={screenTracks}
          participants={participants}
          displayName={displayName}
        />

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
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        quality={quality}
        isSharing={isLocalSharing}
        theme={theme}
        onToggleTheme={toggleTheme}
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
    <ErrorBoundary onReset={onLeave}>
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
    </ErrorBoundary>
  );
}
