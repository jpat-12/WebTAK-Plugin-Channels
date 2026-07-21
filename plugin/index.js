// WebTAK entry point.
//
// WebTAK 4.10's real plugin/sidebar API is window.WebTAK.plugin.registerPlugin(), which
// takes a Plugin model instance built from Tool instances (window.WebTAK.tool.models.Tool)
// and, for a real docked side panel like Contacts/Point Dropper, Drawer instances
// (window.WebTAK.drawer.models.Drawer). This shape is NOT guessed: it was read directly
// out of WebTAK 4.10.2's shipped bundle (build/static/js/main.*.js in
// webtak-core-v4.10.2.zip) — specifically the Drawer class constructor and
// PluginService.registerPlugin(), which forwards each entry in a Plugin's `drawers`
// array to DrawerService.registerDrawer() for us.
//
// Drawer's `mount`/`unmount` contract: WebTAK checks `mount.length` (its declared arity).
// A 1-argument mount (`mount(container)`) is treated as plain-DOM mode — WebTAK calls
// mount(container)/unmount(container) directly on a real element, no React needed. A
// 0-argument mount is treated as "returns a React element" instead. We use the DOM path
// since this plugin has no framework dependency (see ../plugin/src/*.js).
//
// Registration is wrapped so any unexpected failure (wrong WebTAK build, API shape
// drift) can only fall back to the floating panel/button, never crash WebTAK — this is
// the same defensive posture the sibling Video Viewer plugin uses after an earlier,
// less careful attempt at drawer registration blanked WebTAK's page (grey screen).
//
// Plugin constructor requires: name, description, version (non-empty strings), and
// tools/drawers as arrays (even empty). Tool/Drawer instances must be real
// `new Tool(...)` / `new Drawer(...)` objects, not plain object literals.

import channels from './src/core.js';
import { ChannelsPanel } from './src/ui.js';
import { injectStyles } from './src/styles.js';

const LOG = '[WebTAK Channels]';
const PLUGIN_ID = 'watc-channels';

// 24x24 shuffle/channels glyph, so we don't depend on WebTAK's built-in icon font names.
const ICON_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij48cGF0aCBmaWxsPSIjRDVENUQ1IiBkPSJNMTcgM2w0IDQtNCA0VjhoLTVMOSA1bDMtM2gyLjV2MXptLTEwIDVsLTQgNCA0IDR2LTNoNWwzLTMtMy0zSDd6bTEwIDVsNCA0LTQgNHYtM2gtNS41bC0yLjUtMi41IDIuNS0yLjVIMTd2LTJ6Ii8+PC9zdmc+';

// Builds a real Drawer if window.WebTAK.drawer's model is present, else null (caller
// falls back to the floating panel). `content` tracks the mounted ChannelsPanel so
// unmount() can tear it down cleanly if WebTAK detaches/reattaches the drawer.
function buildDrawer(drawerApi) {
  if (!drawerApi || !drawerApi.models || !drawerApi.models.Drawer) return null;
  let content = null;
  return new drawerApi.models.Drawer({
    name: PLUGIN_ID,
    displayName: 'Channels',
    orientation: 'side',
    mount: (container) => {
      injectStyles();
      content = new ChannelsPanel(container);
    },
    unmount: () => {
      content?.destroy();
      content = null;
    },
  });
}

function registerWithWebTAK() {
  try {
    const toolApi = window.WebTAK && window.WebTAK.tool;
    const pluginApi = window.WebTAK && window.WebTAK.plugin;
    const drawerApi = window.WebTAK && window.WebTAK.drawer;
    if (!toolApi || !pluginApi) return false;

    if (pluginApi.hasPlugin(PLUGIN_ID)) return true; // already registered (e.g. hot reload)

    const drawer = buildDrawer(drawerApi);

    const tool = new toolApi.models.Tool({
      category: 'other',
      iconUrl: ICON_URL,
      name: PLUGIN_ID,
      title: 'Channels',
      deviceTypes: 'all',
      onClick: () => (drawer ? drawer.open() : channels.open()),
    });

    const plugin = new pluginApi.models.Plugin({
      name: PLUGIN_ID,
      description: 'Toggle which TAK Server groups (data-sync channels) are active for this connection.',
      version: '0.1.0',
      tools: [tool],
      drawers: drawer ? [drawer] : [],
    });

    pluginApi.registerPlugin(plugin);
    const ok = pluginApi.hasPlugin(PLUGIN_ID);
    if (ok && drawer) channels.setDrawerOpener(() => drawer.open());
    return ok;
  } catch (e) {
    console.warn(LOG, 'sidebar/drawer registration failed, falling back to floating panel:', e);
    return false;
  }
}

function boot() {
  channels.mount();
  if (registerWithWebTAK()) {
    console.info(LOG, 'Registered as a WebTAK sidebar tool + docked drawer.');
  } else {
    // Fallback: couldn't register as a sidebar tool/drawer — floating launch button so
    // Channels is still usable. window.TAKChannels is always available too.
    channels.showLaunchButton('🔀 Channels');
    console.info(LOG, 'Using floating launch button (sidebar/drawer registration unavailable).');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export default channels;
