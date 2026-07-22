// The Channels content: a filterable list of TAK Server groups (channels), each with a
// toggle switch that flips its active/inactive state — mirroring ATAK's Channels tool.
//
// This builds directly INTO a given host element rather than creating its own floating
// chrome, so the exact same class works two ways:
//   1. As the content of a REAL WebTAK docked side drawer (see ../index.js), whose
//      `mount(container)`/`unmount(container)` contract (confirmed by reading WebTAK's
//      own Drawer class out of its bundled source) just needs a plain DOM element to
//      fill — no React required.
//   2. Inside the floating-panel fallback (./floating-panel.js) used when running
//      standalone or when WebTAK's drawer API isn't present.
//
// Each toggle applies immediately (optimistic UI update, PUT to the server, revert on
// failure) rather than requiring a separate "Save" step, matching ATAK's behavior.

import { fetchGroups, pushActiveGroups } from './marti-groups.js';
import { getConfig } from './config.js';
import { getSavedActive, saveActive } from './channel-prefs.js';

export class ChannelsPanel {
  constructor(host) {
    this.host = host;
    this.groups = [];
    this.filter = '';
    this._loading = false;

    host.classList.add('watc-content');
    host.innerHTML = `
      <div class="watc-toolbar">
        <input class="watc-search" type="text" placeholder="Filter channels…" />
        <button class="watc-refresh">Refresh</button>
      </div>
      <div class="watc-body"><div class="watc-empty">Loading…</div></div>
      <div class="watc-foot"></div>`;
    this.body = host.querySelector('.watc-body');
    this.foot = host.querySelector('.watc-foot');

    host.querySelector('.watc-refresh').addEventListener('click', () => this.refresh());
    host.querySelector('.watc-search').addEventListener('input', (e) => {
      this.filter = e.target.value.trim().toLowerCase();
      this._render();
    });

    this.refresh();
  }

  async refresh() {
    if (this._loading) return;
    this._loading = true;
    const refreshBtn = this.host.querySelector('.watc-refresh');
    refreshBtn.disabled = true;
    this.body.innerHTML = `<div class="watc-empty">Loading…</div>`;
    try {
      const { takServerBase } = getConfig();
      this.groups = await fetchGroups(takServerBase);
      await this._reconcileSavedPrefs(takServerBase);
      this._render();
    } catch (err) {
      this.body.innerHTML = `<div class="watc-error">${escapeHtml(err.message)}</div>`;
    } finally {
      this._loading = false;
      refreshBtn.disabled = false;
    }
  }

  // A fresh connection resets every group to the server's default active state, which
  // drops whatever the operator previously chose. Re-apply any saved preference that
  // disagrees with what the server just handed back, in one PUT, before rendering —
  // so the panel never flashes the server default before snapping to the saved state.
  async _reconcileSavedPrefs(takServerBase) {
    let changed = false;
    this.groups.forEach((g) => {
      const saved = getSavedActive(takServerBase, g.name);
      if (saved !== null && saved !== g.active) {
        g.active = saved;
        changed = true;
      }
    });
    if (!changed) return;
    try {
      await pushActiveGroups(takServerBase, this.groups);
    } catch {
      // Best effort — the panel still shows the intended state; a later refresh/toggle retries.
    }
  }

  _render() {
    const rows = this.groups
      .filter((g) => !this.filter || g.name.toLowerCase().includes(this.filter))
      .sort((a, b) => a.name.localeCompare(b.name) || dirRank(a.direction) - dirRank(b.direction));

    this.foot.textContent = `${this.groups.length} channel${this.groups.length === 1 ? '' : 's'}` +
      (this.filter ? ` · ${rows.length} shown` : '');

    if (!rows.length) {
      this.body.innerHTML = `<div class="watc-empty">${this.groups.length ? 'No channels match.' : 'No channels found for this connection.'}</div>`;
      return;
    }

    this.body.innerHTML = '';
    rows.forEach((g) => this.body.appendChild(this._row(g)));
  }

  _row(group) {
    const row = document.createElement('div');
    row.className = 'watc-row';
    const dir = (group.direction || '').toLowerCase();
    const dirClass = dir === 'in' ? 'in' : dir === 'out' ? 'out' : 'both';
    row.innerHTML = `
      <div class="watc-row-main">
        <div class="watc-row-name"></div>
        <div class="watc-row-meta">
          <span class="watc-badge ${dirClass}">${escapeHtml((group.direction || 'BOTH').toUpperCase())}</span>
          ${group.type ? `<span>${escapeHtml(group.type)}</span>` : ''}
        </div>
      </div>
      <label class="watc-switch">
        <input type="checkbox" ${group.active ? 'checked' : ''} />
        <span class="watc-switch-track"></span>
      </label>`;
    row.querySelector('.watc-row-name').textContent = group.name;
    row.querySelector('.watc-row-name').title = group.name;

    const input = row.querySelector('input');
    input.addEventListener('change', () => this._toggle(group, row, input));
    return row;
  }

  async _toggle(group, row, input) {
    const next = input.checked;
    const prev = group.active;
    group.active = next;
    row.classList.add('pending');
    input.disabled = true;
    try {
      const { takServerBase } = getConfig();
      await pushActiveGroups(takServerBase, this.groups);
      saveActive(takServerBase, group.name, next);
    } catch (err) {
      group.active = prev;
      input.checked = prev;
      this.foot.textContent = `Failed to update "${group.name}": ${err.message}`;
    } finally {
      row.classList.remove('pending');
      input.disabled = false;
    }
  }

  destroy() {
    this.host.innerHTML = '';
    this.host.classList.remove('watc-content');
  }
}

const dirRank = (d) => ({ in: 0, out: 1 }[(d || '').toLowerCase()] ?? 2);
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
