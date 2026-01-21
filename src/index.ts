// Import .env
import 'dotenv-defaults/config.js';
// Import Agent SDK
import {Agent, AgentError} from '@xmtp/agent-sdk';
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
  await ctx.sendText(`My libXMTP version is: ${libXmtpVersion}`);
});

router.command('/send-image', async ctx => {
  const file = createImageFile();

  const uploadCallback: AttachmentUploadCallback = async attachment => {
    const pinata = new PinataSDK({
      pinataJwt: `${process.env.PINATA_JWT}`,
      pinataGateway: `${process.env.PINATA_GATEWAY}`,
    });

    const mimeType = 'application/octet-stream';
    const encryptedBlob = new Blob([Buffer.from(attachment.content.payload)], {
      type: mimeType,
    });
    const encryptedFile = new File([encryptedBlob], attachment.filename, {
      type: mimeType,
    });
    const upload = await pinata.upload.public.file(encryptedFile);

    return pinata.gateways.public.convert(`${upload.cid}`);
  };

  await ctx.sendRemoteAttachment(file, uploadCallback);
});

agent.on('attachment', async ctx => {
  const receivedAttachment = await downloadRemoteAttachment(ctx.message.content, agent);
  console.log(`Received attachment: ${receivedAttachment.filename}`);
});

agent.on('reaction', ctx => {
  console.log('Received reaction:', ctx.message.content);
});

agent.on('reply', ctx => {
  console.log('Received reply:', ctx.message.content);
});

agent.on('text', async ctx => {
  await ctx.sendText(`Echo: ${ctx.message.content}`);
});

agent.on('dm', async ctx => {
  await ctx.sendText('Hello you!');
});

agent.on('group', async ctx => {
  await ctx.sendText('Hello group!');
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
