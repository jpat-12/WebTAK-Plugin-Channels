// WebTAK entry point.
//
// WebTAK 4.10's real plugin/sidebar API is window.WebTAK.plugin.registerPlugin(), which
// takes a Plugin model instance (window.WebTAK.plugin.models.Plugin) built from one or
// more Tool instances (window.WebTAK.tool.models.Tool). This shape + the reverse-engineering
// notes below are carried over verbatim from the sibling Video Viewer plugin
// (WebTAK-Plugin-VideoViewer/plugin/index.js), which pulled it from a live WebTAK session
// and confirmed it against WebTAK's own main.*.js bundle. Registration is wrapped so any
// unexpected failure here can only fall back to the floating button, never crash WebTAK.
//
// Plugin constructor requires: name, description, version (non-empty strings), and
// tools/drawers as arrays (even empty). Tool instances must be real `new Tool(...)`
// objects, not plain object literals.

import channels from './src/core.js';

const LOG = '[WebTAK Channels]';

// 24x24 shuffle/channels glyph, so we don't depend on WebTAK's built-in icon font names.
const ICON_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij48cGF0aCBmaWxsPSIjRDVENUQ1IiBkPSJNMTcgM2w0IDQtNCA0VjhoLTVMOSA1bDMtM2gyLjV2MXptLTEwIDVsLTQgNCA0IDR2LTNoNWwzLTMtMy0zSDd6bTEwIDVsNCA0LTQgNHYtM2gtNS41bC0yLjUtMi41IDIuNS0yLjVIMTd2LTJ6Ii8+PC9zdmc+';

function registerWithWebTAK() {
  try {
    const toolApi = window.WebTAK && window.WebTAK.tool;
    const pluginApi = window.WebTAK && window.WebTAK.plugin;
    if (!toolApi || !pluginApi) return false;

    const PLUGIN_ID = 'watc-channels';
    if (pluginApi.hasPlugin(PLUGIN_ID)) return true; // already registered (e.g. hot reload)

    const tool = new toolApi.models.Tool({
      category: 'other',
      iconUrl: ICON_URL,
      name: PLUGIN_ID,
      title: 'Channels',
      deviceTypes: 'all',
      onClick: () => channels.open(),
    });

    const plugin = new pluginApi.models.Plugin({
      name: PLUGIN_ID,
      description: 'Toggle which TAK Server groups (data-sync channels) are active for this connection.',
      version: '0.1.0',
      tools: [tool],
      drawers: [],
    });

    pluginApi.registerPlugin(plugin);
    return pluginApi.hasPlugin(PLUGIN_ID);
  } catch (e) {
    console.warn(LOG, 'sidebar registration failed, falling back to floating button:', e);
    return false;
  }
}

function boot() {
  channels.mount();
  if (registerWithWebTAK()) {
    console.info(LOG, 'Registered as a WebTAK sidebar tool.');
  } else {
    // Fallback: couldn't register as a sidebar tool — floating launch button so Channels
    // is still usable. window.TAKChannels is always available too.
    channels.showLaunchButton('🔀 Channels');
    console.info(LOG, 'Using floating launch button (sidebar registration unavailable).');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export default channels;
