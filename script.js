// JavaScript helper for DAZN Sharing Rules Creator

// ===== DATA =====

// Default category mapping: owner cat -> recipient cat (same by default, B2C special case handled separately)
const DEFAULT_CAT_MAPPING = {
  "Football Archive":          "Football Archive",
  "Exclude from What's On":    "Exclude from What's On",
  "Exclude from epg":          "Exclude from epg",
  "Freemium":                  "Freemium",
  "Play4Free":                 "Play4Free",
  "Downloadable":              "Downloadable",
  "hidden from production":    "hidden from production",
  "Exclude from Rails":        "Exclude from Rails",
  "Content Distribution, B2B": "Content Distribution, B2B",
  "Content Distribution, B2C": "Content Distribution, B2C",
  "Short Highlights":          "Short Highlights",
  "Automation":                "Automation",
  "Broadcast Tier, 1":         "Broadcast Tier, 1",
  "Broadcast Tier, 2":         "Broadcast Tier, 2",
  "Broadcast Tier, 3":         "Broadcast Tier, 3",
  "Broadcast Tier, 4":         "Broadcast Tier, 4",
  "Broadcast Tier, 5":         "Broadcast Tier, 5",
  "Courtside – 10-Min Highlights": "Courtside – 10-Min Highlights",
  "Courtside – 20-Min Highlights": "Courtside – 20-Min Highlights",
  "Courtside – 3-Min Highlights":  "Courtside – 3-Min Highlights",
  "Courtside – 5-Min Highlights":  "Courtside – 5-Min Highlights",
  "Courtside – Daily Recaps":      "Courtside – Daily Recaps",
  "Courtside – Game MVPs":         "Courtside – Game MVPs",
  "Courtside – Top Plays":         "Courtside – Top Plays",
  "Exclude from Core Rail":        "Exclude from Core Rail",
  "Exclude from Live and Next":    "Exclude from Live and Next",
  "Extended Highlights":           "Extended Highlights"
};

// Mutable state: which cats are enabled + their recipient mapping
let catState = {};  // { catName: { enabled: bool, recipientCat: string } }

const ARTICLE_TYPES = ["All","Live - Catch Up","Live - Highlights","Shoulder","Full Match","Preview","Analysis"];

const CATEGORIES = [
  "Football Archive",
  "Exclude from What's On",
  "Exclude from epg",
  "Freemium",
  "Play4Free",
  "Downloadable",
  "hidden from production",
  "Exclude from Rails",
  "Content Distribution, B2B",
  "Content Distribution, B2C",
  "Short Highlights",
  "Automation",
  "Broadcast Tier, 1",
  "Broadcast Tier, 2",
  "Broadcast Tier, 3",
  "Broadcast Tier, 4",
  "Broadcast Tier, 5",
  "Courtside – 10-Min Highlights",
  "Courtside – 20-Min Highlights",
  "Courtside – 3-Min Highlights",
  "Courtside – 5-Min Highlights",
  "Courtside – Daily Recaps",
  "Courtside – Game MVPs",
  "Courtside – Top Plays",
  "Exclude from Core Rail",
  "Exclude from Live and Next",
  "Extended Highlights"
];

// Each recipient's supported languages — owner must use these exact codes
const RECIPIENTS = [
  { name: "DAZN Germany",  langs: ["EN","DE","FR","IT"] },
  { name: "DAZN Belgium",  langs: ["EN","NL-BE","FR-BE"] },
  { name: "DAZN ROW",      langs: ["EN","ES","HE-IL"] },
  { name: "DAZN US",       langs: ["EN","ES"] },
  { name: "DAZN MENA",     langs: ["EN","AR"] },
  { name: "DAZN Canada",   langs: ["EN","FR-CA"] },
  { name: "DAZN Italy",    langs: ["EN","IT"] },
  { name: "DAZN Spain",    langs: ["EN","ES-ES"] },
  { name: "DAZN Brazil",   langs: ["EN","PT-BR"] },
  { name: "DAZN Japan",    langs: ["EN","JA"] },
  { name: "DAZN Taiwan",   langs: ["EN","ZH-TW"] },
  { name: "DAZN France",   langs: ["EN","FR"] },
  { name: "DAZN Portugal", langs: ["EN","PT"] }
];

const HEADER = ["Owner","Language","Owner Status","Article Type","Sports Data (Competition)","Geolocation","Owner Categories",">>>","Recipient","Language","Recipient Status","Article Type","Recipient Categories"];

let generatedRows = [];

// Tracks enabled languages per recipient: { "DAZN Germany": Set(["EN","DE",...]), ... }
let recipientLangState = {};

