#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  TORII — Create Mac App (AppleScript-based)
#  Run once: bash make-mac-app.sh
#  Then double-click Torii.app from ~/Applications or Dock
# ─────────────────────────────────────────────────────────────

set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_OUT="/Applications/Torii.app"

# Detect npm path at build time (so it's hardcoded correctly)
NPM_PATH="$(which npm)"
NODE_PATH="$(which node)"
NODE_DIR="$(dirname "$NODE_PATH")"

echo "Detected npm: $NPM_PATH"
echo "Detected node: $NODE_PATH"
echo "Project folder: $DIR"

# Write the wait-and-open helper
cat > "$DIR/torii-open.sh" << HELPER
#!/bin/bash
PORT=3000
URL="http://localhost:\$PORT"

for i in \$(seq 1 60); do
  sleep 1
  if curl -s --max-time 1 "\$URL" > /dev/null 2>&1; then
    if open -a "Google Chrome" "\$URL" 2>/dev/null; then
      :
    else
      open "\$URL"
    fi
    exit 0
  fi
done

osascript -e 'display alert "Torii" message "Server did not start in time. Check Terminal for errors." as warning'
HELPER
chmod +x "$DIR/torii-open.sh"

# Write the Terminal launch script (with full PATH)
cat > "$DIR/torii-start.sh" << STARTER
#!/bin/bash
export PATH="${NODE_DIR}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
cd "${DIR}"
PORT=3000 "${NPM_PATH}" run dev
STARTER
chmod +x "$DIR/torii-start.sh"

echo "Creating Torii.app..."

osacompile -o "$APP_OUT" - << APPLESCRIPT
on run
  set toriiDir to "${DIR}"
  set thePort to "3000"
  set theURL to "http://localhost:" & thePort

  -- If already running, just open browser
  set isRunning to do shell script "lsof -ti:" & thePort & " > /dev/null 2>&1 && echo yes || echo no"
  if isRunning is "yes" then
    try
      tell application "Google Chrome"
        activate
        open location theURL
      end tell
    on error
      open location theURL
    end try
    return
  end if

  -- Open Terminal with full PATH set
  tell application "Terminal"
    activate
    do script "bash " & quoted form of (toriiDir & "/torii-start.sh")
  end tell

  -- Background watcher opens Chrome once server is ready
  do shell script "bash " & quoted form of (toriiDir & "/torii-open.sh") & " &> /tmp/torii-open.log &"
end run
APPLESCRIPT

echo ""
echo "✅  Torii.app created at: /Applications/Torii.app"
echo ""
echo "Double-click it to launch. Terminal opens briefly, Chrome opens automatically."
echo "Drag to your Dock for one-click access."
