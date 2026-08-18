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

## 📁 Estrutura do projeto

```
screenshare-app/
├── netlify/
│   └── functions/
│       └── token.js          # Backend: gera tokens JWT (seguro)
├── src/
│   ├── hooks/
│   │   └── useToken.js       # Hook que chama a Function
│   ├── pages/
│   │   ├── Home.jsx          # Tela inicial (criar/entrar em sala)
│   │   └── Room.jsx          # Tela da sala de transmissão
│   ├── App.jsx               # Roteamento
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
