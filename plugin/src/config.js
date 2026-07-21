// Plugin-wide configuration for WebTAK Channels.
//
// The Marti groups API is same-origin (the WebTAK page IS a TAK server client, already
// authenticated via session cookie), so there is normally nothing to configure — unlike
// the Video Viewer plugin, which points at a separate Restreamer host. `takServerBase`
// exists only for local dev (e.g. testing against a server other than the one WebTAK is
// served from); leave it blank in production.

const STORAGE_KEY = 'watc.config.v1';

export const DEFAULTS = {
  // Blank = same origin as the page (the normal, correct case inside WebTAK).
  takServerBase: '',
};

let current = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function getConfig() {
  return { ...current };
}

export function setConfig(patch) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* private mode / quota — keep in-memory only */
  }
  return getConfig();
}
