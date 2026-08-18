# ⬡ ShareRoom

> Compartilhamento de tela em tempo real, baixa latência, para grupos privados.  
> Múltiplos participantes podem transmitir simultaneamente. Sem login. Sem banco de dados. Sem custo fixo.

---

## ⚠️ AVISOS IMPORTANTES — LEIA ANTES DE USAR

### 🔴 NUNCA entre em salas de estranhos

Este app funciona como uma sala de reunião — **qualquer pessoa com o ID da sala pode entrar e ver tudo que está sendo transmitido**. Por isso:

- **Compartilhe o ID da sala SOMENTE com amigos e pessoas de total confiança**
- **Nunca publique o link da sala em redes sociais, grupos públicos ou fóruns**
- **Nunca entre em uma sala cujo link veio de uma fonte desconhecida**
- Se alguém estranho entrar na sua sala, encerre a transmissão imediatamente e crie uma nova sala

### 🔴 Escopo do projeto

Este projeto foi desenvolvido para **uso privado entre amigos**. Ele **não foi projetado para**:

- Uso comercial ou monetização
- Transmissões públicas com audiências abertas
- Substituir ferramentas profissionais de streaming
- Armazenar ou gravar conteúdo transmitido

### 🔴 Sobre o conteúdo transmitido

- Tudo que aparecer na sua tela durante a transmissão **será visível para todos na sala**
- Feche janelas com informações sensíveis (senhas, dados bancários, conversas privadas) antes de iniciar o compartilhamento
- O app não armazena nada — mas **os participantes podem gravar a tela por conta própria**

---

## 🚀 Como fazer o deploy (passo a passo)

### Pré-requisitos

