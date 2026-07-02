#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install dependencies with pnpm (lockfile present, idempotent).
# Using `install` (not `--frozen-lockfile`) so the cached container state is reusable.
pnpm install
