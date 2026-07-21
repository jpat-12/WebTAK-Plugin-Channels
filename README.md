# WebTAK Channels Plugin

Brings ATAK's **Channels** tool to WebTAK: a panel listing every TAK Server group
("channel") your connection is a member of, with a toggle per channel to turn its
CoT traffic on or off — instead of that control existing only in the ATAK client.

Built for the ILWG CAP / VISTA stack, as a WebTAK sibling to
[WebTAK-Plugin-VideoViewer](../WebTAK-Plugin-VideoViewer).

---

## The key insight: it's the same server-side mechanism ATAK uses

A "channel" in ATAK's Channels tool is not an ATAK concept at all — it's a **TAK Server
group** (a broadcast/data-sync group like `Blue`, `__ANON__`, or a mission's group).
Every connection (ATAK, WebTAK, or otherwise) is a member of some set of groups, and each
group can be independently active/inactive **for that connection**. Toggling a channel
off doesn't unsubscribe or delete anything server-side — it just stops CoT tagged with
that group from flowing to/from this connection.

TAK Server exposes exactly two endpoints for this, and ATAK's Channels manager is a thin
UI over them:

| Endpoint | Purpose |
|---|---|
| `GET /Marti/api/groups/all` | Every group the current session is a member of, each with an `active` flag |
| `PUT /Marti/api/groups/active` | Re-post the (possibly modified) group list; server flips each group's active bit for this connection |

This plugin is built the same way: no separate WebTAK-side "channels" model, just a
panel that reads and writes that same API. Because WebTAK's page origin **is** an
authenticated TAK Server client (session cookie already set), the plugin needs no host
config, API key, or separate login — unlike the Video Viewer plugin, which talks to a
different host (the Restreamer) and does need connection settings.

### Why a toggle only affects *future* data, not what's already on the map

Toggling a channel off tells the server to stop sending that group's CoT to this
connection from now on — it does **not** retroactively remove items already drawn on
your map from before you turned it off. This was checked directly, not assumed: WebTAK's
own CoT model (`window.WebTAK.cot`, and the `CotEvent`/`CotEventDetail` protobuf schema
inside WebTAK's shipped bundle) carries no group/channel tag on cached events at all — the
`access` field comes back blank, `detail.group` is CoT's `<__group>` **ATAK team/role**
field (e.g. "Cyan / Team Member"), not a Marti broadcast group, and there's no `marti`/
`dest` field anywhere in the schema. The Marti group filter happens entirely server-side,
before an event is ever forwarded to a client — so by the time WebTAK has it, there is no
data left saying which channel it came from. Matches ATAK's own behavior in this respect:
this is a property of the underlying TAK Server mechanism, not a gap specific to this
plugin.

---

## Layout

```
plugin/
  plugin.json          Plugin manifest
  index.js             WebTAK entry: registers a real docked drawer + sidebar tool,
                        falls back to a floating panel/button if that API is unavailable
  src/
    core.js            Framework-free singleton (window.TAKChannels)
    config.js          Runtime config (takServerBase override for dev), persisted to localStorage
    marti-groups.js     GET /Marti/api/groups/all + PUT /Marti/api/groups/active client
    ui.js               ChannelsPanel: filterable list + per-channel toggle switches,
                        mounts into any host element (WebTAK's own drawer container, or
                        the floating fallback below)
    floating-panel.js   Draggable chrome (header, close, drag) around ChannelsPanel —
                        only used when WebTAK's real drawer API isn't available
    styles.js           Injected CSS (docked-content rules + floating-chrome rules)
demo/
  standalone.html       Test the whole panel against a MOCKED Marti API, no TAK server needed
```

---

## Try it now (no WebTAK, no TAK server needed)

```bash
cd "WebTAK-Plugin-Channels"
python -m http.server 8080
# open http://localhost:8080/demo/standalone.html
```

The demo page stubs `window.fetch` for both Marti endpoints with an in-memory group
list, so you can exercise filtering, toggling, drag, and the optimistic-update /
revert-on-failure path before ever pointing this at a real server.

## Feature status

| Feature | State | Notes |
|---|---|---|
| List channels (`GET .../groups/all`) | ✅ Working | Same-origin fetch, session cookie auth |
| Toggle a channel (`PUT .../groups/active`) | ✅ Working | Optimistic UI update, reverts + shows error on failure |
| Filter/search by name | ✅ Working | Client-side, case-insensitive substring |
| Direction badge (IN / OUT / BOTH) | ✅ Working | Cosmetic only — doesn't affect the toggle |
| Real docked WebTAK drawer (like Contacts / Point Dropper) | ✅ Working | `Drawer` model + `drawers:[...]` on the Plugin, read directly out of WebTAK's own bundle — see `plugin/index.js` |
| Draggable floating panel | ✅ Working | Fallback only, when the real drawer API isn't present |
| WebTAK sidebar registration | ✅ Working | Falls back to a floating 🔀 launch button if the sidebar/drawer API is unavailable |
| Purge already-displayed map data when a channel is turned off | ⬜ Not possible | Checked directly against WebTAK's CoT model — no group/channel tag survives on a cached event to filter by (see above). Only *future* CoT for that group is stopped. |
| Group *creation/membership* management | ⬜ Out of scope | That's server-side admin (TAK Server's own group admin UI), not a per-connection toggle |

## Public API (`window.TAKChannels`)

| Method | Purpose |
|---|---|
| `.open()` | Open (or refresh + show) the Channels panel |
| `.close()` | Destroy the panel |
| `.configure(patch)` / `.getConfig()` | Read/update config (`takServerBase`) |
| `.showLaunchButton(label?)` | Floating launch button (used as WebTAK fallback) |

---

## Installing into WebTAK

WebTAK loads plugins listed in **`webtak-manifest.json`** via `loadScript()` — a classic
`<script>`, **not** an ES module. So the deployed artifact is a single self-contained
bundle built from `src/`. On the TAK Server, from a clone of this repo:

```bash
apt-get install -y nodejs && node build.js && chmod +x install.sh && sudo ./install.sh
```

(`node build.js` alone produces `dist/webtak-channels.plugin.js`, the classic-script IIFE;
`sudo ./install.sh` copies it in and registers it in `webtak-manifest.json`.)

`install.sh` (idempotent, re-run after any WAR upgrade):
1. copies `dist/webtak-channels.plugin.js` → `<webtak>/plugins/watc-channels/`
2. adds `plugins/watc-channels/webtak-channels.plugin.js` to the manifest's `plugins` array

Unlike the Video Viewer plugin, there's no config to prompt for — Channels needs no host,
port, or API key. It refuses to run if `webtak-manifest.json` is already invalid JSON (a
broken manifest disables *all* plugin loading), and backs the file up before editing.
`WEBTAK_DIR` defaults to `/opt/tak/extract/webtak` — override if yours differs.
Uninstall with `sudo ./install.sh --remove`. Hard-refresh WebTAK (Ctrl-Shift-R) after either.

**Note on integration:** once loaded, the bundle's `boot()` runs and registers a real
docked side drawer (`window.WebTAK.drawer.models.Drawer`) plus a sidebar tool
(`window.WebTAK.plugin.registerPlugin()`) — WebTAK 4.10's actual plugin/drawer API. Unlike
the Video Viewer plugin (which stopped at a sidebar-triggered floating window after an
earlier drawer attempt crashed WebTAK's render), this shape was confirmed by reading the
`Drawer` class and `PluginService.registerPlugin()` directly out of WebTAK 4.10.2's
shipped bundle (`webtak-core-v4.10.2.zip`, `build/static/js/main.*.js`) rather than
guessed from a live session, so it should render Channels as a real vertical tab
alongside Contacts/Point Dropper. If that API isn't present on your WebTAK build, or
registration fails for any reason, it falls back to a floating 🔀 launch button so
Channels stays usable regardless. `window.TAKChannels` is always available.

### Dev / test without WebTAK

`plugin/` stays as ES modules for development; `demo/standalone.html` loads them directly
against a mocked Marti API. Only the built `dist/` bundle goes into WebTAK.

---

## Notes & limits

- **Requires an authenticated WebTAK session** — the plugin is same-origin and relies on
  the page's existing TAK Server session cookie. There's nothing to configure for this in
  production; `takServerBase` in Settings exists only to point at a different server
  during local development.
- **PUT sends the full group list**, not a diff — TAK Server matches groups by
  `(name, direction)`, so `marti-groups.js` always re-sends everything it fetched, with
  only the toggled group's `active` flag changed.
- A **401/403** from either endpoint means the session isn't authenticated to this TAK
  server; the panel surfaces that as an error instead of silently showing an empty list.
