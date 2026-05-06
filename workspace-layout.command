#!/bin/bash

# land-ops-ai workspace layout
# Opens VS Code and a Terminal for the project

PROJECT_DIR="$HOME/Desktop/land-ops-ai"

# Fallback: try common locations if not on Desktop
if [ ! -d "$PROJECT_DIR" ]; then
  PROJECT_DIR="$HOME/Documents/land-ops-ai"
fi
if [ ! -d "$PROJECT_DIR" ]; then
  PROJECT_DIR="$HOME/land-ops-ai"
fi

# Open VS Code
if command -v code &>/dev/null; then
  code "$PROJECT_DIR"
else
  open -a "Visual Studio Code" "$PROJECT_DIR" 2>/dev/null || \
    osascript -e 'display alert "VS Code not found" message "Install VS Code or add '\''code'\'' to your PATH."'
fi

# Open a Terminal window at the project directory
osascript <<EOF
tell application "Terminal"
  activate
  do script "cd \"$PROJECT_DIR\" && echo '🌱 land-ops-ai workspace ready'"
end tell
EOF
