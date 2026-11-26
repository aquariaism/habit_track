// ── Games tab: Mind puzzle | Zip ──────────────────────────────────────────────
let gameSub = localStorage.getItem('ht5_gsub') === 'zip' ? 'zip' : 'mind';
function renderGames() {
  const root = document.getElementById('view-games');
  if (!document.getElementById('gMind')) {
    root.innerHTML = `<div class="sub-seg" id="gSeg"><button data-sub="mind">${ic('extension')}Mind puzzle</button><button data-sub="zip">${ic('bolt')}Zip</button></div><div id="gMind"></div><div id="gZip"></div>`;
    document.getElementById('gSeg').addEventListener('click', e => {
      const b = e.target.closest('[data-sub]'); if (!b) return;
      gameSub = b.dataset.sub; try { localStorage.setItem('ht5_gsub', gameSub); } catch (err) { }
      renderGames();
    });
    zipBind();
  }
  document.querySelectorAll('#gSeg button').forEach(b => b.classList.toggle('sel', b.dataset.sub === gameSub));
  document.getElementById('gMind').hidden = gameSub !== 'mind';
  document.getElementById('gZip').hidden = gameSub !== 'zip';
  if (gameSub === 'mind') renderGame(); else renderZip();
}


