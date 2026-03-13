#!/usr/bin/env bash
set -e

echo "=== QR Generator — Developer Setup ==="

# Check Node.js
if ! command -v node &>/dev/null; then
  echo ""
  echo "Node.js is not installed."
  echo "Install via nvm (recommended):"
  echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
  echo "  nvm install --lts"
  echo ""
  echo "Or download from https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -v)
echo "Node.js: $NODE_VER"

# Check npm
if ! command -v npm &>/dev/null; then
  echo "npm not found. Please reinstall Node.js."
  exit 1
fi

echo "npm: $(npm -v)"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Setup complete!"
echo ""
echo "Run the app:"
echo "  npm start"
echo ""
echo "Build for distribution:"
echo "  npm run build:linux"
echo "  npm run build:win"
echo "  npm run build:mac"
