# XMTP Agent SDK Starter

A starter project for XMTP's [Agent SDK](https://www.npmjs.com/package/@xmtp/agent-sdk) to build agents that operate on the [XMTP network](https://xmtp.org/).

## Quick Start

### Local Development

Create a `.env` file in the project root with your [XMTP credentials](https://docs.xmtp.org/agents/concepts/identity):

```bash
XMTP_WALLET_KEY=0x...
XMTP_DB_ENCRYPTION_KEY=0x...
XMTP_ENV=production
```

If you do not have an existing Ethereum wallet, generate test keys at https://xmtp.github.io/agent-sdk-starter/ (keys are generated locally in your browser).

Then install dependencies and start the agent process:

```bash
npm install
npm start
```

After a successful start, open the test URL printed in the console and send a direct message; it should respond with the default greeting and echo your message.

If you require a sandboxed environment or do not have Node.js installed, you can run everything in GitHub Codespaces instead of locally.

### GitHub Codespaces

This project includes a GitHub Codespaces configuration.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/xmtp/agent-sdk-starter)

After the environment starts, launch the agent:

```bash
npm start
```

### Deploy to Render

Render supports [Persistent Disks](https://render.com/docs/disks) and one-click deployments using the bundled `render.yaml` blueprint:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/xmtp/agent-sdk-starter)

### Support

Chat with `xmtp-docs.eth` on [XMTP.chat](http://xmtp.chat/production/dm/xmtp-docs.eth) or the [Base app](https://docs.base.org/) if you need help while developing with XMTP.