// ===== INIT =====
function init() {
  // Pre-populate recipientLangState — all langs enabled by default
  RECIPIENTS.forEach(r => {
    recipientLangState[r.name] = new Set(r.langs);
  });

  // Article types
  const artDiv = document.getElementById('articleTypeGrid');
  ARTICLE_TYPES.forEach(a => {
    const chip = document.createElement('div');
    chip.className = 'art-chip' + (a === 'All' ? ' selected' : '');
    chip.textContent = a;
    chip.onclick = () => chip.classList.toggle('selected');
    artDiv.appendChild(chip);
  });

  // Categories - init state
  CATEGORIES.forEach(c => {
    catState[c] = { enabled: true, recipientCat: DEFAULT_CAT_MAPPING[c] || c };
  });
  renderCatMappingList();

  // Recipients chips
  const recDiv = document.getElementById('recipientGrid');
  RECIPIENTS.forEach(r => {
    const chip = document.createElement('div');
    chip.className = 'recipient-chip selected';
    chip.dataset.name = r.name;
    chip.innerHTML = `<div class="dot"></div><span>${r.name.replace('DAZN ','')}</span>`;
    chip.onclick = () => {
      chip.classList.toggle('selected');
      renderRecipientLangPanel();
    };
    recDiv.appendChild(chip);
  });

  renderRecipientLangPanel();
}

// ===== RECIPIENT LANGUAGE PANEL =====
function renderRecipientLangPanel() {
  const container = document.getElementById('recipientLangConfig');
  const selectedRecipients = getSelectedRecipients();
  container.innerHTML = '';

  RECIPIENTS.forEach(r => {
    const isActive = selectedRecipients.includes(r.name);
    const enabledLangs = recipientLangState[r.name] || new Set(r.langs);

    const block = document.createElement('div');
    block.className = `rec-lang-block ${isActive ? 'active' : 'inactive'}`;
    block.dataset.recipient = r.name;

    const pillsHTML = r.langs.map(lang => {
      const on = enabledLangs.has(lang);
      return `<span class="lang-pill ${on ? 'enabled' : ''}" data-recipient="${r.name}" data-lang="${lang}" onclick="toggleLang(this)">${lang}</span>`;
    }).join('');

    block.innerHTML = `
      <div class="rec-lang-header">
        <span class="rec-name">${r.name}</span>
        <div class="lang-pills">${pillsHTML}</div>
      </div>`;

    container.appendChild(block);
  });
}

function toggleLang(pill) {
  const rec = pill.dataset.recipient;
  const lang = pill.dataset.lang;
  if (!recipientLangState[rec]) recipientLangState[rec] = new Set();
  if (recipientLangState[rec].has(lang)) {
    recipientLangState[rec].delete(lang);
    pill.classList.remove('enabled');
  } else {
    recipientLangState[rec].add(lang);
    pill.classList.add('enabled');
  }
}

function selectAllLangs() {
  RECIPIENTS.forEach(r => { recipientLangState[r.name] = new Set(r.langs); });
  renderRecipientLangPanel();
}

function clearLangs() {
  RECIPIENTS.forEach(r => { recipientLangState[r.name] = new Set(); });
  renderRecipientLangPanel();
}

// ===== HELPERS =====
function getSelectedCats() {
  return CATEGORIES.filter(c => catState[c] && catState[c].enabled);
}
function getRecipientCatFor(ownerCat) {
  return (catState[ownerCat] && catState[ownerCat].recipientCat) || ownerCat;
}

function getSelectedRecipients() {
  return [...document.querySelectorAll('.recipient-chip.selected')].map(el => el.dataset.name);
}

function getSelectedArticleTypes() {
  return [...document.querySelectorAll('.art-chip.selected')].map(el => el.textContent);
}

function getStatuses() {
  const s = [];
  if (document.getElementById('statusLive').checked) s.push('LIVE');
  if (document.getElementById('statusScheduled').checked) s.push('SCHEDULED');
  return s;
}

function getCompIds() {
  return document.getElementById('compIds').value
    .split('\n').map(s => s.trim()).filter(Boolean);
}

function updateCompCount() {
  const n = getCompIds().length;
  document.getElementById('compCount').textContent = `${n} ID${n!==1?'s':''} entered`;
}

function selectAllCats() {
  CATEGORIES.forEach(c => { if(catState[c]) catState[c].enabled = true; });
  renderCatMappingList();
}
function clearCats() {
  CATEGORIES.forEach(c => { if(catState[c]) catState[c].enabled = false; });
  renderCatMappingList();
}
function resetCatMappings() {
  CATEGORIES.forEach(c => { if(catState[c]) catState[c].recipientCat = DEFAULT_CAT_MAPPING[c] || c; });
  renderCatMappingList();
  showToast('✓ Mappings reset to defaults', 'success');
}