- Conta no [GitHub](https://github.com) (gratuita)
- Conta no [Netlify](https://netlify.com) (gratuita)
- Conta no [LiveKit Cloud](https://livekit.io) (gratuita)
- [Node.js 18+](https://nodejs.org) instalado localmente (para testar antes do deploy)

---

### Passo 1 — Criar projeto no LiveKit Cloud

1. Acesse [https://cloud.livekit.io](https://cloud.livekit.io) e crie uma conta gratuita
2. Clique em **"New Project"**
3. Dê um nome (ex: `shareroom`) e clique em **Create**
4. Na página do projeto, você verá:
   - **WebSocket URL** → algo como `wss://shareroom-xxxxx.livekit.cloud`
   - **API Key** → string começando com `API...`
   - **API Secret** → string longa (clique para revelar)
5. **Guarde esses 3 valores em local seguro** — você vai precisar deles nos próximos passos

> 💡 O plano gratuito do LiveKit Cloud inclui ~100GB de tráfego/mês — suficiente para uso entre amigos.

---

### Passo 2 — Subir o código no GitHub

```bash
# Clone ou baixe este repositório

# Entre na pasta
cd screenshare-app

# Inicialize o git (se ainda não tiver)
git init
git add .
git commit -m "feat: initial shareroom setup"

# Crie um repositório PRIVADO no GitHub
# (vá em github.com → New repository → marque como Private)

# Adicione o remote e suba
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```

> 🔒 **Use repositório PRIVADO** no GitHub. Mesmo que o código não tenha segredos (graças ao .gitignore), manter privado é uma boa prática para projetos pessoais.

---

### Passo 3 — Deploy no Netlify

1. Acesse [https://app.netlify.com](https://app.netlify.com)
2. Clique em **"Add new site" → "Import an existing project"**
3. Conecte sua conta do GitHub e selecione o repositório
4. Nas configurações de build, verifique:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
5. Clique em **"Deploy site"** (vai falhar na primeira vez — normal, faltam as variáveis)

---

### Passo 4 — Configurar as variáveis de ambiente no Netlify (PARTE MAIS IMPORTANTE)

> ⚠️ **NUNCA coloque API keys no código ou no GitHub.** As variáveis ficam APENAS no Netlify, criptografadas.

1. No painel do seu site no Netlify, vá em:  
   **Site configuration → Environment variables**

2. Clique em **"Add a variable"** e adicione **3 variáveis**:

| Chave | Valor | Onde pegar |
|---|---|---|
| `VITE_LIVEKIT_URL` | `wss://seu-projeto-xxxxx.livekit.cloud` | Dashboard LiveKit → WebSocket URL |
| `LIVEKIT_API_KEY` | `APIxxxxxxxxxxxxxxxxx` | Dashboard LiveKit → API Key |
| `LIVEKIT_API_SECRET` | `xxxxxxxxxxxxxxxxxxxxxxxxx` | Dashboard LiveKit → API Secret |

> ⚠️ **Atenção ao prefixo:**
> - `VITE_LIVEKIT_URL` tem o prefixo `VITE_` porque o frontend precisa saber a URL do servidor (não é um segredo)
> - `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET` **NÃO têm** o prefixo `VITE_` — isso garante que eles ficam SOMENTE no backend (Netlify Function) e jamais são expostos no browser

3. Após adicionar as 3 variáveis, vá em **"Deploys" → "Trigger deploy" → "Deploy site"**

4. Aguarde o build finalizar. Seu site estará disponível em `https://nome-aleatorio.netlify.app`

---

### Passo 5 — Teste local (opcional, mas recomendado)

```bash
# Instale as dependências
npm install

# Instale o CLI do Netlify globalmente
npm install -g netlify-cli

# Copie o template de variáveis e preencha com seus valores reais
cp .env.example .env.local
# Abra .env.local e preencha VITE_LIVEKIT_URL, LIVEKIT_API_KEY e LIVEKIT_API_SECRET

# Rode o projeto localmente (simula Netlify Functions também)
netlify dev
```

Acesse `http://localhost:8888` para testar antes de subir.

---

## 🔐 Por que está seguro?

### O que fica no frontend (visível no browser)
```
✅ VITE_LIVEKIT_URL → URL pública do servidor WebRTC (não é segredo)
```

### O que fica SOMENTE no backend (Netlify Function)
```
🔒 LIVEKIT_API_KEY   → Nunca chega ao browser
🔒 LIVEKIT_API_SECRET → Nunca chega ao browser
```

### Como funciona o fluxo de autenticação

```
Browser                    Netlify Function              LiveKit Cloud
  │                              │                             │
  │── POST /token (roomName) ──▶ │                             │
  │                              │── gera JWT com API Secret ──▶ │
  │                              │◀──────────── token JWT ─────── │
  │◀──── retorna token JWT ───── │                             │
  │                              │                             │
  │─────── conecta com token ────────────────────────────────▶ │
  │◀──────────────── stream WebRTC de baixa latência ────────── │
```

O `API Secret` **nunca sai do servidor**. O browser recebe apenas um token JWT temporário (válido por 4 horas) que é inútil sem o secret.

---

## 🛡️ Headers de segurança incluídos

O `netlify.toml` já configura headers de segurança automáticos:

- `X-Frame-Options: DENY` — impede embedding em iframes
- `X-Content-Type-Options: nosniff` — previne MIME sniffing
- `Permissions-Policy` — limita acesso a câmera/microfone ao necessário
- `Content-Security-Policy` — restringe quais domínios o app pode contatar
- `Referrer-Policy` — não vaza URLs internas

---

## ⚡ Otimizando o ping (leia isto)

### 1 — Região do projeto LiveKit (maior impacto de todos)

Este é **o fator número um** de latência. Se o seu projeto LiveKit estiver em região errada, todo o tráfego atravessa o oceano.

No dashboard do LiveKit Cloud, verifique a região do projeto:

| Sua localização | Região ideal | Ping esperado |
|---|---|---|
| Brasil | São Paulo (`sa-east`) | 10–40ms |
| Brasil → região US | US East | 110–160ms |
| Brasil → região EU | Europa | 180–250ms |

O LiveKit Cloud roteia automaticamente para o edge mais próximo na maioria dos casos, mas vale confirmar nas configurações do projeto. **Trocar de US para São Paulo pode cortar 100ms+ de latência.**

### 2 — Otimizações já aplicadas no código

| Técnica | O que faz |
|---|---|
| `adaptiveStream` | Ajusta a resolução recebida ao tamanho real do elemento na tela |
| `dynacast` | Para de enviar camadas de vídeo que ninguém está assistindo |
| `simulcast` | Envia várias qualidades — cada um recebe a que sua rede aguenta |
| `dtx` | Não transmite pacotes durante silêncio |
| `red` | Redundância de áudio — sobrevive a perda de pacotes |
| `contentHint: motion` | Prioriza fluidez sobre nitidez no screenshare |
| Deafen real | Ao mutar tudo, o servidor **para de enviar** áudio (economiza banda) |
| Code splitting | SDK do LiveKit fica em cache entre deploys |

### 3 — Do lado do usuário

- Cabo de rede sempre ganha de Wi-Fi
- Fones de ouvido evitam eco e cancelamento agressivo
- Menos telas simultâneas = menos CPU consumida na decodificação
- Feche abas pesadas antes de transmitir

---

## 🎛️ Funcionalidades

- **Entrada por link** — cria a sala, copia o link, o amigo abre e só digita o nome
- **Múltiplas telas simultâneas** — vários podem transmitir ao mesmo tempo
- **Modo foco** — duplo clique numa tela para expandi-la
- **Controle de microfone** — liga/desliga com um clique
- **Botão de mutar tudo (deafen)** — silencia a sala inteira
- **Volume individual** — clique num participante para ajustar (0–200%)
- **Seleção de dispositivos** — escolha qual microfone e saída de áudio usar
- **Indicador de ping** — RTT real em tempo real na barra inferior
- **Indicador de quem está falando** — avatar pulsa em verde
- **Nome salvo** — não precisa digitar toda vez
- **Volume lembrado por amigo** — silenciou alguém? continua silenciado semana que vem
- **Apelidos locais privados** — dê o nome que quiser a cada amigo, só você vê

---

## 🆔 Identidade: como funciona (e o que NÃO é)

Cada navegador gera um **ID técnico** (`sr_device_id`) no primeiro acesso, salvo no localStorage. Ele serve para:

- Manter suas preferências (volume, apelidos) ligadas à pessoa certa, mesmo que ela mude de nome
- Ser a chave de identidade dentro da sala

### ⚠️ Isto NÃO é autenticação

O ID fica no navegador do usuário e pode ser trocado por qualquer um que abra o DevTools. Ele **não prova quem a pessoa é** — serve só para conveniência local.

A segurança real deste app continua sendo **o link ser secreto**. Nada além disso.

### Consequências práticas

| Situação | O que acontece |
|---|---|
| Mesmo navegador, duas abas, mesma sala | A primeira aba é desconectada (LiveKit exige identity única por sala) |
| Limpar dados do navegador | Vira "pessoa nova" — volumes e apelidos se perdem |
| Aba anônima | ID temporário, não persiste ao fechar |
| Trocar de nome | Volume e apelido salvos continuam funcionando |

### Três camadas de nome

```
identity  → UUID do navegador     (técnico, nunca aparece na tela)
name      → apelido escolhido      (o que a pessoa digitou)
nickname  → apelido local privado  (só você vê, sobrepõe o name)
```

---

## 📁 Estrutura do projeto

```
screenshare-app/
├── netlify/
│   └── functions/
│       └── token.cjs         # Backend: gera tokens JWT (seguro)
├── src/
│   ├── components/
│   │   ├── ControlDock.jsx     # Barra inferior (mic, deafen, tela, ping)
│   │   ├── ParticipantList.jsx # Sidebar com volume individual
│   │   └── SettingsModal.jsx   # Seleção de microfone e saída
│   ├── hooks/
│   │   ├── useToken.js       # Busca token na Netlify Function
│   │   ├── useDeviceId.js    # ID técnico estável do navegador
│   │   ├── useFriendPrefs.js # Volumes e apelidos salvos por amigo
│   │   └── useDevices.js     # Lista e persiste dispositivos de áudio
│   ├── pages/
│   │   ├── Home.jsx          # Entrada (cria sala ou aceita convite)
│   │   └── Room.jsx          # Sala + config de performance do LiveKit
│   ├── App.jsx               # Roteamento por ?room=
│   ├── App.css               # Estilos
│   └── main.jsx              # Entry point
├── .env.example              # Template de variáveis (sem valores reais)
├── .gitignore                # Garante que .env nunca vai pro GitHub
├── netlify.toml              # Config de build + headers de segurança
├── vite.config.js            # Config do Vite
└── index.html                # HTML base
```

---

## 💰 Custos

| Serviço | Plano | Custo |
|---|---|---|
| Netlify | Free | R$ 0 |
| LiveKit Cloud | Free (100GB/mês) | R$ 0 |
| GitHub | Free (privado) | R$ 0 |
| **Total** | | **R$ 0/mês** |

Para um grupo de 10–50 amigos com uso casual, o free tier do LiveKit é mais que suficiente.

---

## ❓ FAQ

**Preciso criar conta para entrar numa sala?**  
Não. Basta ter o ID da sala e um nome de exibição.

**O conteúdo é gravado?**  
Não. O LiveKit processa o stream em tempo real e não armazena nada.

**Quantas pessoas podem transmitir ao mesmo tempo?**  
Tecnicamente muitas, mas na prática o navegador começa a pesar com mais de 4–6 streams simultâneos. Para assistir, pode ter dezenas.

**E se o LiveKit Cloud tirar o free tier?**  
Você pode hospedar o LiveKit Server você mesmo (é open-source). Veja: [github.com/livekit/livekit](https://github.com/livekit/livekit)

**Posso customizar o nome do site?**  
Sim. No Netlify: Site configuration → General → Site name.

---

## 📄 Licença

Projeto pessoal e privado. Use, modifique e compartilhe com seus amigos à vontade.
