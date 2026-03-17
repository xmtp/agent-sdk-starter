// Starts a local gateway then runs the agent through it.
// Usage: npm run start:gateway

import assert from "node:assert";
import "dotenv-defaults/config";
import { startGateway } from "@xmtp/gateway";

function env(name: string): string {
  const val = process.env[name];
  assert(val, `Missing env var: ${name}`);
  return val;
}

const gateway = await startGateway({
  payerPrivateKey: env("PAYER_PRIVATE_KEY"),
  redisUrl: env("REDIS_URL"),
  appChainRpcUrl: env("APP_CHAIN_RPC_URL"),
  appChainWssUrl: env("APP_CHAIN_WSS_URL"),
  settlementChainRpcUrl: env("SETTLEMENT_CHAIN_RPC_URL"),
  settlementChainWssUrl: env("SETTLEMENT_CHAIN_WSS_URL"),
  contractsEnvironment: process.env.CONTRACTS_ENVIRONMENT ?? "testnet",
  logLevel: process.env.LOG_LEVEL ?? "info",
});

console.log(`Gateway running at ${gateway.url}`);
process.env.XMTP_GATEWAY_HOST = gateway.url;

await import("./index.js");

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await gateway.stop();
    process.exit(0);
  });
}
