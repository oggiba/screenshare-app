import { useState, useEffect, useCallback } from "react";

/**
 * Lista e gerencia dispositivos de áudio (mic e saída).
 * Persiste a escolha no localStorage do navegador.
 */
export function useAudioDevices() {
  const [mics, setMics] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [selectedMic, setSelectedMic] = useState(
    () => localStorage.getItem("sr_mic") || "default"
  );
  const [selectedSpeaker, setSelectedSpeaker] = useState(
    () => localStorage.getItem("sr_speaker") || "default"
  );

  const refresh = useCallback(async () => {
    try {
      // Precisa de permissão para ver os labels dos dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();
      setMics(devices.filter((d) => d.kind === "audioinput"));
      setSpeakers(devices.filter((d) => d.kind === "audiooutput"));
    } catch (err) {
      console.error("Erro ao listar dispositivos:", err);
    }
  }, []);

  useEffect(() => {
    refresh();
    navigator.mediaDevices?.addEventListener("devicechange", refresh);
    return () => navigator.mediaDevices?.removeEventListener("devicechange", refresh);
  }, [refresh]);

  const pickMic = useCallback((deviceId) => {
    setSelectedMic(deviceId);
    // Sem o try/catch, um storage cheio ou bloqueado (modo privado do
    // Safari, por exemplo) interrompe a função aqui e o resto do fluxo
    // de troca de microfone (switchActiveDevice) nunca chega a rodar.
    try {
      localStorage.setItem("sr_mic", deviceId);
    } catch {
      /* preferência vale só nesta sessão */
    }
  }, []);

  const pickSpeaker = useCallback((deviceId) => {
    setSelectedSpeaker(deviceId);
    try {
      localStorage.setItem("sr_speaker", deviceId);
    } catch {
      /* preferência vale só nesta sessão */
    }
  }, []);

  return { mics, speakers, selectedMic, selectedSpeaker, pickMic, pickSpeaker, refresh };
}

/**
 * Lista e gerencia câmeras — mesmo padrão de useAudioDevices, só que
 * pra vídeo. Fica em hook separado porque nem toda tela que precisa
 * de dispositivos de áudio (ex.: SettingsModal antes desta feature)
 * precisa também enumerar câmera, e vice-versa.
 */
export function useCameraDevices() {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(
    () => localStorage.getItem("sr_camera") || "default"
  );

  const refresh = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((d) => d.kind === "videoinput"));
    } catch (err) {
      console.error("Erro ao listar câmeras:", err);
    }
  }, []);

  useEffect(() => {
    refresh();
    navigator.mediaDevices?.addEventListener("devicechange", refresh);
    return () => navigator.mediaDevices?.removeEventListener("devicechange", refresh);
  }, [refresh]);

  const pickCamera = useCallback((deviceId) => {
    setSelectedCamera(deviceId);
    try {
      localStorage.setItem("sr_camera", deviceId);
    } catch {
      /* preferência vale só nesta sessão */
    }
  }, []);

  return { cameras, selectedCamera, pickCamera, refresh };
}
