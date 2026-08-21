/**
 * Dados falsos só para o DevPreview (?dev=1). Nunca é importado fora
 * de src/dev — não entra na build normal do app.
 */
export const MOCK_PARTICIPANTS = [
  { identity: "dev-local", name: "Você", isLocal: true, muted: false, speaking: false, sharing: false },
  { identity: "dev-ana", name: "Ana", isLocal: false, muted: false, speaking: true, sharing: true },
  { identity: "dev-bruno", name: "Bruno", isLocal: false, muted: true, speaking: false, sharing: false },
  { identity: "dev-carla", name: "Carla (um nome bem comprido pra testar overflow)", isLocal: false, muted: false, speaking: false, sharing: false },
];
