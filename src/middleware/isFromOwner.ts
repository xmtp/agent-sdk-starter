import {type AgentMiddleware} from '@xmtp/agent-sdk';

export const isFromOwner: AgentMiddleware = async (ctx, next) => {
  const ownerAddress = process.env.XMTP_OWNER_ADDRESS;

  if (!ownerAddress) {
    throw new Error(`Owner middleware requires XMTP_OWNER_ADDRESS environment variable to be set.`);
  }

  const senderAddress = await ctx.getSenderAddress();

  // Ethereum addresses are case-insensitive, and the owner address may be
  // provided in a different casing (e.g. EIP-55 checksummed) than the sender
  // address returned by the SDK, so compare them case-insensitively.
  if (senderAddress?.toLowerCase() === ownerAddress.toLowerCase()) {
    // Continue message processing
    await next();
  } else {
    // Block message processing
    console.warn(
      `Ignoring message from "${senderAddress}" - only messages from owner "${ownerAddress}" are processed.`
    );
    return;
  }
};
