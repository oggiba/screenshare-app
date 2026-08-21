import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Flame, Link, Check, Lock, Users, Settings, CircleX } from "lucide-react";
import { useToken } from "../hooks/useToken";
import { usePersistedVolumes, useNicknames, useKnownNames } from "../hooks/useFriendPrefs";
import { useStreamQuality } from "../hooks/useStreamQuality";
import { useTheme } from "../hooks/useTheme";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { copyText } from "../utils/clipboard";
import { Suspense, lazy } from "react";
import { Stage } from "../components/Stage";
import { ControlDock } from "../components/ControlDock";
import { ParticipantList } from "../components/ParticipantList";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { FlameLoader } from "../components/FlameLoader";
import "@livekit/components-styles";
import "./Room.css";

const SettingsModal = lazy(() =>
  import("../components/SettingsModal").then((m) => ({ default: m.SettingsModal }))
);

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

function RoomContent({ roomId, onLeave }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Fica true na primeira abertura e nunca mais volta a false — dispara o
  // import() preguiçoso do SettingsModal só quando necessário (Task 11), mas
  // depois disso mantém o componente montado para o AnimatePresence interno
  // conseguir animar a saída em vez de sumir instantaneamente.
  const [hasOpenedSettings, setHasOpenedSettings] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);
  // Sidebar de participantes vira uma gaveta em telas ≤860px (ver Room.css);
  // esse estado só é relevante nesse breakpoint, ignorado no layout desktop.
  const [participantsOpen, setParticipantsOpen] = useState(false);

  const participants = useParticipants();
  const isLocalSharing = participants.some((p) => p.isLocal && p.isScreenShareEnabled);
  const { volumes, setVolume } = usePersistedVolumes();
  const { nicknames, setNickname, displayName } = useNicknames();
  const { remember, previousName, isKnown } = useKnownNames();
  const quality = useStreamQuality();
  const { theme, toggleTheme } = useTheme();
  const { sounds, volume: sfxVolume, setVolume: setSfxVolume } = useSoundEffects();

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

  const copiedTimeoutRef = useRef(null);
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const copyLink = async () => {
    const ok = await copyText(inviteUrl);
    if (ok) {
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } else {
      // Cópia bloqueada pelo navegador — mostra o link para copiar à mão
      setShowLink(true);
    }
  };

  return (
    <motion.div
      className="room-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <header className="room-topbar">
        <div className="topbar-left">
          <motion.span
            className="topbar-logo"
            initial={{ rotate: -20, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
          >
            <Flame size={20} strokeWidth={2} />
          </motion.span>
          <div className="topbar-room">
            <span className="topbar-label">Sala</span>
            <code>{roomId}</code>
          </div>
        </div>

        <motion.button
          className={`invite-btn ${copied ? "copied" : ""}`}
          onClick={copyLink}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
        >
          {copied ? <Check size={15} /> : <Link size={15} />}
          <span>{copied ? "Link copiado!" : "Copiar link do convite"}</span>
        </motion.button>

        <div className="topbar-warning">
          <Lock size={13} /> Envie o link apenas para amigos
        </div>

        <motion.button
          className="topbar-people-btn"
          onClick={() => setParticipantsOpen(true)}
          title="Ver participantes"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
        >
          <Users size={18} />
          <span className="topbar-people-count">{participants.length}</span>
        </motion.button>
      </header>

      <AnimatePresence>
        {showLink && (
          <motion.div
            className="link-fallback"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <span>Seu navegador bloqueou a cópia automática. Copie o link à mão:</span>
            <input readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
            <button onClick={() => setShowLink(false)}>Fechar</button>
          </motion.div>
        )}
      </AnimatePresence>

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
          mobileOpen={participantsOpen}
          onMobileClose={() => setParticipantsOpen(false)}
        />
      </div>

      <RoomAudioRenderer muted={deafened} />

      <ControlDock
        deafened={deafened}
        onToggleDeafen={toggleDeafen}
        onOpenSettings={() => {
          setSettingsOpen(true);
          setHasOpenedSettings(true);
        }}
        onLeave={onLeave}
        quality={quality}
        theme={theme}
        onToggleTheme={toggleTheme}
        sounds={sounds}
      />

      {hasOpenedSettings && (
        <Suspense
          fallback={
            <div className="route-loading">
              <FlameLoader size={24} />
            </div>
          }
        >
          <SettingsModal
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            quality={quality}
            isSharing={isLocalSharing}
            theme={theme}
            onToggleTheme={toggleTheme}
            sfxVolume={sfxVolume}
            onSfxVolumeChange={setSfxVolume}
          />
        </Suspense>
      )}
    </motion.div>
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
        <Settings className="error-icon" size={34} strokeWidth={1.75} />
        <h2>Configuração incompleta</h2>
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
        <FlameLoader />
        <p>Conectando à sala…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <CircleX className="error-icon" size={34} strokeWidth={1.75} />
        <h2>Não foi possível conectar</h2>
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
