#!/usr/bin/env bash
set -euo pipefail

description="${1:-}"
remote="${2:-origin}"
base_branch="${3:-main}"

if [[ -z "$description" ]]; then
  echo "Usage: $0 <description> [remote] [base-branch]" >&2
  exit 1
fi

if [[ "$description" =~ [[:space:]] ]]; then
  echo "Description cannot contain spaces. Use hyphens instead." >&2
  exit 1
fi

date_str="$(date +%Y-%m-%d)"
worktree_path=".worktrees/${date_str}-${description}"
branch="chore/${date_str}-${description}"

git fetch "$remote" >/dev/null
git worktree add "$worktree_path" -b "$branch" "$remote/$base_branch"

if [[ -d "node_modules" ]]; then
  cp -R "node_modules" "${worktree_path}/node_modules"
fi
