module.exports = {
  apps: [{
    name: 'xmtp-jared',
    script: 'node_modules/.bin/tsx',
    args: 'src/index-os1.ts',
    cwd: '/home/ubuntu/clawd/agent-sdk-starter',
    env: {
      XMTP_WALLET_KEY: '0x3786ca583417e071d4b0f73ec468628365ee3782d9704b4a35fbb92a1b841c7a',
      XMTP_DB_ENCRYPTION_KEY: '0x47181ca80f8181836b0212e12bca82475a0b7d06d04b15c677a484bbecd702ec',
      XMTP_ENV: 'production',
      AGENT_NAME: 'jared',
      CLAWDBOT_API_URL: 'http://localhost:18789',
      CLAWDBOT_API_TOKEN: 'xmtp-f20bfa269d40889fb93061319498ea82',
      CLAWDBOT_GW_TOKEN: '83f7dfea-a485-4241-9d71-6fb5c24b556f',
    },
    watch: false,
    restart_delay: 5000,
    max_restarts: 10,
  }],
};
