// Persists the operator's last-chosen active/inactive state per channel, so it survives
// a WebTAK reload or reconnect.
//
// TAK Server's group `active` flag lives on the live connection, not on the account —
// a fresh connection resets every group to whatever the server's default membership
// state is (usually all active). Without this, toggling a channel off would only last
// until the next page reload, which is not how ATAK's own Channels manager behaves: it
// saves the operator's choice locally and re-applies it after each new connection. This
// module is that same local memory for WebTAK.
//
// Keyed by takServerBase (or the page origin if blank) + group name, so preferences
// don't bleed across different servers if `takServerBase` is ever overridden for dev.

const PREFS_STORAGE_KEY = 'watc.channel-prefs.v1';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

let prefs = loadPrefs();

function scopeKey(base) {
  const origin = (base || (typeof location !== 'undefined' ? location.origin : '')).trim().replace(/\/+$/, '');
  return origin || 'default';
}

/** @returns {boolean|null} the saved preference, or null if the operator never toggled this channel. */
export function getSavedActive(base, name) {
  const scope = prefs[scopeKey(base)];
  return scope && Object.prototype.hasOwnProperty.call(scope, name) ? scope[name] : null;
}

export function saveActive(base, name, active) {
  const key = scopeKey(base);
  prefs = { ...prefs, [key]: { ...(prefs[key] || {}), [name]: active } };
  try { localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs)); } catch { /* private mode / quota */ }
}