function renderCatMappingList() {
  const container = document.getElementById('catMappingList');
  if (!container) return;
  container.innerHTML = '';

  CATEGORIES.forEach(function(cat) {
    const state = catState[cat];

    const row = document.createElement('div');
    row.className = 'cat-map-row' + (state.enabled ? ' enabled' : ' disabled');

    // Checkbox
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'cat-map-toggle';
    chk.checked = state.enabled;
    chk.title = 'Enable/disable';
    chk.addEventListener('change', function() {
      catState[cat].enabled = chk.checked;
      row.className = 'cat-map-row' + (chk.checked ? ' enabled' : ' disabled');
    });

    // Owner label
    const ownerLabel = document.createElement('span');
    ownerLabel.className = 'cat-map-owner';
    ownerLabel.title = cat;
    ownerLabel.textContent = cat;

    // Arrow
    const arrow = document.createElement('span');
    arrow.className = 'cat-arrow';
    arrow.textContent = '\u2192';

    // Recipient dropdown
    const sel = document.createElement('select');
    sel.className = 'cat-map-select';
    CATEGORIES.forEach(function(c) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (c === state.recipientCat) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function() {
      catState[cat].recipientCat = sel.value;
    });

    row.appendChild(chk);
    row.appendChild(ownerLabel);
    row.appendChild(arrow);
    row.appendChild(sel);
    container.appendChild(row);
  });
}

function toggleCatEnabled(cat) {
  if (catState[cat]) {
    catState[cat].enabled = !catState[cat].enabled;
    renderCatMappingList();
  }
}

function setCatMapping(cat, recipientCat) {
  if (catState[cat]) catState[cat].recipientCat = recipientCat;
}
function selectAllRecipients() {
  document.querySelectorAll('.recipient-chip').forEach(el => el.classList.add('selected'));
  renderRecipientLangPanel();
}
function clearRecipients() {
  document.querySelectorAll('.recipient-chip').forEach(el => el.classList.remove('selected'));
  renderRecipientLangPanel();
}

// ===== GENERATE =====
function generateRules() {
  const owner = document.getElementById('ownerName').value.trim() || 'DAZN Global';
  const compIds = getCompIds();
  const cats = getSelectedCats();
  const statuses = getStatuses();
  const articleTypes = getSelectedArticleTypes();
  const selectedRecipients = getSelectedRecipients();

  if (!compIds.length)        { showToast('⚠ Enter at least one Competition ID', 'error'); return; }
  if (!cats.length)           { showToast('⚠ Enable at least one category', 'error'); return; }
  if (!statuses.length)       { showToast('⚠ Select at least one status', 'error'); return; }
  if (!selectedRecipients.length) { showToast('⚠ Select at least one recipient', 'error'); return; }
  if (!articleTypes.length)   { showToast('⚠ Select at least one article type', 'error'); return; }

  generatedRows = [];

  compIds.forEach(compId => {
    cats.forEach(cat => {
      selectedRecipients.forEach(recipientName => {
        const recObj = RECIPIENTS.find(r => r.name === recipientName);
        if (!recObj) return;

        // Use only the enabled languages for this recipient
        const enabledLangs = [...(recipientLangState[recipientName] || new Set())];
        if (!enabledLangs.length) return;

        // Preserve the original language ordering from the recipient definition
        const orderedLangs = recObj.langs.filter(l => enabledLangs.includes(l));

        orderedLangs.forEach(lang => {
          statuses.forEach(status => {
            articleTypes.forEach(artType => {
              const recipientCat = getRecipientCatFor(cat);
              generatedRows.push([
                owner, lang, status, artType, compId, "", cat,
                ">>>",
                recipientName, lang, status, artType, recipientCat
              ]);
            });
          });
        });
      });
    });
  });

  renderTable(owner, compIds, selectedRecipients);
}

// ===== RENDER =====
function getCatClass(cat) {
  if (cat.includes('Football')) return 'football';
  if (cat.includes('Freemium') || cat.includes('Play4Free')) return 'freemium';
  if (cat.includes('B2B')) return 'b2b';
  if (cat.includes('B2C')) return 'b2c';
  if (cat.includes('Short')) return 'short';
  return '';
}

