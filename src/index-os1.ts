/**
 * OS-1 XMTP Agent entry point.
 *
 * Replaces the default echo agent with a Clawdbot-backed agent:
 * incoming XMTP messages → ClawdbotAdapter → agent session → reply.
 *
 * Usage:
 *   cp .env.os1 .env   # set AGENT_NAME, CLAWDBOT_API_URL, CLAWDBOT_API_TOKEN
 *   npm run start:os1
 */

import 'dotenv-defaults/config.js';
import {Agent, AgentError} from '@xmtp/agent-sdk';
import {getTestUrl} from '@xmtp/agent-sdk/debug';
import {CommandRouter} from '@xmtp/agent-sdk/middleware';
import {clawdbotAdapter} from './middleware/clawdbotAdapter.js';
import {isFromOwner} from './middleware/isFromOwner.js';

const AGENT_NAME = process.env.AGENT_NAME ?? 'jared';

const agent = await Agent.createFromEnv({
  appVersion: `@os1/xmtp-agent-${AGENT_NAME}`,
});

const router = new CommandRouter();

router.command('/version', async ctx => {
  await ctx.conversation.sendText(
    `OS-1 XMTP Agent — ${AGENT_NAME} | @xmtp/agent-sdk`,
  );
});

router.command('/status', async ctx => {
  await ctx.conversation.sendText(
    `🟢 ${AGENT_NAME} online | XMTP production | Clawdbot adapter active`,
  );
});

// Unhandled errors
agent.on('unhandledError', (error: unknown) => {
  if (error instanceof AgentError) {
    console.error(`[${AGENT_NAME}] AgentError "${error.code}":`, error.cause);
  } else {
    console.error(`[${AGENT_NAME}] Error:`, error);
  }
});

agent.on('stop', ctx => {
  console.log(`[${AGENT_NAME}] Agent stopped`, ctx);
});

agent.on('start', ctx => {
  console.log(`[${AGENT_NAME}] Online: ${getTestUrl(ctx.client)}`);
  console.log(`[${AGENT_NAME}] Address: ${ctx.getClientAddress()}`);
});

// Middleware stack: owner gate (optional) → slash commands → Clawdbot adapter
if (process.env.XMTP_OWNER_ADDRESS) {
  agent.use(isFromOwner);
}
agent.use(router.middleware());
agent.use(clawdbotAdapter);

await agent.start();
console.log(`[${AGENT_NAME}] Agent started.`);
