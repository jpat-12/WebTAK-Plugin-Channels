// Framework-free core of WebTAK Channels. This module has ZERO dependency on WebTAK
// internals, so it runs identically inside WebTAK, in the standalone demo page, or
// injected via a bookmarklet. The WebTAK entry (../index.js) builds a real docked
// WebTAK drawer and calls setDrawerOpener() so open() uses that; without it, open()
// falls back to a floating panel (see ./floating-panel.js).

import { injectStyles } from './styles.js';
import { mountFloatingPanel } from './floating-panel.js';
import { getConfig, setConfig } from './config.js';

class Channels {
  constructor() {
    this._floating = null;
    this._launchBtn = null;
    this._openDrawer = null;
  }

  /** Idempotent. Injects styles. Safe to call more than once. */
  mount() {
    injectStyles();
    return this;
  }

  /** Registers a real WebTAK drawer's open() in place of the floating fallback. */
  setDrawerOpener(fn) {
    this._openDrawer = fn;
    return this;
  }

  /** Open Channels — a real docked WebTAK drawer if registered, else a floating panel. */
  open() {
    this.mount();
    if (this._openDrawer) {
      this._openDrawer();
      return this;
    }
    if (this._floating) this._floating.show();
    else this._floating = mountFloatingPanel();
    return this;
  }

  close() {
    this._floating?.destroy();
    this._floating = null;
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
