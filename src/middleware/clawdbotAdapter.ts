/**
 * ClawdbotAdapter — routes XMTP messages into the Clawdbot session API.
 *
 * Each XMTP conversation ID maps to a persistent Clawdbot session key,
 * so context is preserved across messages in the same thread.
 *
 * Env vars:
 *   CLAWDBOT_API_URL   — base URL of the Clawdbot Gateway (e.g. http://localhost:3000)
 *   CLAWDBOT_API_TOKEN — bearer token for the Gateway API
 *   AGENT_NAME         — which OS-1 agent this instance represents (jared|jean|sam)
 */

import type {AgentMiddleware} from '@xmtp/agent-sdk';

const CLAWDBOT_API_URL = process.env.CLAWDBOT_API_URL ?? 'http://localhost:3000';
const CLAWDBOT_API_TOKEN = process.env.CLAWDBOT_API_TOKEN ?? '';
const AGENT_NAME = process.env.AGENT_NAME ?? 'jared';

// In-memory map: XMTP conversation ID → Clawdbot session key
// In production, persist this to SQLite or Postgres so it survives restarts.
const sessionMap = new Map<string, string>();

async function getOrCreateSession(conversationId: string): Promise<string> {
  if (sessionMap.has(conversationId)) {
    return sessionMap.get(conversationId)!;
  }

  const sessionKey = `xmtp-${AGENT_NAME}-${conversationId.slice(0, 16)}`;
  sessionMap.set(conversationId, sessionKey);
  return sessionKey;
}

async function forwardToClawdbot(sessionKey: string, message: string): Promise<string> {
  // Uses the Clawdbot Gateway webhook endpoint: POST /hooks/agent
  // xmtp channel type is not yet registered — falls back to generic agent routing.
  const res = await fetch(`${CLAWDBOT_API_URL}/hooks/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(CLAWDBOT_API_TOKEN ? {Authorization: `Bearer ${CLAWDBOT_API_TOKEN}`} : {}),
    },
    body: JSON.stringify({
      message,
      sessionKey,
      channel: 'xmtp',
      // Metadata for future xmtp channel plugin
      meta: {agent: AGENT_NAME},
    }),
  });

  if (!res.ok) {
    throw new Error(`Clawdbot Gateway error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {reply?: string; text?: string; message?: string};
  return data.reply ?? data.text ?? data.message ?? '(no response)';
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
    const reply = await forwardToClawdbot(sessionKey, content);
    await ctx.conversation.sendText(reply);
  } catch (err) {
    console.error('[ClawdbotAdapter] Error forwarding message:', err);
    await ctx.conversation.sendText(
      'Ship's computer is experiencing a brief anomaly. Try again in a moment.',
    );
    await next();
  }
};