function renderTable(owner, compIds, recipients) {
  const wrapper = document.getElementById('tableWrapper');
  const totalRows = generatedRows.length;
  const previewRows = Math.min(totalRows, 500);

  const perComp = compIds.length > 0 ? Math.round(totalRows / compIds.length) : 0;
  document.getElementById('statComps').textContent = compIds.length;
  document.getElementById('statRecipients').textContent = recipients.length;
  document.getElementById('statPerComp').textContent = perComp;
  document.getElementById('statTotal').textContent = totalRows.toLocaleString();

  if (!totalRows) {
    wrapper.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠</div><h3>No rules generated</h3><p>Check your configuration — no rules match the selected languages and recipients.</p></div>`;
    document.getElementById('exportBar').style.display = 'none';
    return;
  }

  let html = `<table>
    <thead><tr>
      ${HEADER.slice(0,7).map(h => `<th>${h}</th>`).join('')}
      <th class="sep-col">>>></th>
      ${HEADER.slice(8).map(h => `<th>${h}</th>`).join('')}
    </tr></thead><tbody>`;

  for (let i = 0; i < previewRows; i++) {
    const r = generatedRows[i];
    html += `<tr>
      <td class="owner-col">${r[0]}</td>
      <td><span class="tag">${r[1]}</span></td>
      <td><span class="status-badge ${r[2]==='LIVE'?'status-live':'status-sched'}">${r[2]}</span></td>
      <td>${r[3]}</td>
      <td><span class="comp-id" title="${r[4]}">${r[4]}</span></td>
      <td>${r[5]}</td>
      <td><span class="cat-badge ${getCatClass(r[6])}">${r[6]}</span></td>
      <td class="sep-cell">>>></td>
      <td class="owner-col">${r[8]}</td>
      <td><span class="tag">${r[9]}</span></td>
      <td><span class="status-badge ${r[10]==='LIVE'?'status-live':'status-sched'}">${r[10]}</span></td>
      <td>${r[11]}</td>
      <td><span class="cat-badge ${getCatClass(r[12])}">${r[12]}</span></td>
    </tr>`;
  }

  if (totalRows > previewRows) {
    html += `<tr><td colspan="13" style="text-align:center;padding:16px;color:var(--text-dim);font-family:'DM Mono',monospace;font-size:11px;">
      … ${(totalRows - previewRows).toLocaleString()} more rows (export to see all ${totalRows.toLocaleString()})
    </td></tr>`;
  }

  html += '</tbody></table>';
  wrapper.innerHTML = html;

  document.getElementById('exportBar').style.display = 'flex';
  document.getElementById('exportOwner').textContent = owner;
  document.getElementById('exportRows').textContent = totalRows.toLocaleString();
  showToast(`✓ Generated ${totalRows.toLocaleString()} rules`, 'success');
}

// ===== EXPORT =====
function rowsToTSV() {
  return [HEADER.join('\t'), ...generatedRows.map(r => r.join('\t'))].join('\n');
}

function exportTSV() {
  if (!generatedRows.length) { showToast('Generate rules first', 'error'); return; }
  const blob = new Blob([rowsToTSV()], { type: 'text/tab-separated-values' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `DAZN_Sharing_Rules_${Date.now()}.tsv`;
  a.click(); URL.revokeObjectURL(url);
  showToast('✓ TSV exported', 'success');
}

function copyToClipboard() {
  if (!generatedRows.length) { showToast('Generate rules first', 'error'); return; }
  navigator.clipboard.writeText(rowsToTSV()).then(() => showToast('✓ Copied to clipboard', 'success'));
}

function exportXLSX() {
  if (!generatedRows.length) { showToast('Generate rules first', 'error'); return; }
  const rows = [HEADER, ...generatedRows];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `DAZN_Sharing_Rules_${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast('✓ CSV exported (open in Excel)', 'success');
}

function clearAll() {
  document.getElementById('compIds').value = '';
  updateCompCount();
  CATEGORIES.forEach(c => { catState[c] = { enabled: true, recipientCat: DEFAULT_CAT_MAPPING[c] || c }; });
  renderCatMappingList();
  document.querySelectorAll('.recipient-chip').forEach(el => el.classList.add('selected'));
  document.querySelectorAll('.art-chip').forEach(el => el.classList.toggle('selected', el.textContent === 'All'));
  document.getElementById('statusLive').checked = true;
  document.getElementById('statusScheduled').checked = true;
  RECIPIENTS.forEach(r => { recipientLangState[r.name] = new Set(r.langs); });
  renderRecipientLangPanel();
  generatedRows = [];
  document.getElementById('tableWrapper').innerHTML = `<div class="empty-state"><div class="empty-icon">⚙</div><h3>No rules generated yet</h3><p>Configure your sharing rules in the left panel, then click <strong>Generate Rules</strong> to preview them here.</p></div>`;
  document.getElementById('exportBar').style.display = 'none';
  ['statComps','statRecipients','statPerComp','statTotal'].forEach(id => document.getElementById(id).textContent = '0');
  showToast('✓ Reset complete', 'success');
}

function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast ' + type;
  void t.offsetWidth; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

init();
