// Floating draggable chrome around a ChannelsPanel, used only when a real WebTAK docked
// drawer isn't available (standalone demo, or WebTAK's drawer API missing/failing) — see
// ../index.js for the real-drawer path, which mounts ChannelsPanel directly into WebTAK's
// own docked side panel and needs none of this chrome.

import { ChannelsPanel } from './ui.js';

export function mountFloatingPanel() {
  const wrap = document.createElement('div');
  wrap.className = 'watc-panel-wrap';
  wrap.innerHTML = `
    <div class="watc-panel">
      <div class="watc-head">
        <span class="watc-head-title">🔀 Channels</span>
        <button class="watc-btn watc-close" title="Close">&#10005;</button>
      </div>
      <div class="watc-host"></div>
    </div>`;
  const panel = wrap.querySelector('.watc-panel');
  const head = wrap.querySelector('.watc-head');
  const host = wrap.querySelector('.watc-host');

  document.body.appendChild(wrap);
  const content = new ChannelsPanel(host);

  const destroy = () => { content.destroy(); wrap.remove(); };
  wrap.querySelector('.watc-close').addEventListener('click', destroy);

  let sx, sy, ox, oy, dragging = false;
  head.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.watc-btn')) return;
    dragging = true;
    head.setPointerCapture(e.pointerId);
    sx = e.clientX; sy = e.clientY;
    const r = panel.getBoundingClientRect();
    ox = r.left; oy = r.top;
    panel.style.right = 'auto';
  });
  head.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 40;
    panel.style.left = Math.min(Math.max(0, ox + (e.clientX - sx)), maxX) + 'px';
    panel.style.top = Math.min(Math.max(0, oy + (e.clientY - sy)), maxY) + 'px';
  });
  const endDrag = (e) => { if (dragging) { dragging = false; try { head.releasePointerCapture(e.pointerId); } catch {} } };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);

  return {
    show() { panel.style.display = 'flex'; content.refresh(); },
    destroy,
  };
}
