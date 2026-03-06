/**
 * ClawdbotAdapter — routes XMTP messages into the Clawdbot session API.
 *
 * Architecture note:
 *   POST /hooks/agent is ALWAYS async (202) — it never returns the reply body.
 *   Instead, we:
 *     1. Fire the hook with a deterministic sessionKey
 *     2. Poll session history via /api/chat/history until a new reply appears
 *     3. Send the reply back via XMTP
 *
 * Env vars:
 *   CLAWDBOT_API_URL   — base URL of the Clawdbot Gateway (e.g. http://localhost:18789)
 *   CLAWDBOT_API_TOKEN — bearer token for the webhook endpoint (hooks.token in config)
 *   CLAWDBOT_GW_TOKEN  — Gateway control UI auth token (gateway.auth.token in config)
 *                        used for polling session history
 *   AGENT_NAME         — which OS-1 agent this instance represents (jared|jean|sam)
 */

import type {AgentMiddleware} from '@xmtp/agent-sdk';

const CLAWDBOT_API_URL = process.env.CLAWDBOT_API_URL ?? 'http://localhost:18789';
const CLAWDBOT_API_TOKEN = process.env.CLAWDBOT_API_TOKEN ?? '';
const CLAWDBOT_GW_TOKEN = process.env.CLAWDBOT_GW_TOKEN ?? '';
const AGENT_NAME = process.env.AGENT_NAME ?? 'jared';

// In-memory map: XMTP conversation ID → Clawdbot session key
const sessionMap = new Map<string, string>();

async function getOrCreateSession(conversationId: string): Promise<string> {
  if (sessionMap.has(conversationId)) {
    return sessionMap.get(conversationId)!;
  }
  const sessionKey = `xmtp-${AGENT_NAME}-${conversationId.slice(0, 16)}`;
  sessionMap.set(conversationId, sessionKey);
  return sessionKey;
}

/**
 * Fire the /hooks/agent endpoint (async 202).
 * Returns the runId for correlation.
 */
async function fireHook(sessionKey: string, message: string): Promise<string> {
  const res = await fetch(`${CLAWDBOT_API_URL}/hooks/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(CLAWDBOT_API_TOKEN ? {Authorization: `Bearer ${CLAWDBOT_API_TOKEN}`} : {}),
    },
    body: JSON.stringify({
      message,
      sessionKey,
      name: `XMTP:${AGENT_NAME}`,
      deliver: false,
      // timeoutSeconds is accepted but /hooks/agent is always async (202)
    }),
  });

  if (!res.ok) {
    throw new Error(`Clawdbot Gateway hook error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {ok: boolean; runId?: string};
  if (!data.ok || !data.runId) {
    throw new Error(`Hook rejected: ${JSON.stringify(data)}`);
  }
  return data.runId;
}

/**
 * Poll session history for a new assistant reply after the hook fires.
 * Uses the Gateway control API (requires CLAWDBOT_GW_TOKEN).
 */
async function pollForReply(
  sessionKey: string,
  runId: string,
  maxWaitMs = 55000,
  intervalMs = 1500,
): Promise<string> {
  const deadline = Date.now() + maxWaitMs;
  const gwToken = CLAWDBOT_GW_TOKEN;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, intervalMs));

    try {
      const res = await fetch(
        `${CLAWDBOT_API_URL}/api/sessions/${encodeURIComponent(sessionKey)}/history?limit=5`,
        {
          headers: gwToken ? {Authorization: `Bearer ${gwToken}`} : {},
        },
      );

      if (res.ok) {
        const data = (await res.json()) as {messages?: Array<{role: string; content: string}>};
        const messages = data.messages ?? [];
        // Find the last assistant message
        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
        if (lastAssistant?.content) {
          return lastAssistant.content;
        }
      }
    } catch {
      // transient error — keep polling
    }
  }

  throw new Error(`Timed out waiting for reply (runId: ${runId})`);
}

export const clawdbotAdapter: AgentMiddleware = async (ctx, next) => {
  // Only handle text messages — pass everything else down the chain
  if (ctx.message.contentType?.typeId !== 'text') {
    await next();
    return;
  }

  const content = ctx.message.content as string;
  const conversationId = ctx.conversation.id;

  try {
    const sessionKey = await getOrCreateSession(conversationId);
    const runId = await fireHook(sessionKey, content);
    console.log(`[ClawdbotAdapter] Hook fired runId=${runId} session=${sessionKey}`);

    const reply = await pollForReply(sessionKey, runId);
    await ctx.conversation.sendText(reply);
  } catch (err) {
    console.error('[ClawdbotAdapter] Error:', err);
    await ctx.conversation.sendText(
      "Ship's computer is experiencing a brief anomaly. Try again in a moment.",
    );
    await next();
  }
};
