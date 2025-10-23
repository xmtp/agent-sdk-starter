// Import .env
import 'dotenv-defaults/config';
// Import Agent SDK
import {Agent, AgentError, XmtpEnv} from '@xmtp/agent-sdk';
import {getTestUrl} from '@xmtp/agent-sdk/debug';
import {CommandRouter} from '@xmtp/agent-sdk/middleware';
import {createSigner, createUser} from '@xmtp/agent-sdk/user';
import path from 'node:path';

const dbDirectory = process.env.XMTP_DB_DIRECTORY ?? path.join('.', '.backup');

type CreateOptions = Exclude<Parameters<(typeof Agent)['createFromEnv']>[0], undefined>;

const options: CreateOptions = {
  env: (process.env.XMTP_ENV as XmtpEnv) ?? 'dev',
  dbPath: (inboxId: string) => {
    const dbPath = path.join(dbDirectory, `xmtp-${inboxId}.db3`);
    console.info(`Saving local database to "${dbPath}"`);
    return dbPath;
  },
  dbEncryptionKey: process.env.XMTP_DB_ENCRYPTION_KEY
    ? Buffer.from(process.env.XMTP_DB_ENCRYPTION_KEY, 'hex')
    : undefined,
};

const agent = process.env.XMTP_WALLET_KEY
  ? await Agent.createFromEnv(options)
  : await Agent.create(createSigner(createUser()), options);

const router = new CommandRouter();

router.command('/version', async ctx => {
  await ctx.conversation.send(`v${process.env.npm_package_version}`);
});

agent.use(router.middleware());

agent.on('attachment', ctx => {
  console.log('Received attachment:', ctx.message.content);
});

agent.on('reaction', ctx => {
  console.log('Received reaction:', ctx.message.content);
});

agent.on('reply', ctx => {
  console.log('Received reply:', ctx.message.content);
});

agent.on('text', async ctx => {
  await ctx.conversation.send(`Echo: ${ctx.message.content}`);
});

agent.on('dm', async ctx => {
  await ctx.conversation.send('Hello you!');
});

agent.on('group', async ctx => {
  await ctx.conversation.send('Hello group!');
});

const errorHandler = (error: unknown) => {
  if (error instanceof AgentError) {
    console.log(`Caught error ID "${error.code}"`, error);
    console.log('Original error', error.cause);
  } else {
    console.log(`Caught error`, error);
  }
};

agent.on('unhandledError', errorHandler);

agent.on('start', ctx => {
  console.log(`We are online: ${getTestUrl(ctx.client)}`);
  console.info(`My address: ${ctx.getClientAddress()}`);
});

agent.on('stop', ctx => {
  console.log('Agent stopped', ctx);
});

await agent.start();
console.log('Agent has started.');
