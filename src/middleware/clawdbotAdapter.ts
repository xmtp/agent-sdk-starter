/**
 * ClawdbotAdapter — routes XMTP messages into the Clawdbot session API.
 *
 * Uses the Gateway OpenAI-compatible /v1/chat/completions endpoint for
 * synchronous replies. Requires:
 *   gateway.http.endpoints.chatCompletions.enabled = true
 *
 * Env vars:
 *   CLAWDBOT_API_URL  — base URL of the Clawdbot Gateway (e.g. http://localhost:18789)
 *   CLAWDBOT_GW_TOKEN — Gateway auth token (gateway.auth.token in config)
 *   AGENT_NAME        — which OS-1 agent this instance represents (jared|jean|sam)
 */

import type {AgentMiddleware} from '@xmtp/agent-sdk';

const CLAWDBOT_API_URL = process.env.CLAWDBOT_API_URL ?? 'http://localhost:18789';
const CLAWDBOT_GW_TOKEN = process.env.CLAWDBOT_GW_TOKEN ?? '';
const AGENT_NAME = process.env.AGENT_NAME ?? 'jared';

// In-memory map: XMTP conversation ID → Clawdbot session key
const sessionMap = new Map<string, string>();

function getOrCreateSession(conversationId: string): string {
  if (!sessionMap.has(conversationId)) {
    sessionMap.set(conversationId, `xmtp-${AGENT_NAME}-${conversationId.slice(0, 16)}`);
  }
  return sessionMap.get(conversationId)!;
}

/**
 * Send a message to a Clawdbot session and get a synchronous reply
 * via the OpenAI-compatible /v1/chat/completions endpoint.
 */
async function askClawdbot(sessionKey: string, message: string): Promise<string> {
  const res = await fetch(`${CLAWDBOT_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CLAWDBOT_GW_TOKEN}`,
      'x-clawdbot-session-key': sessionKey,
    },
    body: JSON.stringify({
      model: 'default',
      messages: [{role: 'user', content: message}],
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Clawdbot API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{message?: {content?: string}}>;
  };

  return data.choices?.[0]?.message?.content ?? '(no response)';
}

export const clawdbotAdapter: AgentMiddleware = async (ctx, next) => {
  // Only handle text messages — pass everything else down the chain
  if (ctx.message.contentType?.typeId !== 'text') {
    await next();
    return;
  }

  const content = ctx.message.content as string;
  const sessionKey = getOrCreateSession(ctx.conversation.id);

  try {
    console.log(`[ClawdbotAdapter] ${AGENT_NAME} → session ${sessionKey}: ${content.slice(0, 60)}`);
    const reply = await askClawdbot(sessionKey, content);
    await ctx.conversation.sendText(reply);
  } catch (err) {
    console.error('[ClawdbotAdapter] Error:', err);
    await ctx.conversation.sendText(
      "Ship's computer is experiencing a brief anomaly. Try again in a moment.",
    );
    await next();
  }
};
