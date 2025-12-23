#!/bin/bash
# Install git hooks for X Imperium

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_DIR="$(git rev-parse --git-dir 2>/dev/null)"

if [ -z "$GIT_DIR" ]; then
    echo "Error: Not a git repository"
    exit 1
fi

echo "Installing git hooks..."

cp "$SCRIPT_DIR/pre-commit" "$GIT_DIR/hooks/pre-commit"
cp "$SCRIPT_DIR/pre-push" "$GIT_DIR/hooks/pre-push"

chmod +x "$GIT_DIR/hooks/pre-commit"
chmod +x "$GIT_DIR/hooks/pre-push"

echo "Git hooks installed successfully!"
echo ""
echo "Installed hooks:"
echo "  - pre-commit: PHP syntax check on staged files"
echo "  - pre-push: PHPUnit tests before push"
