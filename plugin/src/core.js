// Framework-free core of WebTAK Channels. This module has ZERO dependency on WebTAK
// internals, so it runs identically inside WebTAK, in the standalone demo page, or
// injected via a bookmarklet. The WebTAK entry (../index.js) just calls open() on this.

import { injectStyles } from './styles.js';
import { ChannelsPanel } from './ui.js';
import { getConfig, setConfig } from './config.js';

class Channels {
  constructor() {
    this._panel = null;
    this._launchBtn = null;
  }

  /** Idempotent. Injects styles. Safe to call more than once. */
  mount() {
    injectStyles();
    return this;
  }

  /** Open the Channels panel (creating it on first call, showing/refreshing after). */
  open() {
    this.mount();
    if (this._panel) {
      this._panel.show();
      this._panel.refresh();
    } else {
      this._panel = new ChannelsPanel();
    }
    return this;
  }

  close() {
    this._panel?.destroy();
    this._panel = null;
    return this;
  }

  /** Merge runtime config (takServerBase for dev/testing). */
  configure(patch) { return setConfig(patch); }
  getConfig() { return getConfig(); }

  /** Optional floating launch button (used by the standalone demo / WebTAK fallback). */
  showLaunchButton(label = '🔀 Channels') {
    this.mount();
    if (this._launchBtn) return this;
    const btn = document.createElement('button');
    btn.className = 'watc-launch';
    btn.textContent = label;
    btn.addEventListener('click', () => this.open());
    document.body.appendChild(btn);
    this._launchBtn = btn;
    return this;
  }

  hideLaunchButton() { this._launchBtn?.remove(); this._launchBtn = null; return this; }
}

// One shared instance per page.
const instance = new Channels();
if (typeof window !== 'undefined') window.TAKChannels = instance;

export default instance;
export { Channels };
