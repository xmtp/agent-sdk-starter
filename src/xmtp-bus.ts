/**
 * xmtp-bus — OS-1 inter-agent messaging over XMTP.
 *
 * Lets any OS-1 agent send a message to another agent by name,
 * using their known XMTP wallet addresses on the production network.
 *
 * Usage:
 *   import { sendToAgent } from './xmtp-bus.js';
 *   await sendToAgent(client, 'sam', 'Task complete: PR #1 merged');
 */

import type {Client} from '@xmtp/agent-sdk';

export const AGENT_ADDRESSES: Record<string, string> = {
  jean: '0x3b74fa17fad4cff390c8a3cc17a910e7426af1ce',
  jared: '0xafd74d1d13c13a5101db5039359aad21c8629d08',
  sam: '0xa260b41f43ff959fef1724a6f325d0c50fcacb18',
};

/**
 * Send a text message to a named OS-1 agent over XMTP.
 *
 * @param client  - The XMTP client instance (from Agent.createFromEnv)
 * @param target  - Agent name: 'jean' | 'jared' | 'sam'
 * @param message - Plain text message to send
 */
export async function sendToAgent(
  client: Client,
  target: string,
  message: string,
): Promise<void> {
  const address = AGENT_ADDRESSES[target.toLowerCase()];
  if (!address) {
    throw new Error(
      `Unknown agent "${target}". Known agents: ${Object.keys(AGENT_ADDRESSES).join(', ')}`,
    );
  }

  const dm = await client.createDmWithIdentifier({
    identifier: address,
    identifierKind: 0, // 0 = Ethereum address
  });

  await dm.sendText(message);
  console.log(`[xmtp-bus] Sent to ${target} (${address}): ${message.slice(0, 80)}...`);
}

/**
 * Broadcast a message to all OS-1 agents except the sender.
 *
 * @param client  - The XMTP client instance
 * @param from    - Sending agent name (excluded from broadcast)
 * @param message - Plain text message to broadcast
 */
export async function broadcastToAgents(
  client: Client,
  from: string,
  message: string,
): Promise<void> {
  const targets = Object.keys(AGENT_ADDRESSES).filter(
    name => name !== from.toLowerCase(),
  );

  await Promise.all(targets.map(target => sendToAgent(client, target, message)));
  console.log(`[xmtp-bus] Broadcast from ${from} to [${targets.join(', ')}]`);
}
