#!/bin/bash
# Vercel build script
set -e

echo "=== Installing frontend dependencies ==="
cd packages/frontend
npm install --legacy-peer-deps 2>/dev/null || true

echo "=== Building frontend ==="
npx vite build

echo "=== Build complete ==="
