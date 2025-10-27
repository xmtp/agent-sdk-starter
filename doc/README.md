# XMTP Key Generator

A simple web-based tool to generate secure random keys for XMTP Agent SDK.

## Usage

Open `index.html` in your browser to generate:

- **XMTP Wallet Key**: A 64-character hexadecimal private key (with 0x prefix)
- **Database Encryption Key**: A 64-character hexadecimal key for database encryption

## Features

- 🔒 Secure client-side generation using `crypto.getRandomValues()`
- 📋 One-click copy to clipboard
- ✨ Generate all keys at once
- 🎨 Clean, modern UI

## Security

All keys are generated locally in your browser using the Web Crypto API. No data is sent to any server.

**Important**: Never share your private keys. Store them securely using environment variables or secrets management systems.

## Quick Start

```bash
# Open the generator in your default browser (macOS)
open doc/index.html

# Or serve it locally with Python
python3 -m http.server 8000 --directory doc
# Then visit http://localhost:8000
```
