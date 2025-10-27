// Import .env
import 'dotenv-defaults/config';
// Import Agent SDK
import {Agent, AgentError} from '@xmtp/agent-sdk';
import {getTestUrl} from '@xmtp/agent-sdk/debug';
import {CommandRouter} from '@xmtp/agent-sdk/middleware';

const agent = await Agent.createFromEnv();

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

await agent.start();
console.log('Agent has started.');
