#!/usr/bin/env bash
#
# Installs the WebTAK Channels plugin into TAK Server's extracted WebTAK app.
#
# Unlike the sibling Video Viewer plugin, Channels needs NO deploy-time config: it talks
# to the Marti groups API on the same origin WebTAK is served from, using the operator's
# existing session cookie. So this installer just:
#   1. copies the bundle into  <webtak>/plugins/watc-channels/
#   2. adds an entry to the manifest's "plugins" array (idempotent)
#
# Usage:  sudo ./install.sh              # install / re-apply
#         sudo ./install.sh --remove      # uninstall
set -euo pipefail

WEBTAK_DIR="${WEBTAK_DIR:-/opt/tak/extract/webtak}"
PLUGIN_ID="watc-channels"
BUNDLE="webtak-channels.plugin.js"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MANIFEST="$WEBTAK_DIR/webtak-manifest.json"
DEST_DIR="$WEBTAK_DIR/plugins/$PLUGIN_ID"
REL_PATH="plugins/$PLUGIN_ID/$BUNDLE"       # path as WebTAK resolves it (relative to webtak root)
SRC_BUNDLE="$SCRIPT_DIR/dist/$BUNDLE"

command -v python3 >/dev/null || { echo "ERROR: python3 required."; exit 1; }
[ -f "$MANIFEST" ] || { echo "ERROR: $MANIFEST not found. Set WEBTAK_DIR."; exit 1; }

# Guard: refuse to touch a manifest that is already invalid JSON (would wipe icon sets etc.).
python3 -c "import json; json.load(open('$MANIFEST'))" 2>/dev/null \
  || { echo "ERROR: $MANIFEST is not valid JSON. Fix it first, then re-run."; exit 1; }

REMOVE=0
case "${1:-}" in
  --remove) REMOVE=1 ;;
  "")       ;;
  *)        echo "Unknown arg: $1"; exit 1 ;;
esac

# --- Install / remove --------------------------------------------------------
if [ "$REMOVE" = "1" ]; then
  rm -rf "$DEST_DIR"
else
  [ -f "$SRC_BUNDLE" ] || { echo "ERROR: $SRC_BUNDLE missing. Run 'node build.js' first."; exit 1; }
  mkdir -p "$DEST_DIR"
  cp "$SRC_BUNDLE" "$DEST_DIR/$BUNDLE"
  echo "Copied bundle -> $DEST_DIR/$BUNDLE"
fi

# Patch the manifest's plugins[] array. Backup first, write atomically.
cp "$MANIFEST" "$MANIFEST.bak.$(date +%s)"
python3 - "$MANIFEST" "$REL_PATH" "$REMOVE" <<'PY'
import json, sys, os
manifest, rel, remove = sys.argv[1], sys.argv[2], sys.argv[3] == "1"
with open(manifest) as f:
    data = json.load(f)
plugins = data.get("plugins")
if not isinstance(plugins, list):
    plugins = []

def entry_path(e):
    return e if isinstance(e, str) else (e.get("path") if isinstance(e, dict) else None)

# Drop any existing entry for our path (string or object form), then re-add as a
# plain STRING — matches how the Video Viewer plugin registers (this WebTAK build's
# manifest validator rejects object entries).
plugins = [e for e in plugins if entry_path(e) != rel]
if not remove:
    plugins.append(rel)

data["plugins"] = plugins
orig_mode = os.stat(manifest).st_mode
tmp = manifest + ".tmp"
with open(tmp, "w") as f:
    json.dump(data, f, indent=2)
# Preserve the original file's permissions regardless of the process umask — otherwise a
# restrictive umask here can silently make the manifest unreadable by WebTAK's server
# process (403 on manifest.json -> grey screen). See the Video Viewer plugin's install.sh
# for the incident this guards against.
os.chmod(tmp, orig_mode)
os.replace(tmp, manifest)
print(("Removed" if remove else "Registered") + f" plugin entry: {rel}")
PY

if [ "$REMOVE" = "1" ]; then
  echo "Uninstalled. Hard-refresh WebTAK (Ctrl-Shift-R)."
else
  echo "Done. Hard-refresh WebTAK (Ctrl-Shift-R)."
fi
