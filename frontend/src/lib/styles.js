/* ─── lib/styles.js ─── */
export const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
*{box-sizing:border-box}
.gx-root{
  --paper:#F3F6F2; --surface:#FFFFFF; --ink:#15241B; --ink-soft:#586860;
  --line:#E1EAE3; --line-soft:#EEF4EF; --pop:#62A92A; --pop-deep:#4C8A1E; --pop-soft:#EDF6D9;
  --font-d:'Bricolage Grotesque',sans-serif; --font-b:'Hanken Grotesk',sans-serif; --font-m:'JetBrains Mono',monospace;
  font-family:var(--font-b); color:var(--ink); background:var(--paper);
  -webkit-font-smoothing:antialiased; letter-spacing:-0.005em;
}
.gx-root *::-webkit-scrollbar{width:10px;height:10px}
.gx-root *::-webkit-scrollbar-thumb{background:#cbd6cd;border-radius:9px;border:2px solid transparent;background-clip:content-box}
.gx-root *::-webkit-scrollbar-track{background:transparent}
.gx-disp{font-family:var(--font-d);letter-spacing:-0.02em}
.gx-mono{font-family:var(--font-m);font-feature-settings:"tnum"}
.gx-btn{font-family:var(--font-b);font-weight:600;border:none;cursor:pointer;border-radius:10px;transition:transform .12s,box-shadow .12s,background .12s}
.gx-btn:active{transform:translateY(1px)}
.gx-btn-dark{background:var(--pop);color:#fff;padding:9px 15px;display:inline-flex;align-items:center;gap:7px;font-size:13.5px}
.gx-btn-dark:hover{background:var(--pop-deep);box-shadow:0 6px 18px -6px rgba(76,138,30,.55)}
.gx-btn-ghost{background:transparent;color:var(--ink-soft);padding:8px 12px;display:inline-flex;align-items:center;gap:7px;font-size:13.5px;border-radius:9px}
.gx-btn-ghost:hover{background:#E6EFE7;color:var(--ink)}
.gx-chip{display:inline-flex;align-items:center;gap:6px;font-weight:600;font-size:12px;padding:5px 11px;border-radius:999px;white-space:nowrap;border:none;cursor:pointer;font-family:var(--font-b)}
.gx-card{background:var(--surface);border:1px solid var(--line);border-radius:16px}
.gx-row:hover{background:#F4F8F4}
.gx-navitem{display:flex;align-items:center;gap:11px;padding:8px 14px;border-radius:11px;color:var(--ink-soft);font-weight:600;font-size:13.5px;cursor:pointer;transition:.12s}
.gx-navitem:hover{background:#E6EFE7;color:var(--ink)}
.gx-navitem.on{background:var(--pop);color:#fff}
.gx-navitem.on svg{color:#fff}
.gx-input{font-family:var(--font-b);font-size:13.5px;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:9px 12px;outline:none;width:100%}
.gx-input:focus{border-color:var(--pop);box-shadow:0 0 0 3px var(--pop-soft)}
.gx-cellinput{font-family:var(--font-b);font-size:13px;color:var(--ink);background:transparent;border:1px solid transparent;border-radius:7px;padding:6px 8px;outline:none;width:100%}
.gx-cellinput:hover{background:#F1F6F1}
.gx-cellinput:focus{background:#fff;border-color:var(--pop);box-shadow:0 0 0 3px var(--pop-soft)}
.gx-sel{font-family:var(--font-b);font-size:12.5px;color:var(--ink);background:transparent;border:1px solid transparent;border-radius:7px;padding:6px 20px 6px 7px;outline:none;width:100%;appearance:none;cursor:pointer}
.gx-sel:hover{background:#F1F6F1}
.gx-sel:focus{background:#fff;border-color:var(--pop)}
.gx-th{font-family:var(--font-b);font-weight:700;font-size:10px;letter-spacing:.03em;text-transform:uppercase;color:var(--ink-soft);text-align:left;padding:9px 8px;white-space:nowrap;background:#EEF4EF}
.gx-td{padding:5px 7px;font-size:12.5px;vertical-align:middle;border-top:1px solid var(--line-soft);border-right:1px solid var(--line-soft)}
.gx-board .gx-th{padding:12px 9px}
.gx-board .gx-td{padding:11px 8px}
.gx-fade{animation:gxf .4s cubic-bezier(.2,.7,.2,1) both}
@keyframes gxf{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.gx-stagger>*{animation:gxf .45s cubic-bezier(.2,.7,.2,1) both}
.gx-stagger>*:nth-child(1){animation-delay:.02s}.gx-stagger>*:nth-child(2){animation-delay:.06s}
.gx-stagger>*:nth-child(3){animation-delay:.10s}.gx-stagger>*:nth-child(4){animation-delay:.14s}
.gx-stagger>*:nth-child(5){animation-delay:.18s}.gx-stagger>*:nth-child(6){animation-delay:.22s}
.gx-drawer{animation:gxd .32s cubic-bezier(.2,.8,.2,1) both}
@keyframes gxd{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}
.gx-scrim{animation:gxs .25s ease both}@keyframes gxs{from{opacity:0}to{opacity:1}}
.gx-avatar{border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-b);font-weight:700;color:#fff;flex:none}
.gx-tab{font-family:var(--font-b);font-weight:600;font-size:13px;padding:9px 2px;color:var(--ink-soft);cursor:pointer;border-bottom:2px solid transparent;margin-right:20px}
.gx-tab.on{color:var(--ink);border-bottom-color:var(--pop)}
.gx-menuitem{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600}
.gx-menuitem:hover{background:#F1F6F1}
`;
