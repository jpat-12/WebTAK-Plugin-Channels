// The Channels panel: a floating, draggable window listing every TAK Server group
// (channel) the current connection is a member of, with a toggle switch per group that
// flips its active/inactive state — mirroring ATAK's Channels tool.
//
// Each toggle applies immediately (optimistic UI update, PUT to the server, revert on
// failure) rather than requiring a separate "Save" step, matching ATAK's behavior.

import { fetchGroups, pushActiveGroups } from './marti-groups.js';
import { getConfig } from './config.js';

export class ChannelsPanel {
  constructor() {
    this.groups = [];
    this.filter = '';
    this._loading = false;

    const wrap = document.createElement('div');
    wrap.className = 'watc-panel-wrap';
    wrap.innerHTML = `
      <div class="watc-panel">
        <div class="watc-head">
          <span class="watc-head-title">🔀 Channels</span>
          <button class="watc-btn watc-hide" title="Hide">&#8211;</button>
          <button class="watc-btn watc-close" title="Close">&#10005;</button>
        </div>
        <div class="watc-toolbar">
          <input class="watc-search" type="text" placeholder="Filter channels…" />
          <button class="watc-refresh">Refresh</button>
        </div>
        <div class="watc-body"><div class="watc-empty">Loading…</div></div>
        <div class="watc-foot"></div>
      </div>`;
    this.wrap = wrap;
    this.panel = wrap.querySelector('.watc-panel');
    this.body = wrap.querySelector('.watc-body');
    this.foot = wrap.querySelector('.watc-foot');

    wrap.querySelector('.watc-close').addEventListener('click', () => this.destroy());
    wrap.querySelector('.watc-hide').addEventListener('click', () => this.toggleVisible());
    wrap.querySelector('.watc-refresh').addEventListener('click', () => this.refresh());
    wrap.querySelector('.watc-search').addEventListener('input', (e) => {
      this.filter = e.target.value.trim().toLowerCase();
      this._render();
    });

    this._wireDrag();
    document.body.appendChild(wrap);
    this.refresh();
  }

  toggleVisible() {
    const hidden = this.panel.style.display === 'none';
    this.panel.style.display = hidden ? 'flex' : 'none';
  }

  show() {
    this.panel.style.display = 'flex';
    this.panel.scrollIntoView?.({ block: 'nearest' });
  }

  async refresh() {
    if (this._loading) return;
    this._loading = true;
    this.wrap.querySelector('.watc-refresh').disabled = true;
    this.body.innerHTML = `<div class="watc-empty">Loading…</div>`;
    try {
      const { takServerBase } = getConfig();
      this.groups = await fetchGroups(takServerBase);
      this._render();
    } catch (err) {
      this.body.innerHTML = `<div class="watc-error">${escapeHtml(err.message)}</div>`;
    } finally {
      this._loading = false;
      this.wrap.querySelector('.watc-refresh').disabled = false;
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
    } catch (err) {
      group.active = prev;
      input.checked = prev;
      this.foot.textContent = `Failed to update "${group.name}": ${err.message}`;
    } finally {
      row.classList.remove('pending');
      input.disabled = false;
    }
  }

  _wireDrag() {
    const head = this.wrap.querySelector('.watc-head');
    let sx, sy, ox, oy, dragging = false;
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.watc-btn')) return;
      dragging = true;
      head.setPointerCapture(e.pointerId);
      sx = e.clientX; sy = e.clientY;
      const r = this.panel.getBoundingClientRect();
      ox = r.left; oy = r.top;
      this.panel.style.right = 'auto';
    });
    head.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 40;
      this.panel.style.left = Math.min(Math.max(0, ox + (e.clientX - sx)), maxX) + 'px';
      this.panel.style.top = Math.min(Math.max(0, oy + (e.clientY - sy)), maxY) + 'px';
    });
    const end = (e) => { if (dragging) { dragging = false; try { head.releasePointerCapture(e.pointerId); } catch {} } };
    head.addEventListener('pointerup', end);
    head.addEventListener('pointercancel', end);
  }

  destroy() {
    this.wrap.remove();
  }
}

const dirRank = (d) => ({ in: 0, out: 1 }[(d || '').toLowerCase()] ?? 2);
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
