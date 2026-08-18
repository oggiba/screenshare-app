const { AccessToken } = require("livekit-server-sdk");

exports.handler = async (event) => {
  // Só aceita POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Lê variáveis de ambiente — NUNCA expostas ao frontend
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

  const { roomName, participantName } = body;

  // Validações básicas
  if (!roomName || typeof roomName !== "string" || roomName.trim().length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "roomName é obrigatório." }) };
  }
  if (!participantName || typeof participantName !== "string" || participantName.trim().length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "participantName é obrigatório." }) };
  }

  // Sanitiza inputs — só letras, números, hífens, underscores e espaços
  const safeName = participantName.trim().slice(0, 32).replace(/[^a-zA-Z0-9\-_ ]/g, "");
  const safeRoom = roomName.trim().slice(0, 64).replace(/[^a-zA-Z0-9\-_]/g, "");

  if (!safeRoom || !safeName) {
    return { statusCode: 400, body: JSON.stringify({ error: "Nome inválido. Use apenas letras, números e hífens." }) };
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: safeName,
      ttl: "4h", // Token expira em 4 horas
    });

    at.addGrant({
      roomJoin: true,
      room: safeRoom,
      canPublish: true,        // Pode transmitir tela/áudio
      canSubscribe: true,      // Pode assistir outros
      canPublishData: true,    // Mensagens de chat básicas
    });

    const token = await at.toJwt();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // Segurança: evita que o browser cache tokens
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ token }),
    };
  } catch (err) {
    console.error("Erro ao gerar token:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Erro interno ao gerar token." }) };
  }
};
