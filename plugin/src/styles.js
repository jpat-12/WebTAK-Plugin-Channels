// Injected stylesheet (kept as a JS string so the plugin stays a single self-contained
// bundle with no external CSS fetch — friendly to WebTAK's CSP). Theme matches VISTA/ILWG,
// consistent with the sibling Video Viewer plugin.

const CSS = `
.watc-panel-wrap { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
.watc-panel-wrap * { box-sizing: border-box; }

.watc-panel { position: absolute; top: 60px; right: 16px; width: 360px; max-height: calc(100vh - 100px);
  background: #111114; border: 1px solid #242424; border-radius: 10px; color: #e8ebf2;
  box-shadow: 0 8px 28px rgba(0,0,0,.6); pointer-events: auto; display: flex; flex-direction: column;
  overflow: hidden; }
.watc-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px;
  background: linear-gradient(135deg, #000d40, #001871); border-bottom: 2px solid #c8102e; cursor: move;
  user-select: none; flex: 0 0 auto; }
.watc-head-title { flex: 1; font-size: 13px; font-weight: 700; letter-spacing: .03em; color: #fff; }
.watc-btn { width: 22px; height: 22px; border: none; background: transparent; color: #cfd6e6;
  font-size: 14px; cursor: pointer; border-radius: 4px; line-height: 1; flex: 0 0 auto; }
.watc-btn:hover { background: rgba(255,255,255,.15); color: #fff; }

.watc-toolbar { display: flex; gap: 8px; padding: 10px 14px; border-bottom: 1px solid #242424; flex: 0 0 auto; }
.watc-search { flex: 1; padding: 6px 10px; background: #0b0b0e; border: 1px solid #2a2a30;
  border-radius: 6px; color: #e8ebf2; font-size: 12px; }
.watc-refresh { background: transparent; color: #9aa3b5; border: 1px solid #2a2a30; padding: 6px 10px;
  border-radius: 6px; cursor: pointer; font-size: 12px; }
.watc-refresh:hover { color: #fff; border-color: #444; }
.watc-refresh:disabled { opacity: .5; cursor: default; }

.watc-body { overflow: auto; flex: 1 1 auto; }
.watc-empty, .watc-error { padding: 20px; text-align: center; color: #7c8598; font-size: 12px; }
.watc-error { color: #ff8a8a; }

.watc-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #1c1c20; }
.watc-row:hover { background: #17171b; }
.watc-row-main { flex: 1; min-width: 0; }
.watc-row-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.watc-row-meta { font-size: 11px; color: #7c8598; margin-top: 2px; display: flex; gap: 6px; align-items: center; }
.watc-badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 700;
  letter-spacing: .04em; background: #1c1c20; color: #9aa3b5; }
.watc-badge.in { color: #6ea8ff; }
.watc-badge.out { color: #ffb86e; }
.watc-badge.both { color: #24c265; }

.watc-switch { position: relative; width: 36px; height: 20px; flex: 0 0 auto; }
.watc-switch input { opacity: 0; width: 0; height: 0; }
.watc-switch-track { position: absolute; inset: 0; background: #2a2a30; border-radius: 20px; cursor: pointer;
  transition: background .15s; }
.watc-switch-track::before { content: ''; position: absolute; width: 16px; height: 16px; left: 2px; top: 2px;
  background: #cfd6e6; border-radius: 50%; transition: transform .15s; }
.watc-switch input:checked + .watc-switch-track { background: #178a3c; }
.watc-switch input:checked + .watc-switch-track::before { transform: translateX(16px); background: #fff; }
.watc-switch input:disabled + .watc-switch-track { opacity: .5; cursor: default; }
.watc-row.pending { opacity: .6; }

.watc-foot { padding: 8px 14px; border-top: 1px solid #242424; font-size: 11px; color: #7c8598;
  flex: 0 0 auto; }

.watc-launch { position: fixed; bottom: 16px; right: 84px; z-index: 2147483050; pointer-events: auto;
  background: linear-gradient(135deg, #000d40, #001871); color: #fff; border: 1px solid #c8102e;
  border-radius: 22px; padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 14px rgba(0,0,0,.5); font-family: 'Segoe UI', system-ui, sans-serif; }
.watc-launch:hover { background: linear-gradient(135deg, #001871, #002bb0); }
`;

export function injectStyles() {
  if (document.getElementById('watc-styles')) return;
  const el = document.createElement('style');
  el.id = 'watc-styles';
  el.textContent = CSS;
  document.head.appendChild(el);
}
