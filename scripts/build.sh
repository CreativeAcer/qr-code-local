#!/usr/bin/env bash
set -e

VERSION=$(node -p "require('./package.json').version")
echo "=== Building QR Generator v${VERSION} ==="

TARGET="${1:-all}"

case "$TARGET" in
  linux)  npm run build:linux ;;
  win)    npm run build:win   ;;
  mac)    npm run build:mac   ;;
  all)    npm run build:all   ;;
  *)
    echo "Usage: $0 [linux|win|mac|all]"
    exit 1
    ;;
esac

echo ""
echo "Build complete. Artifacts in ./dist/"
ls -lh dist/ 2>/dev/null || true
