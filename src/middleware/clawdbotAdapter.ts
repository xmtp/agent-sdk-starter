/**
 * ClawdbotAdapter — routes XMTP messages into the Clawdbot session API.
 *
 * Uses the Gateway WebSocket control API (chat.send) for synchronous replies.
 * POST /hooks/agent is always async (202) — this adapter uses WS instead.
 *
 * Env vars:
 *   CLAWDBOT_API_URL   — base URL of the Clawdbot Gateway (e.g. http://localhost:18789)
 *   CLAWDBOT_GW_TOKEN  — Gateway control UI auth token (gateway.auth.token in config)
 *   AGENT_NAME         — which OS-1 agent this instance represents (jared|jean|sam)
 */

import type {AgentMiddleware} from '@xmtp/agent-sdk';
import {WebSocket} from 'ws';

const CLAWDBOT_API_URL = process.env.CLAWDBOT_API_URL ?? 'http://localhost:18789';
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
 * Send a message to a Clawdbot session via WebSocket and wait for the reply.
 * Uses the Gateway control API: chat.send + streaming chat events.
 */
async function sendViaWebSocket(sessionKey: string, message: string): Promise<string> {
  const wsUrl = CLAWDBOT_API_URL.replace(/^http/, 'ws');
  const runId = `xmtp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, {
      headers: CLAWDBOT_GW_TOKEN
        ? {Authorization: `Bearer ${CLAWDBOT_GW_TOKEN}`}
        : {},
    });

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket reply timeout'));
    }, 60000);

    let replyChunks: string[] = [];
    let runStarted = false;

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          type: 'chat.send',
          sessionKey,
          message,
          idempotencyKey: runId,
        }),
      );
    });

    ws.on('message', (raw: Buffer) => {
      try {
        const event = JSON.parse(raw.toString()) as {
          type?: string;
          event?: string;
          status?: string;
          text?: string;
          delta?: string;
          reply?: string;
          error?: string;
          runId?: string;
        };

        if (event.type === 'chat' || event.event === 'chat') {
          if (event.status === 'started') {
            runStarted = true;
          } else if (event.delta) {
            replyChunks.push(event.delta);
          } else if (event.status === 'ok' || event.status === 'done') {
            clearTimeout(timeout);
            ws.close();
            const reply = event.reply ?? replyChunks.join('');
            resolve(reply || '(no response)');
          } else if (event.status === 'error') {
            clearTimeout(timeout);
            ws.close();
            reject(new Error(event.error ?? 'Agent run failed'));
          }
        }
      } catch {
        // ignore parse errors on non-JSON frames
      }
    });

    ws.on('error', err => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      if (runStarted && replyChunks.length > 0) {
        resolve(replyChunks.join(''));
      } else if (!runStarted) {
        reject(new Error('WebSocket closed before run started'));
      }
    });
  });
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
    console.log(`[ClawdbotAdapter] Routing to session ${sessionKey}`);
    const reply = await sendViaWebSocket(sessionKey, content);
    await ctx.conversation.sendText(reply);
  } catch (err) {
    console.error('[ClawdbotAdapter] Error:', err);
    await ctx.conversation.sendText(
      "Ship's computer is experiencing a brief anomaly. Try again in a moment.",
    );
    await next();
  }
};
