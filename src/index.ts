// Import .env
import 'dotenv-defaults/config.js';
// Import Agent SDK
import {Agent, AgentError, ReactionSchema} from '@xmtp/agent-sdk';
import {getTestUrl} from '@xmtp/agent-sdk/debug';
import {type AttachmentUploadCallback, downloadRemoteAttachment} from '@xmtp/agent-sdk/util';
import {CommandRouter} from '@xmtp/agent-sdk/middleware';
import {PinataSDK} from 'pinata';
import {createImageFile} from './createImageFile.js';
import {isFromOwner} from './middleware/isFromOwner.js';

const agent = await Agent.createFromEnv({
  appVersion: '@xmtp/agent-sdk-starter',
});

const router = new CommandRouter();

router.command('/version', async ctx => {
  const libXmtpVersion = ctx.client.libxmtpVersion;
  await ctx.conversation.sendText(`My libXMTP version is: ${libXmtpVersion}`);
});

router.command('/send-image', async ctx => {
  const file = createImageFile();

  const uploadCallback: AttachmentUploadCallback = async attachment => {
    const pinata = new PinataSDK({
      pinataJwt: `${process.env.PINATA_JWT}`,
      pinataGateway: `${process.env.PINATA_GATEWAY}`,
    });

    const mimeType = 'application/octet-stream';
    const encryptedBlob = new Blob([Buffer.from(attachment.payload)], {
      type: mimeType,
    });
    const encryptedFile = new File([encryptedBlob], attachment.filename || 'untitled', {
      type: mimeType,
    });
    const upload = await pinata.upload.public.file(encryptedFile);

    return pinata.gateways.public.convert(`${upload.cid}`);
  };

  await ctx.sendRemoteAttachment(file, uploadCallback);
});

router.command('/test', async ctx => {
  // 1. Send text message
  await ctx.conversation.sendText('This is a plain text message.');

  // 2. Send markdown message
  await ctx.conversation.sendMarkdown('**Bold text** and *italic text* with `code`.');

  // 3. Send reply to the original message
  await ctx.sendTextReply('This is a reply to your /test command.');

  // 4. Send reactions with different schemas
  await ctx.sendReaction('👍', ReactionSchema.Unicode);
  await ctx.sendReaction(':heart:', ReactionSchema.Shortcode);
  await ctx.sendReaction('custom-reaction-id', ReactionSchema.Custom);
  await ctx.sendReaction('', ReactionSchema.Unknown);

  // 5. Send attachment
  const file = createImageFile();
  const uploadCallback: AttachmentUploadCallback = async attachment => {
    const pinata = new PinataSDK({
      pinataJwt: `${process.env.PINATA_JWT}`,
      pinataGateway: `${process.env.PINATA_GATEWAY}`,
    });

    const mimeType = 'application/octet-stream';
    const encryptedBlob = new Blob([Buffer.from(attachment.payload)], {
      type: mimeType,
    });
    const encryptedFile = new File([encryptedBlob], attachment.filename || 'untitled', {
      type: mimeType,
    });
    const upload = await pinata.upload.public.file(encryptedFile);

    return pinata.gateways.public.convert(`${upload.cid}`);
  };
  await ctx.sendRemoteAttachment(file, uploadCallback);

  // Final confirmation
  await ctx.conversation.sendText('✅ Sent all content types!');
});

agent.on('attachment', async ctx => {
  const receivedAttachment = await downloadRemoteAttachment(ctx.message.content);
  console.log(`Received attachment: ${receivedAttachment.filename}`);
});

agent.on('reaction', ctx => {
  console.log('Received reaction:', ctx.message.content);
});

agent.on('reply', ctx => {
  console.log('Received reply:', ctx.message.content);
});

agent.on('text', async ctx => {
  await ctx.conversation.sendText(`Echo: ${ctx.message.content}`);
});

agent.on('dm', async ctx => {
  await ctx.conversation.sendMarkdown('**Hello you!**');
});

agent.on('group', async ctx => {
  await ctx.conversation.sendText('**Hello group!**');
});

agent.on('unhandledError', (error: unknown) => {
  if (error instanceof AgentError) {
    console.log(`Caught error ID "${error.code}"`, error);
    console.log('Original error', error.cause);
  } else {
    console.log(`Caught error`, error);
  }
});

agent.on('stop', ctx => {
  console.log('Agent stopped', ctx);
});

agent.on('start', ctx => {
  console.log(`We are online: ${getTestUrl(ctx.client)}`);
  console.info(`My address: ${ctx.getClientAddress()}`);
});

if (process.env.XMTP_OWNER_ADDRESS) {
  agent.use(isFromOwner);
}
agent.use(router.middleware());
await agent.start();
console.log('Agent has started.');
