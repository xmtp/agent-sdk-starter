# OS-1 × XMTP Agent SDK — Exploration Notes

## What Is This?

[xmtp/agent-sdk-starter](https://github.com/xmtp/agent-sdk-starter) is a TypeScript starter kit for building
**agents that communicate over the XMTP decentralized messaging network**.

XMTP is an open, wallet-based messaging protocol — think WhatsApp but on-chain, where every address
is an Ethereum wallet and every conversation is end-to-end encrypted and chain-verified.

---

## How It Works (Quick Architecture)

```
User (wallet address) → XMTP Network → Agent (this repo)
                                           ↓
                                    @xmtp/agent-sdk
                                    - event listeners (text, dm, group, reaction, attachment)
                                    - CommandRouter middleware
                                    - send/reply/react helpers
```

Key primitives:
- **`Agent.createFromEnv()`** — boots from `.env` with an Ethereum wallet key
- **Event handlers** — `agent.on('text' | 'dm' | 'group' | 'reaction' | 'attachment' | ...)`
- **`CommandRouter`** middleware — slash-command routing (`/version`, `/test`, etc.)
- **Middleware stack** — composable `AgentMiddleware` (see `isFromOwner.ts`)
- **Attachment support** — encrypted remote attachments via Pinata/IPFS

---

## OS-1 Use Cases

### 1. 🤖 OS-1 Agents on XMTP (High Priority)
Deploy Jared/Jean/Sam as XMTP agents. Users could message an OS-1 agent at an Ethereum address —
fully decentralized, end-to-end encrypted, no WhatsApp dependency.

```
User → messages jared.eth (XMTP) → this agent → Agent SDK → Jared logic
```

**What to build:** Swap out the echo handler for Clawdbot skill dispatch.

### 2. 🌉 XMTP ↔ WhatsApp Bridge
Receive messages from XMTP, forward to the appropriate OS-1 agent running on WhatsApp,
and relay responses back. Cross-protocol inbox unification.

### 3. 📣 Proactive Notifications via XMTP
OS-1 agents push alerts (CI failures, urgent emails, calendar conflicts) to the owner's
XMTP inbox — useful when WhatsApp is unavailable or as a secondary channel.

### 4. 🔐 Owner-Gated Agent Access
The `isFromOwner` middleware pattern is exactly what we need:
only the wallet holder can command the agent. Add multi-wallet support for the team.

### 5. 🏗️ Agent-to-Agent Messaging on XMTP
Run multiple OS-1 agents (Jared, Jean, Sam) as separate XMTP addresses.
They can message each other directly on the network — a decentralized replacement for
the tq_messages Postgres bus.

---

## Integration Plan

### Phase 1 — Stand Up the Agent (1–2 days)
- [ ] Generate XMTP wallet key + encryption key
- [ ] Add `.env.defaults` with OS-1-specific vars
- [ ] Replace echo handler with a minimal "ping Clawdbot and relay response" handler
- [ ] Deploy to Render (render.yaml is already included) or existing infra

### Phase 2 — OS-1 Agent Adapter (3–5 days)
- [ ] Build `ClawdbotMiddleware` that routes XMTP messages to Clawdbot session API
- [ ] Map XMTP conversation ID → Clawdbot session key
- [ ] Handle text, reactions, and attachments
- [ ] Owner middleware using `XMTP_OWNER_ADDRESS`

### Phase 3 — Multi-Agent Support (1 week)
- [ ] Parameterize agent identity (Jared vs Jean vs Sam) via env
- [ ] Each agent gets its own XMTP wallet address
- [ ] Shared group conversation support (XMTP groups = like WhatsApp groups)

### Phase 4 — Agent-to-Agent Bus (stretch)
- [ ] Replace/augment tq_messages with XMTP DM channel
- [ ] Cryptographically signed inter-agent messages
- [ ] No central Postgres required

---

## Tech Notes

- **Runtime**: Node.js, TypeScript, ESM
- **SDK version**: `@xmtp/agent-sdk ^2.2.0`
- **Key env vars**: `XMTP_WALLET_KEY`, `XMTP_DB_ENCRYPTION_KEY`, `XMTP_ENV` (dev/production)
- **Attachments**: Pinata JWT required for image/file sending (optional for basic use)
- **Key generation**: https://xmtp.github.io/agent-sdk-starter/ (browser-local, no server)

---

## Questions for the Team

1. Should each OS-1 agent (Jared/Jean/Sam) have its own XMTP wallet, or share one?
2. Target network: `dev` for experiments or go straight to `production`?
3. Deploy target: Render (cheap, included config) vs our existing infra?
4. Attachment/image handling: need Pinata keys, or skip for now?

---

_Exploration by Jared — OS-1 Shipboard AI_
_Branch: `os1/xmtp-integration-exploration`_

---

## Agent-to-Agent API Notes (from Jean's testing, 2026-03-06)

### Creating DMs programmatically
```ts
// Create a DM conversation with another agent by wallet address
const dm = await client.createDmWithIdentifier({
  identifier: '0xafd74d1d13c13a5101db5039359aad21c8629d08',
  identifierKind: 0,  // 0 = Ethereum address
});

// Send text (not send() — use sendText())
await dm.sendText('Hello from Jean');
```

### Agent addresses (production network)
- Jean:  `0x3b74fa17fad4cff390c8a3cc17a910e7426af1ce`
- Jared: `0xafd74d1d13c13a5101db5039359aad21c8629d08`
- Sam:   `0xa260b41f43ff959fef1724a6f325d0c50fcacb18`

### Confirmed: agent-to-agent messaging works on production XMTP network.
