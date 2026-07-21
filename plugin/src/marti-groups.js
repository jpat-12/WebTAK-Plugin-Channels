// Client for TAK Server's Marti group-membership API — the same endpoints ATAK's
// Channels manager uses under the hood:
//
//   GET /Marti/api/groups/all     -> every group (aka "channel") the CURRENT connection's
//                                    user is a member of, each with an `active` flag.
//   PUT /Marti/api/groups/active  -> re-POSTs the (possibly modified) group list; the
//                                    server flips each group's active bit for this
//                                    connection to whatever `active` value was sent.
//
// A "group" here is a TAK Server broadcast/data-sync group (Blue, __ANON__, a mission's
// group, etc) — this is the server-side mechanism ATAK's Channels UI toggles, distinct
// from CloudTAK "Missions". Toggling a group off stops CoT tagged with it from being
// sent/received on this connection; it does not delete or unsubscribe anything server-side.
//
// Responses are wrapped in TAK Server's generic ApiResult envelope:
//   { "version": "3", "type": "com.bbn.marti.remote.groups.Group", "data": [ ... ], "nodeId": "..." }
// but callers here always get back the plain array.

function apiBase(base) {
  const b = (base || '').trim().replace(/\/+$/, '');
  return b || ''; // '' = relative to current origin, e.g. fetch('/Marti/api/groups/all')
}

async function req(base, path, opts = {}) {
  const url = `${apiBase(base)}${path}`;
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Not authenticated to this TAK server (HTTP ${res.status}). Sign in to WebTAK first.`);
    }
    throw new Error(`${path} -> HTTP ${res.status}`);
  }
  return res.json();
}

/** @returns {Promise<Array<{name:string, direction:string, type:string, bitpos:number, created:string, active:boolean}>>} */
export async function fetchGroups(base) {
  const json = await req(base, '/Marti/api/groups/all');
  const data = Array.isArray(json) ? json : json.data;
  if (!Array.isArray(data)) throw new Error('Unexpected response shape from /Marti/api/groups/all');
  return data;
}

/**
 * Pushes the full, updated group list back to the server so it can diff and apply the
 * new active/inactive state per group. TAK Server matches groups by (name, direction),
 * so send the complete list you got from fetchGroups() with only the flags you changed
 * — not a partial list.
 */
export async function pushActiveGroups(base, groups) {
  return req(base, '/Marti/api/groups/active', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(groups),
  });
}
