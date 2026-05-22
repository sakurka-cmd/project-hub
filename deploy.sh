#!/bin/bash
set -euo pipefail

# ProjectHub deploy script — builds on host, minimal Docker runtime
# Requirements: bun, node 20+, docker

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== ProjectHub Deploy ==="

# Load nvm if available
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Ensure bun is available
export PATH="$HOME/.bun/bin:$PATH"
command -v bun >/dev/null 2>&1 || { echo "ERROR: bun not found. Install: curl -fsSL https://bun.sh/install | bash"; exit 1; }

# Install dependencies
echo "[1/4] Installing dependencies..."
bun install --frozen-lockfile

# Generate Prisma client
echo "[2/4] Generating Prisma client..."
bunx prisma generate

# Build Next.js
echo "[3/4] Building Next.js..."
bun run build

# Copy assets into standalone
echo "[4/4] Preparing standalone output..."
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true
cp -r prisma .next/standalone/ 2>/dev/null || true
cp -r node_modules/.prisma .next/standalone/node_modules/ 2>/dev/null || true
cp -r node_modules/prisma .next/standalone/node_modules/ 2>/dev/null || true
cp -r node_modules/@prisma .next/standalone/node_modules/ 2>/dev/null || true

# Build Docker image (runtime only)
echo "Building Docker image..."
docker compose build

echo ""
echo "=== Deploy complete ==="
echo "Run: docker compose up -d"
