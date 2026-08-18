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
    localStorage.setItem("sr_mic", deviceId);
  }, []);

  const pickSpeaker = useCallback((deviceId) => {
    setSelectedSpeaker(deviceId);
    localStorage.setItem("sr_speaker", deviceId);
  }, []);

  return { mics, speakers, selectedMic, selectedSpeaker, pickMic, pickSpeaker, refresh };
}
