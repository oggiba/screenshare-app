import { useState, useCallback } from "react";

export function useToken() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchToken = useCallback(async (roomName, participantName) => {
    setLoading(true);
    setError(null);
    setToken(null);

    try {
      const res = await fetch("/.netlify/functions/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, participantName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao obter token de acesso.");
      }

      setToken(data.token);
      return data.token;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { token, loading, error, fetchToken };
}
