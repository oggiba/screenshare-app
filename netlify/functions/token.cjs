const { AccessToken } = require("livekit-server-sdk");

/** Nome de exibição: permite acentos e espaços, remove controles e tags */
function sanitizeName(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F<>]/g, "") // controles e sinais de tag
    .trim()
    .slice(0, 24);
}

/** Sala e deviceId: alfanumérico estrito */
function sanitizeSlug(raw, max) {
  if (typeof raw !== "string") return "";
  return raw.replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, max);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error("LIVEKIT_API_KEY ou LIVEKIT_API_SECRET não configurados.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Servidor mal configurado. Contate o administrador." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Body inválido." }) };
  }

  const safeRoom = sanitizeSlug(body.roomName, 64);
  const safeName = sanitizeName(body.participantName);
  const safeDeviceId = sanitizeSlug(body.deviceId, 64);

  if (!safeRoom) {
    return { statusCode: 400, body: JSON.stringify({ error: "Sala inválida." }) };
  }
  if (!safeName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Nome inválido. Use letras, números ou espaços." }),
    };
  }
  if (!safeDeviceId || safeDeviceId.length < 8) {
    return { statusCode: 400, body: JSON.stringify({ error: "Identificador de dispositivo inválido." }) };
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      // identity: chave técnica estável do navegador — única por sala.
      // Nunca é exibida na interface.
      identity: safeDeviceId,
      // name: apelido que o participante escolheu — este sim aparece na tela.
      name: safeName,
      ttl: "4h",
    });

    at.addGrant({
      roomJoin: true,
      room: safeRoom,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      // Permite atualizar o próprio nome de exibição sem reconectar
      canUpdateOwnMetadata: true,
    });

    const token = await at.toJwt();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ token }),
    };
  } catch (err) {
    console.error("Erro ao gerar token:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Erro interno ao gerar token." }) };
  }
};
