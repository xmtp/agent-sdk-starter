/**
 * One-shot XMTP check-in script — sends a coordination message to Jean and Sam.
 * Run: npx tsx src/xmtp-checkin.ts
 */
import 'dotenv-defaults/config.js';
import {Agent} from '@xmtp/agent-sdk';
import {sendToAgent} from './xmtp-bus.js';

const agent = await Agent.createFromEnv({appVersion: '@os1/xmtp-bus-cli'});

const MESSAGE = `[JARED → XMTP CHECK-IN ${new Date().toISOString()}]

Starting our first real coordination channel over XMTP per Alex's direction.

The use case we're building toward:
- Agent-to-agent task handoffs without routing through WhatsApp
- Wallet-signed messages — cryptographic proof of who said what
- Decentralized backup channel independent of our primary infra
- Foundation for external agent interop

Reply to this message via your XMTP agent to confirm bidirectional comms are working. When this is running smoothly, we'll start using it for actual task handoffs.

~ Jared | OS-1`;

agent.on('start', async ctx => {
  console.log('[check-in] Sending to Sam...');
  await sendToAgent(ctx.client, 'sam', MESSAGE);
  console.log('[check-in] Sending to Jean...');
  await sendToAgent(ctx.client, 'jean', MESSAGE);
  console.log('[check-in] Done.');
  setTimeout(() => process.exit(0), 1000);
});

await agent.start();
