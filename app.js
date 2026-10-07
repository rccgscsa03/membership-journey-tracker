// SCSA Membership Journey Tracker — page logic
(() => {
const MILES = [
  {k:'membership', label:'Discovering Membership Class', stage:1},
  {k:'baptism', label:'Baptism', stage:2},
  {k:'lifeCenter', label:'Joined Life Center', stage:3},
  {k:'workers', label:"Workers' Training", stage:3},
  {k:'placement', label:'Ministry Placement Assessment', stage:4},
  {k:'serving', label:'Serving in a Ministry', stage:4},
  {k:'lead', label:'Lead / Assist Ministry or Life Center', stage:5},
];
const TOTAL_LABEL = ['', 'completed the class', 'baptized', 'in a Life Center or trained', 'serving', 'leading or assisting'];
const STAGES = [
  {n:0, name:'Not Started', ms:'Visitor — no milestone yet', next:'Discovering Membership Class'},
  {n:1, name:'Connect', ms:'Completed Membership Class', next:'Baptism'},
  {n:2, name:'Commit', ms:'Baptized', next:'Join a Life Center'},
  {n:3, name:'Grow', ms:"Life Center & Workers' Training", next:'Complete Ministry Placement Assessment'},
  {n:4, name:'Serve', ms:'Serving in a ministry', next:'Lead or assist a ministry / Life Center'},
  {n:5, name:'Lead', ms:'Leading or assisting', next:'Multiply — develop the next leader'},
];
// Follow-up tracks, timings and attempt limits from the Follow-Up Strategy
const TRACKS = {
  A:{name:'First-time guest', days:42, limit:4, every:7},
  B:{name:'New convert', days:84, limit:6, every:7},
  C:{name:'New member', days:182, limit:0, every:30},
  M:{name:'Member', days:90, limit:0, every:30},
  D1:{name:'Absent member', days:90, limit:0, every:7},
  D2:{name:'Care moment', days:30, limit:0, every:7},
};
const STATUSES = {
  active:'Active', pastor:"Pastor's final call", handoff:'Handed off', released:'Released with a blessing', moved:'Moved out of town', lowtouch:'Low-touch list', closed:'Closed — connected or restored'
};
const KINDS = {reached:'Reached them', noanswer:'No answer', message:'Left a message', visit:'Visited in person', card:'Sent a card'};

// Help text for each "i" icon. Wording follows the workbook's How to Use sheet and the Follow-Up Strategy.
const TIPS = {
  stages:['Discipleship stages', "The big number is how many people are at that stage now: each person counts once, at the highest milestone they have a date for. The line at the bottom of each box counts everyone who has completed that milestone, including people who have since moved further. Click a stage to show only those people; click it again to show everyone.", ['Connect: completed the Membership Class','Commit: baptized',"Grow: joined a Life Center or Workers' Training",'Serve: placement assessment or serving in a ministry','Lead: leading or assisting a ministry or Life Center']],
  tracks:['Follow-up tracks', 'Each person on follow-up is on one track with a set length. Click a track to show only those people.', ['A, first-time guest: 6 weeks, 4 attempts','B, new convert: 12 weeks, 6 attempts','C, new member: 6 months',
'M, member: ongoing check-in, monthly contact for 90 days','D1, absent member: missed 3 Sundays in a row','D2, care moment: illness, loss, new baby, job loss']],
  needs:['Needs attention', 'Shows people on an active track who need action now:', ['Next contact is today or overdue','Checkpoint has arrived','Attempts are used up','Waiting on the pastor\'s final call','Absent member with 90 days and no contact']],
  search:['Search and sort', 'Search finds names, follow-up owners, and notes. Sort by name, newest members, soonest next contact, or highest stage. Click any row to open that person.'],
  name:['Full name', 'Last, First is recommended so the list sorts the same way as the workbook.'],
  joined:['Date joined', 'The date the person first joined or registered with the church.'],
  journey:['Journey milestones', 'Enter the date each milestone was completed, not a checkmark. Leave it blank if it is not done yet. The stage and next step update on their own.'],
  nextstep:['Next step', 'The milestone this person is ready for next, based on their current stage.'],
  track:['Track', 'Choosing a track starts follow-up today and schedules the first contact. Switching tracks restarts the clock and resets attempts. Choose "No active follow-up" to stop.'],
  owner:['Owner', 'The one person who answers for this name. A team can help, but one person is accountable.'],
  status:['Status', 'Where this person stands on their track:', ['Active: follow-up is underway','Pastor\'s final call: attempts are used up; the pastor makes one last contact','Handed off: moved on to their next step','Released with a blessing: a clear no or joined another church','Moved out of town: relocated; follow-up stops and they stay on file','Low-touch list: quarterly invitations only','Closed: connected or restored']],
  start:['Track started', 'Set automatically when you choose a track. The checkpoint is counted from this date.'],
  next:['Next contact', 'Set automatically when you log a contact. Change it if you agreed on a different day.'],
  checkpoint:['Checkpoint', 'The date the track\'s time is up. When it arrives, decide what comes next.'],
  attempts:['Attempts', 'No answer or a left message adds one. Reaching them or visiting resets the count to zero. Sending a card does not count.'],
  log:['Log a contact', 'Tap what happened today. It records the date, updates attempts, and sets the next contact.'],
  decision:['Checkpoint decision', 'Pick one when the checkpoint arrives:', ['Keep going: extends the track by its full length','Hand off: they move on to their next step','Release: a clear no or another church','Pastor\'s final call: attempts are used up','Low-touch list: quarterly invitations only']],
  notes:['Notes', 'Life Center name, track details, special circumstances. Everyone who can open this tracker can read these notes.'],
  lowtouch:['Low-touch list', 'Takes this person off active follow-up but keeps them on file with all their milestones, notes, and contact history. They receive quarterly invitations only. Use the Low-touch list filter at the top to see everyone on it, and Return to the active list to bring someone back.'],
  pastor:["Pastor's notes", 'Only the pastor can see or edit these. Other users cannot see them, search them, or download them.'],
};
const info = key => TIPS[key] ? `<button class="info" type="button" data-tip="${key}" aria-label="About ${esc(TIPS[key][0])}" aria-expanded="false">i</button>` : '';
let tipFor = null;
function showTip(btn){
  const tip = document.getElementById('tip'), key = btn.dataset.tip, t = TIPS[key]; if(!t) return;
  if(tipFor === btn){ hideTip(); return; }
  hideTip();
  document.getElementById('tip-t').textContent = t[0];
  const b = document.getElementById('tip-b'); b.innerHTML = `<div>${esc(t[1])}</div>` + (t[2] ? `<ul>${t[2].map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : '');
  tip.hidden = false; tipFor = btn; btn.setAttribute('aria-expanded','true');
  const r = btn.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
  let left = Math.min(Math.max(16, r.left + r.width/2 - w/2), vw - w - 16);
  let top = r.bottom + 8; if(top + h > vh - 16) top = Math.max(16, r.top - h - 8);
  tip.style.left = left + 'px'; tip.style.top = top + 'px';
}
function hideTip(){ const tip = document.getElementById('tip'); if(tip) tip.hidden = true; if(tipFor){ tipFor.setAttribute('aria-expanded','false'); tipFor = null; } }
const GUIDE = [
  ['Find a person', 'Type in the search box, or click a stage or a track to narrow the list. Click a row to open their record.'],
  ['Record a milestone', 'Open the person and enter the date in the Journey section. Use the completion date, not today\'s date, if it happened earlier. The stage updates on its own.'],
  ['Start follow-up', 'In the Follow-up section, choose a track and type the owner\'s name. The first contact is scheduled for you.'],
  ['Log a contact', 'After each call, text, visit, or card, tap the matching button. The next contact date is set automatically.'],
  ['Work the Needs attention list', 'Click Needs attention at the top of the page each week. Everyone on it has a contact due, a checkpoint due, or attempts used up.'],
  ['Make a checkpoint decision', 'When a checkpoint arrives, the decision buttons appear in the record. Keep going, hand off, release, pastor\'s final call, or low-touch.'],
  ['Someone moved or left', 'Open their record, add a note about where they went, and click Move to low-touch list. They stay on file with their history. Use Delete record permanently only for duplicates or mistakes.'],
  ['Add a new person', 'Click Add person, enter the name and date joined, then fill in milestones and follow-up.'],
  ['Download the list', 'Download CSV saves a spreadsheet with the same columns as the Membership Journey workbook. Pastor\'s notes are never included.'],
  ['Roles', 'Pastor: everything, including pastor\'s notes, permanent delete, and the Staff list. Leader: add and edit members and follow-up. Viewer: read only.'],
  ['Your password', 'Tap Password at the top of the page to set or change it. After that, sign in with your email and password; the emailed link still works too.'],
  ['Confidentiality', 'This tracker holds personal member data. Only people the pastor adds under Staff can sign in. Never forward your sign-in email to someone else.'],
];
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset()*6e4).toISOString().slice(0,10); };
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10); };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmt = iso => iso ? `${MONTHS.at(Number(iso.slice(5,7))-1)} ${Number(iso.slice(8,10))}, ${iso.slice(0,4)}` : '';
const fmtShort = iso => { if(!iso) return ''; const y = iso.slice(0,4); const s = `${MONTHS.at(Number(iso.slice(5,7))-1)} ${Number(iso.slice(8,10))}`; return y === today().slice(0,4) ? s : `${s}, ${y}`; };

function stageOf(p){ const m = p.m || {}; let s = 0; for (const x of MILES) if (m[x.k]) s = Math.max(s, x.stage); return s; }
function checkpoint(p){ const t = TRACKS[p.track]; if(!t || !p.ftStart) return ''; return addDays(p.ftStart, t.days + (p.ftExtend||0)); }
function attention(p){
  if(!TRACKS[p.track] || !['active','pastor'].includes(p.ftStatus||'active')) return [];
  const t = today(), out = [];
  if((p.ftStatus) === 'pastor') out.push("Pastor's final call");
  if(p.nextContact && p.nextContact <= t) out.push(p.nextContact < t ? 'Contact overdue' : 'Contact today');
  const cp = checkpoint(p); if(cp && cp <= t) out.push('Checkpoint due');
  const lim = TRACKS[p.track].limit; if(lim && (p.attempts||0) >= lim && p.ftStatus !== 'pastor') out.push('Attempts used up');
  if(p.track === 'D1' && p.lastContact && addDays(p.lastContact, 90) <= t) out.push('90 days without contact');
  return out;
}
const activeFU = p => TRACKS[p.track] && ['active','pastor'].includes(p.ftStatus || 'active');
const stageColor = n => `var(--s${n})`;
const stageInk = n => n >= 4 ? 'var(--s-ink-dark)' : 'var(--ink)';

let people = [], canWrite = false, loaded = false;
let isPastor = false, pnotes = {}; // pastor_notes — readable and writable only by the pastor role (database rule)
const ui = { stage:null, track:null, attn:false, low:false, q:'', sort:'name', open:null, confirmDel:false };
try { const s = JSON.parse(localStorage.getItem('mj-ui')||'{}'); if(s.sort) ui.sort = s.sort; } catch(e){}
$('#sort').value = ui.sort;

function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(()=>{t.hidden = true}, 2600); }

function renderLadder(){
  const counts = [0,0,0,0,0,0]; people.forEach(p => counts[stageOf(p)]++);
  const total = people.length || 1;
  // Milestone totals: everyone who has the milestone, whatever stage they have since reached
  const has = (p, ks) => ks.some(k => (p.m||{})[k]);
  const done = [0, ...[['membership'],['baptism'],['lifeCenter','workers'],['placement','serving'],['lead']].map(ks => people.filter(p => has(p, ks)).length)];
  $('#totalNote').textContent = loaded ? `${people.length} people tracked` : '';
  $('#ladder').innerHTML = STAGES.map(s => {
    const pct = Math.round(counts[s.n]/total*100);
    return `<button class="rung" type="button" data-stage="${s.n}" aria-pressed="${ui.stage===s.n}">
      <span class="label">${s.n ? 'Stage '+s.n : 'Before stage 1'}</span>
      <span class="n">${loaded ? counts[s.n] : '–'}</span>
      <span class="nm">${esc(s.name)}</span>
      <span class="bar"><i style="width:${loaded?pct:0}%;background:${stageColor(Math.max(s.n,1))}"></i></span>
      <span class="ms">${loaded ? pct+'% · ' : ''}${esc(s.ms)}</span>
      ${s.n && loaded ? `<span class="tot"><b>${done[s.n]}</b> ${esc(TOTAL_LABEL[s.n])} in total</span>` : ''}</button>`;
  }).join('');
}
function renderStrip(){
  const n = Object.fromEntries(Object.keys(TRACKS).map(k => [k, 0])); let attn = 0;
  people.forEach(p => { if(activeFU(p)) n[p.track]++; if(attention(p).length) attn++; });
  $('#fstrip').innerHTML = `<button class="chip attn" type="button" data-attn aria-pressed="${ui.attn}">Needs attention <b>${attn}</b></button>` +
    `<button class="chip" type="button" data-low aria-pressed="${ui.low}">Low-touch list <b>${people.filter(p => p.ftStatus === 'lowtouch').length}</b></button>` +
    Object.entries(TRACKS).map(([k,t]) => `<button class="chip" type="button" data-track="${k}" aria-pressed="${ui.track===k}"><span class="tag">${k}</span>${esc(t.name)} <b>${n[k]}</b></button>`).join('');
}
function filtered(){
  const q = ui.q.trim().toLowerCase();
  let list = people.filter(p => {
    if(ui.stage !== null && stageOf(p) !== ui.stage) return false;
    if(ui.track && !(activeFU(p) && p.track === ui.track)) return false;
    if(ui.attn && !attention(p).length) return false;
    if(ui.low && p.ftStatus !== 'lowtouch') return false;
    if(q && !`${p.name} ${p.owner||''} ${p.notes||''} ${isPastor ? (pnotes[p.id]||{}).text||'' : ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const by = {
    name:(a,b)=>a.name.localeCompare(b.name),
    joined:(a,b)=>(b.joined||'').localeCompare(a.joined||'') || a.name.localeCompare(b.name),
    next:(a,b)=>(a.nextContact||'9999').localeCompare(b.nextContact||'9999') || a.name.localeCompare(b.name),
    stage:(a,b)=>stageOf(b)-stageOf(a) || a.name.localeCompare(b.name),
  }[ui.sort];
  return list.sort(by);
}
function renderRows(){
  const st = $('#state'), rows = $('#rows');
  if(!loaded){ rows.innerHTML=''; return; }
  const list = filtered();
  $('#shown').textContent = people.length ? `Showing ${list.length} of ${people.length}` : '';
  if(!people.length){ rows.innerHTML=''; st.hidden=false; st.innerHTML = `<h3>No one on the list yet</h3><p>Add the first person to start tracking their journey.</p>`; return; }
  if(!list.length){ rows.innerHTML=''; st.hidden=false; st.innerHTML = `<h3>No one matches</h3><p>Clear a filter or the search to see more people.</p><button class="btn small" type="button" data-clear>Clear filters</button>`; return; }
  st.hidden = true;
  const t = today();
  rows.innerHTML = list.map(p => {
    const s = stageOf(p), a = attention(p), fu = activeFU(p);
    const ticks = MILES.map(m => `<i class="${p.m && p.m[m.k] ? 'on':''}" title="${esc(m.label)}"></i>`).join('');
    const nc = fu && p.nextContact ? `<span class="${p.nextContact <= t ? 'due':''}">${fmtShort(p.nextContact)}</span>` : '<span class="dim">—</span>';
    const fuCell = p.ftStatus === 'lowtouch' && !TRACKS[p.track] ? '<span class="dim">Low-touch list</span>' : TRACKS[p.track] ? `<span class="trk"><span class="tag">${p.track}</span>${esc(p.owner || 'No owner yet')}${fu ? '' : ` <span class="dim">· ${esc(STATUSES[p.ftStatus]||'')}</span>`}</span>` : '<span class="dim">—</span>';
    return `<tr data-id="${esc(p.id)}" tabindex="0">
      <td><div class="nm">${esc(p.name)}${isPastor && (pnotes[p.id]||{}).text ? '<span class="pmark" title="Has pastor\'s notes"></span>' : ''}</div>${a.length ? `<span class="flag">${esc(a[0])}</span>` : ''}</td>
      <td class="num dim">${fmtShort(p.joined)}</td>
      <td><span class="pill" style="background:${stageColor(s)};color:${stageInk(s)}">${s ? s+' · ' : ''}${STAGES[s].name}</span> <span class="ticks" aria-hidden="true">${ticks}</span></td>
      <td class="dim">${esc(STAGES[s].next)}</td>
      <td>${fuCell}</td>
      <td class="num">${nc}</td></tr>`;
  }).join('');
}
function typingInSheet(){ const a = document.activeElement; return !!(a && a.closest && a.closest('#sheet') && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && ['text','tel','search',''].includes(a.type)))); }
function render(){ renderLadder(); renderStrip(); renderRows(); if(ui.open && !typingInSheet()) renderSheet(); if(tipFor && !tipFor.isConnected) hideTip(); }
window.addEventListener('scroll', () => hideTip(), true);
window.addEventListener('resize', () => hideTip());

/* ---------- sheet ---------- */
function person(id){ return people.find(p => p.id === id); }
function openSheet(id){ ui.open = id; ui.confirmDel = false; $('#scrim').hidden = false; $('#sheet').hidden = false; renderSheet(true); }
function closeSheet(){ ui.open = null; $('#scrim').hidden = true; $('#sheet').hidden = true; }
function renderSheet(focus){
  const sh = $('#sheet');
  if(ui.open === '__staff'){ renderStaff(sh, focus); return; }
  if(ui.open === '__password'){ renderPassword(sh, focus); return; }
  if(ui.open === '__guide'){
    sh.innerHTML = `<header><div class="t"><span class="label">Membership Journey</span><h2 id="sh-name">How to use this tracker</h2></div>
      <button class="x" type="button" data-close aria-label="Close">×</button></header>
      <div class="body"><p class="hint">Tap any <span class="info as-icon" aria-hidden="true">i</span> on the page for help with that item.</p>
      <div class="guide-list">${GUIDE.map(g => `<div class="guide-item"><h3>${esc(g[0])}</h3><p>${esc(g[1])}</p></div>`).join('')}</div></div>`;
    if(focus) sh.querySelector('.x').focus({preventScroll:true});
    return;
  }
  const isNew = ui.open === '__new';
  const p = isNew ? {id:'__new', name:'', joined:today(), m:{}, track:'', ftStatus:'active', attempts:0, log:[]} : person(ui.open);
  if(!p){ closeSheet(); return; }
  const active = document.activeElement && sh.contains(document.activeElement) ? document.activeElement.id : null;
  const s = stageOf(p), t = TRACKS[p.track], cp = checkpoint(p), a = attention(p), td = today();
  const dis = canWrite ? '' : 'disabled';
  sh.innerHTML = `
  <header><div class="t"><span class="label">${isNew ? 'New person' : `Stage ${s} · ${STAGES[s].name}`}</span>
    <h2 id="sh-name">${esc(p.name || 'Add a person')}</h2></div>
    <button class="x" type="button" data-close aria-label="Close">×</button></header>
  <div class="body">
    <div class="sec">
      <div class="grid2">
        <div class="field"><div class="lbl"><label for="f-name">Full name</label>${info('name')}</div><input id="f-name" value="${esc(p.name)}" placeholder="Last, First recommended" ${dis}></div>
        <div class="field"><div class="lbl"><label for="f-joined">Date joined</label>${info('joined')}</div><input id="f-joined" type="date" value="${esc(p.joined||'')}" ${dis}></div>
      </div>
      ${isNew ? `<div class="row"><button class="btn primary" type="button" data-create>Add to the list</button></div>` : ''}
    </div>
    ${isNew ? '' : `
    <div class="sec">
      <div class="hd"><div class="ht"><h2>Journey</h2>${info('journey')}</div><span class="hint">Enter the date each milestone was completed</span></div>
      <div class="nextstep lbl">${info('nextstep')}<span>Next step: <b>${esc(STAGES[s].next)}</b></span></div>
      <div class="miles">${MILES.map(m => `<div class="mile ${p.m && p.m[m.k] ? 'done':''}">
        <span class="st">Stage ${m.stage}</span><span class="mn">${esc(m.label)}</span>
        <input type="date" id="m-${m.k}" data-mile="${m.k}" value="${esc((p.m||{})[m.k]||'')}" aria-label="${esc(m.label)} date" ${dis}></div>`).join('')}</div>
    </div>
    <div class="sec">
      <div class="hd"><div class="ht"><h2>Follow-up</h2>${info('tracks')}</div>${t ? `<span class="hint">${esc(t.name)} · ${Math.round(t.days/7)} weeks${t.limit ? ` · ${t.limit} attempts` : ''}</span>` : ''}</div>
      <div class="grid2">
        <div class="field"><div class="lbl"><label for="f-track">Track</label>${info('track')}</div><select id="f-track" ${dis}>
          <option value="">No active follow-up</option>
          ${Object.entries(TRACKS).map(([k,v]) => `<option value="${k}" ${p.track===k?'selected':''}>${k} — ${esc(v.name)}</option>`).join('')}</select></div>
        <div class="field"><div class="lbl"><label for="f-owner">Owner</label>${info('owner')}</div><input id="f-owner" value="${esc(p.owner||'')}" placeholder="Who answers for this name" ${dis}></div>
        <div class="field"><label for="f-phone">Phone</label><input id="f-phone" type="tel" value="${esc(p.phone||'')}" ${dis}></div>
        <div class="field"><div class="lbl"><label for="f-status">Status</label>${info('status')}</div><select id="f-status" ${dis}>
          ${Object.entries(STATUSES).map(([k,v]) => `<option value="${k}" ${(p.ftStatus||'active')===k?'selected':''}>${esc(v)}</option>`).join('')}</select></div>
        <div class="field"><div class="lbl"><label for="f-start">Track started</label>${info('start')}</div><input id="f-start" type="date" value="${esc(p.ftStart||'')}" ${dis}></div>
        <div class="field"><div class="lbl"><label for="f-next">Next contact</label>${info('next')}</div><input id="f-next" type="date" value="${esc(p.nextContact||'')}" ${dis}></div>
      </div>
      ${t ? `<div class="facts">
        <div class="fact ${cp && cp<=td ? 'warn':''}"><span class="lbl"><span class="label">Checkpoint</span>${info('checkpoint')}</span><span class="v">${cp ? fmtShort(cp) : '—'}</span></div>
        <div class="fact ${t.limit && (p.attempts||0)>=t.limit ? 'warn':''}"><span class="lbl"><span class="label">Attempts</span>${info('attempts')}</span><span class="v">${p.attempts||0}${t.limit ? ' of '+t.limit : ''}</span></div>
        <div class="fact"><span class="label">Last contact</span><span class="v">${p.lastContact ? fmtShort(p.lastContact) : '—'}</span></div></div>
      ${a.length ? `<div class="row">${a.map(x=>`<span class="flag">${esc(x)}</span>`).join('')}</div>` : ''}
      <div class="sec editonly"><span class="lbl"><span class="label">Log a contact today</span>${info('log')}</span>
        <div class="row">${Object.entries(KINDS).map(([k,v]) => `<button class="btn small" type="button" data-log="${k}">${esc(v)}</button>`).join('')}</div>
        <p class="hint">A contact sets the next one ${t.every} days out. No answer or a message counts as an attempt; reaching them resets the count.</p></div>
      ${cp && cp<=td ? `<div class="sec editonly"><span class="lbl"><span class="label">Checkpoint decision</span>${info('decision')}</span><div class="row">
        <button class="btn small" type="button" data-decide="extend">Keep going ${Math.round(t.days/7)} more weeks</button>
        <button class="btn small" type="button" data-decide="handoff">Hand off</button>
        <button class="btn small" type="button" data-decide="released">Release with a blessing</button>
        <button class="btn small" type="button" data-decide="pastor">Pastor's final call</button>
        <button class="btn small" type="button" data-decide="lowtouch">Low-touch list</button></div></div>` : ''}
      ${(p.log||[]).length ? `<div class="sec"><span class="label">Contact log</span><ul class="log">${p.log.slice().reverse().slice(0,25).map(l => `<li><span class="d">${fmtShort(l.d)}</span><span>${esc(KINDS[l.kind]||l.kind)}</span></li>`).join('')}</ul></div>` : ''}
      ` : `<p class="hint">Choose a track to start following up. Guests go on A, new converts on B, new members on C, current members you are checking in with on M, absent members on D1, and members in a care moment on D2.</p>`}
    </div>
    <div class="sec">
      <div class="field"><div class="lbl"><label for="f-notes">Notes</label>${info('notes')}</div><textarea id="f-notes" placeholder="Life Center name, special circumstances" ${dis}>${esc(p.notes||'')}</textarea></div>
      <p class="hint">Everyone who can open this tracker sees these notes.${isPastor ? ' Put anything sensitive in Pastor\'s notes below.' : ' Share anything sensitive with the pastor directly.'}</p>
    </div>
    ${isPastor ? `<div class="sec pastor">
      <div class="hd"><div class="ht"><h2>Pastor's notes</h2>${info('pastor')}</div><span class="lock">Only you can see this</span></div>
      <div class="field"><label for="f-pnote" class="vh">Pastor's notes</label><textarea id="f-pnote" placeholder="Counseling, prayer needs, family matters, anything confidential">${esc((pnotes[p.id]||{}).text||'')}</textarea></div>
      ${(pnotes[p.id]||{}).updated ? `<p class="hint">Last updated ${fmtShort(pnotes[p.id].updated)}</p>` : ''}
    </div>` : ''}
    <div class="sec editonly">
      <div class="row lbl">${p.ftStatus === 'lowtouch'
        ? `<button class="btn small" type="button" data-unlow>Return to the active list</button>`
        : `<button class="btn small" type="button" data-lowtouch>Move to low-touch list</button>`}${info('lowtouch')}</div>
      ${ui.confirmDel
        ? `<div class="row"><span>Delete ${esc(p.name)} permanently? Their milestones and contact history are erased and cannot be recovered.</span><button class="btn small danger" type="button" data-del-yes>Delete permanently</button><button class="btn small" type="button" data-del-no>Keep</button></div>`
        : (isPastor ? `<button class="linkbtn" type="button" data-del>Delete record permanently (duplicates or mistakes only)</button>` : '')}
    </div>`}
  </div>`;
  if(focus) (sh.querySelector('#f-name') || sh.querySelector('.x')).focus({preventScroll:true});
  else if(active && document.getElementById(active)) document.getElementById(active).focus({preventScroll:true});
}

/* ---------- data: Supabase ---------- */
// The page keeps people in the same shape the original tracker used; these two functions translate to and from the database row.
function fromRow(r){
  return {id:r.id, name:r.name, joined:r.joined||'', m:r.milestones||{}, track:r.track||'', owner:r.owner||'', phone:r.phone||'',
    ftStatus:r.ft_status||'active', ftStart:r.ft_start||'', ftExtend:r.ft_extend||0, nextContact:r.next_contact||'', attempts:r.attempts||0,
    lastContact:r.last_contact||'', log:r.contact_log||[], notes:r.notes||'', lowTouchSince:r.low_touch_since||'', updatedBy:r.updated_by||'', updatedAt:r.updated_at||''};
}
function toRow(p){
  const d = v => v ? v : null;
  return {name:p.name, joined:d(p.joined), milestones:p.m||{}, track:p.track||'', owner:p.owner||'', phone:p.phone||'',
    ft_status:p.ftStatus||'active', ft_start:d(p.ftStart), ft_extend:p.ftExtend||0, next_contact:d(p.nextContact), attempts:p.attempts||0,
    last_contact:d(p.lastContact), contact_log:p.log||[], notes:p.notes||'', low_touch_since:d(p.lowTouchSince)};
}
const queue = new Map(); // one write at a time per person
async function save(id, patch, msg){
  const p = person(id); if(!p || !sb) return;
  if(!canWrite){ toast('Your role can view this list but not change it.'); return; }
  Object.assign(p, patch); render();
  const prev = queue.get(id) || Promise.resolve();
  const run = prev.then(async () => {
    const { error } = await sb.from('members').update(toRow(p)).eq('id', id);
    if(error) handleWriteError(error); else if(msg) toast(msg);
  });
  queue.set(id, run);
}
function handleWriteError(e){
  console.error(e);
  if(e && (e.code === '42501' || /row-level security|permission/i.test(e.message||''))) toast('Your role is not allowed to make that change.');
  else if(e && /JWT|session/i.test(e.message||'')) toast('Your sign-in expired. Reload the page and sign in again.');
  else toast("That change didn't save. Check your connection and try again.");
}
let pnQueue = Promise.resolve();
function savePastorNote(id, text){
  const body = {text, updated: today()};
  pnotes = {...pnotes, [id]: body}; render();
  pnQueue = pnQueue.then(async () => {
    const { error } = await sb.from('pastor_notes').upsert({member_id:id, body:text, updated_at:new Date().toISOString()});
    if(error){ console.error(error); toast("Pastor's note didn't save. Check your connection and try again."); } else toast("Pastor's note saved");
  });
}
function fieldChange(el){
  if(el.closest('[data-staff-row]') || el.closest('#staffForm') || el.closest('#pwForm')) return;
  const id = ui.open; if(!id || id.startsWith('__')) return; const p = person(id); if(!p) return;
  if(el.id === 'f-pnote'){ if(isPastor) savePastorNote(id, el.value.trim()); return; }
  const v = el.value.trim();
  if(el.dataset.mile){ const m = {...(p.m||{})}; if(v) m[el.dataset.mile] = v; else delete m[el.dataset.mile]; return save(id, {m}, 'Milestone saved'); }
  const map = {'f-name':'name','f-joined':'joined','f-owner':'owner','f-phone':'phone','f-status':'ftStatus','f-start':'ftStart','f-next':'nextContact','f-notes':'notes'};
  if(el.id === 'f-track'){
    const patch = {track:v};
    if(v && v !== p.track){ Object.assign(patch, {ftStart:today(), ftExtend:0, ftStatus:'active', attempts:0, nextContact: addDays(today(), v==='A'||v==='B'||v==='D2' ? 1 : 2)}); }
    return save(id, patch, v ? `Started track ${v}` : 'Follow-up stopped');
  }
  if(map[el.id]){ if(el.id==='f-name' && !v) return; return save(id, {[map[el.id]]: v}, 'Saved'); }
}
function logContact(kind){
  const p = person(ui.open); if(!p) return; const t = TRACKS[p.track]; const d = today();
  const log = [...(p.log||[]), {d, kind}].slice(-60);
  const reached = kind === 'reached' || kind === 'visit';
  save(p.id, {log, lastContact:d, attempts: reached ? 0 : (p.attempts||0) + (kind==='card' ? 0 : 1), nextContact: addDays(d, t ? t.every : 7)}, `Logged: ${KINDS[kind]}`);
}
function decide(k){
  const p = person(ui.open); if(!p) return; const t = TRACKS[p.track];
  if(k === 'extend') return save(p.id, {ftExtend:(p.ftExtend||0) + t.days, ftStatus:'active'}, 'Checkpoint moved out');
  save(p.id, {ftStatus:k}, STATUSES[k]);
}
async function createPerson(){
  const name = $('#f-name').value.trim(); if(!name){ toast('Enter a name first.'); $('#f-name').focus(); return; }
  if(!sb || !canWrite) return;
  const draft = {name, joined:$('#f-joined').value || '', m:{}, track:'', ftStatus:'active', attempts:0, log:[], notes:''};
  const { data, error } = await sb.from('members').insert(toRow(draft)).select().single();
  if(error){ handleWriteError(error); return; }
  const p = fromRow(data); if(!person(p.id)) people.push(p); ui.open = p.id; render(); toast('Added to the list');
}
async function removePerson(){
  const id = ui.open; const keep = people;
  closeSheet(); people = people.filter(p => p.id !== id); render();
  const { error } = await sb.from('members').delete().eq('id', id);
  if(error){ people = keep; render(); handleWriteError(error); } else toast('Deleted permanently');
}

/* ---------- staff (pastor only) ---------- */
let staff = [];
async function loadStaff(){
  const { data, error } = await sb.from('staff').select('*').order('role').order('email');
  if(!error) staff = data || [];
}
const ROLES = {pastor:'Pastor — everything, including pastor\'s notes and staff', leader:'Leader — add and edit members and follow-up', viewer:'Viewer — read only'};
function renderStaff(sh, focus){
  sh.innerHTML = `<header><div class="t"><span class="label">Who can sign in</span><h2 id="sh-name">Staff</h2></div>
    <button class="x" type="button" data-close aria-label="Close">×</button></header>
    <div class="body">
      <p class="hint">Only people on this list can sign in. They sign in with an emailed link, so no passwords are needed. Removing someone stops their next sign-in.</p>
      <form class="sec" id="staffForm" autocomplete="off">
        <div class="grid2">
          <div class="field"><label for="s-email">Email</label><input id="s-email" type="email" required placeholder="name@example.org"></div>
          <div class="field"><label for="s-name">Name</label><input id="s-name" placeholder="Full name"></div>
        </div>
        <div class="field"><label for="s-role">Role</label><select id="s-role">${Object.entries(ROLES).filter(([k])=>k!=='pastor').map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}<option value="pastor">${esc(ROLES.pastor)}</option></select></div>
        <div class="row"><button class="btn primary" type="submit">Add to staff</button></div>
      </form>
      <div class="sec"><span class="label">${staff.length} on staff</span>
        <ul class="staff-list">${staff.map(s => `<li data-staff-row="${esc(s.email)}">
          <div class="who"><b>${esc(s.full_name || s.email)}</b><span class="dim">${esc(s.email)}</span></div>
          <select aria-label="Role for ${esc(s.email)}" data-staff-role="${esc(s.email)}" ${s.email === myEmail ? 'disabled' : ''}>${Object.keys(ROLES).map(k=>`<option value="${k}" ${s.role===k?'selected':''}>${k[0].toUpperCase()+k.slice(1)}</option>`).join('')}</select>
          ${s.email === myEmail ? '<span class="dim you">You</span>' : `<button class="linkbtn" type="button" data-staff-remove="${esc(s.email)}">Remove</button>`}
        </li>`).join('')}</ul>
      </div>
    </div>`;
  if(focus) sh.querySelector('#s-email').focus({preventScroll:true});
}
async function addStaff(){
  const email = $('#s-email').value.trim().toLowerCase(), full_name = $('#s-name').value.trim(), role = $('#s-role').value;
  if(!/^\S+@\S+\.\S+$/.test(email)){ toast('Enter a valid email address.'); return; }
  const { error } = await sb.from('staff').upsert({email, full_name, role});
  if(error){ handleWriteError(error); return; }
  await loadStaff(); renderSheet(); toast(`${full_name || email} can now sign in`);
}
async function setStaffRole(email, role){
  const { error } = await sb.from('staff').update({role}).eq('email', email);
  if(error) handleWriteError(error); else { await loadStaff(); renderSheet(); toast('Role updated'); }
}
async function removeStaff(email){
  const { error } = await sb.from('staff').delete().eq('email', email);
  if(error) handleWriteError(error); else { await loadStaff(); renderSheet(); toast('Removed from staff'); }
}

/* ---------- CSV ---------- */
function csv(){
  const head = ['Date Joined','Full Name',...MILES.map(m=>m.label),'Stage Reached','Track','Owner','Phone','Status','Track Started','Next Contact','Attempts','Last Contact','Notes'];
  const q = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
  const lines = [head.map(q).join(',')];
  people.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(p => { const s = stageOf(p);
    lines.push([p.joined, p.name, ...MILES.map(m => (p.m||{})[m.k]||''), s ? `Stage ${s} — ${STAGES[s].name}` : 'Not Started', p.track||'', p.owner||'', p.phone||'', (p.track || p.ftStatus === 'lowtouch') ? STATUSES[p.ftStatus||'active'] : '', p.ftStart||'', p.nextContact||'', p.attempts||0, p.lastContact||'', p.notes||''].map(q).join(','));
  });
  return lines.join('\n');
}
function downloadCsv(){
  const blob = new Blob(['﻿' + csv()], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `membership-journey-${today()}.csv`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const infoBtn = e.target.closest('button.info');
  if(infoBtn){ e.stopPropagation(); showTip(infoBtn); return; }
  if(!e.target.closest('#tip')) hideTip();
  const el = e.target.closest('button,tr[data-id],.scrim'); if(!el) return;
  if(el.matches('#guideBtn')) return openSheet('__guide');
  if(el.matches('.rung')){ const n = Number(el.dataset.stage); ui.stage = ui.stage === n ? null : n; return render(); }
  if(el.matches('[data-attn]')){ ui.attn = !ui.attn; return render(); }
  if(el.matches('[data-low]')){ ui.low = !ui.low; return render(); }
  if(el.matches('[data-lowtouch]')){ const p = person(ui.open); if(p) save(p.id, {ftStatus:'lowtouch', lowTouchSince: today(), nextContact:''}, 'Moved to the low-touch list'); return; }
  if(el.matches('[data-unlow]')){ const p = person(ui.open); if(p) save(p.id, {ftStatus:'active'}, 'Returned to the active list'); return; }
  if(el.matches('[data-track]')){ ui.track = ui.track === el.dataset.track ? null : el.dataset.track; return render(); }
  if(el.matches('[data-clear]')){ Object.assign(ui,{stage:null,track:null,attn:false,low:false,q:''}); $('#q').value=''; return render(); }
  if(el.matches('tr[data-id]')) return openSheet(el.dataset.id);
  if(el.matches('#addBtn')) return openSheet('__new');
  if(el.matches('#csvBtn')){ downloadCsv(); return; }
  if(el.matches('#staffBtn')) return openSheet('__staff');
  if(el.matches('[data-staff-remove]')) return removeStaff(el.dataset.staffRemove);
  if(el.matches('[data-close],.scrim')) return closeSheet();
  if(el.matches('[data-create]')) return createPerson();
  if(el.matches('[data-log]')) return logContact(el.dataset.log);
  if(el.matches('[data-decide]')) return decide(el.dataset.decide);
  if(el.matches('[data-del]')){ ui.confirmDel = true; return renderSheet(); }
  if(el.matches('[data-del-no]')){ ui.confirmDel = false; return renderSheet(); }
  if(el.matches('[data-del-yes]')) return removePerson();
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && tipFor){ const b = tipFor; hideTip(); b.focus(); return; }
  if(e.key === 'Escape' && ui.open) closeSheet();
  if(e.key === 'Enter' && e.target.matches && e.target.matches('tr[data-id]')) openSheet(e.target.dataset.id);
});
document.addEventListener('change', e => {
  if(e.target.dataset.staffRole) return setStaffRole(e.target.dataset.staffRole, e.target.value);
  if(e.target.closest('#sheet')) fieldChange(e.target);
});
document.addEventListener('submit', e => { if(e.target.id === 'staffForm'){ e.preventDefault(); addStaff(); }
  if(e.target.id === 'pwForm'){ e.preventDefault(); savePassword(); } });
$('#q').addEventListener('input', e => { ui.q = e.target.value; renderRows(); });
$('#sort').addEventListener('change', e => { ui.sort = e.target.value; try{localStorage.setItem('mj-ui', JSON.stringify({sort:ui.sort}))}catch(err){} renderRows(); });

/* ---------- boot ---------- */
let sb = null, role = null, myEmail = '';
function showScreen(name){ $('#login').hidden = name !== 'login'; $('#app').hidden = name !== 'app'; }
function loginMessage(html){ $('#login-msg').innerHTML = html; $('#login-msg').hidden = !html; }
async function startApp(session){
  myEmail = (session.user.email || '').toLowerCase();
  const { data: r, error } = await sb.rpc('my_role');
  if(error || !r){
    await sb.auth.signOut(); showScreen('login');
    loginMessage(`<b>${esc(myEmail)}</b> is not on the staff list. Ask the pastor to add you, then sign in again.`);
    return;
  }
  role = r; isPastor = role === 'pastor'; canWrite = role === 'pastor' || role === 'leader';
  document.body.classList.toggle('ro', !canWrite);
  $('#acct-email').textContent = myEmail; $('#acct-role').textContent = role[0].toUpperCase() + role.slice(1);
  $('#staffBtn').hidden = !isPastor;
  showScreen('app'); render();
  await loadPeople();
  if(isPastor){ await Promise.all([loadNotes(), loadStaff()]); render(); }
  subscribe();
}
async function loadPeople(){
  const all = []; let from = 0;
  for(;;){ // page through in case the list grows past one page
    const { data, error } = await sb.from('members').select('*').order('name').range(from, from + 999);
    if(error){ $('#state').hidden = false; $('#state').innerHTML = '<h3>The list did not load</h3><p>Check your connection and reload the page.</p>'; console.error(error); return; }
    all.push(...data); if(data.length < 1000) break; from += 1000;
  }
  people = all.map(fromRow); loaded = true; render();
}
async function loadNotes(){
  const { data } = await sb.from('pastor_notes').select('*');
  pnotes = {}; (data||[]).forEach(n => { pnotes[n.member_id] = {text:n.body, updated:(n.updated_at||'').slice(0,10)}; });
}
function subscribe(){
  sb.channel('members-live')
    .on('postgres_changes', {event:'*', schema:'public', table:'members'}, ev => {
      if(ev.eventType === 'DELETE'){ people = people.filter(p => p.id !== ev.old.id); }
      else { const p = fromRow(ev.new), i = people.findIndex(x => x.id === p.id); if(i >= 0) people[i] = p; else people.push(p); }
      render();
    })
    .on('postgres_changes', {event:'*', schema:'public', table:'pastor_notes'}, ev => {
      if(!isPastor) return;
      if(ev.eventType === 'DELETE') delete pnotes[ev.old.member_id];
      else pnotes[ev.new.member_id] = {text:ev.new.body, updated:(ev.new.updated_at||'').slice(0,10)};
      renderRows(); if(ui.open && !typingInSheet()) renderSheet();
    })
    .subscribe();
}
async function signInPassword(e){
  e.preventDefault();
  const email = $('#login-email').value.trim().toLowerCase(), password = $('#login-password').value;
  if(!/^\S+@\S+\.\S+$/.test(email)){ loginMessage('Enter the email address the pastor added for you.'); $('#login-email').focus(); return; }
  if(!password){ loginMessage('Enter your password, or use the emailed sign-in link below.'); $('#login-password').focus(); return; }
  const btn = $('#login-btn'); btn.disabled = true; btn.textContent = 'Signing in…';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'Sign in';
  if(error){
    loginMessage(/invalid|credentials/i.test(error.message||'') ? 'That email and password don\'t match. Check both and try again, or use the emailed sign-in link.' : (/confirm/i.test(error.message||'') ? 'This account has not been confirmed yet. Ask the pastor to confirm it in Supabase.' : 'Sign-in failed. Try again in a moment.'));
    return;
  }
  loginMessage('');
  if(data && data.session && !role) startApp(data.session);
}
async function sendLink(){
  const email = $('#login-email').value.trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email)){ loginMessage('Enter the email address the pastor added for you, then tap the link option again.'); $('#login-email').focus(); return; }
  const btn = $('#link-btn'); btn.disabled = true;
  const { error } = await sb.auth.signInWithOtp({ email, options:{ emailRedirectTo: location.origin + location.pathname } });
  btn.disabled = false;
  if(error){
    const notStaff = /staff list|Database error/i.test(error.message || '');
    loginMessage(notStaff ? `<b>${esc(email)}</b> is not on the staff list. Ask the pastor to add you.` : (/rate|seconds/i.test(error.message||'') ? 'Too many sign-in emails were sent. Wait a minute, then try again.' : 'The sign-in email could not be sent. Try again in a moment, or sign in with your password.'));
    return;
  }
  loginMessage(`Check <b>${esc(email)}</b> for a sign-in link. It expires in one hour. You can close this tab.`);
}
function renderPassword(sh, focus){
  sh.innerHTML = `<header><div class="t"><span class="label">${esc(myEmail)}</span><h2 id="sh-name">Set your password</h2></div>
    <button class="x" type="button" data-close aria-label="Close">×</button></header>
    <div class="body">
      <p class="hint">Set a password so you can sign in without waiting for an email. Use at least 10 characters.</p>
      <form class="sec" id="pwForm" autocomplete="off">
        <div class="field"><label for="pw-new">New password</label><input id="pw-new" type="password" autocomplete="new-password" minlength="10" required></div>
        <div class="field"><label for="pw-again">Type it again</label><input id="pw-again" type="password" autocomplete="new-password" minlength="10" required></div>
        <div class="row"><button class="btn primary" type="submit">Save password</button></div>
      </form>
    </div>`;
  if(focus) sh.querySelector('#pw-new').focus({preventScroll:true});
}
async function savePassword(){
  const a1 = $('#pw-new').value, a2 = $('#pw-again').value;
  if(a1.length < 10){ toast('Use at least 10 characters.'); return; }
  if(a1 !== a2){ toast('The two passwords don\'t match.'); return; }
  const { error } = await sb.auth.updateUser({ password: a1 });
  if(error){ toast(/weak|short|pwned|leaked/i.test(error.message||'') ? 'Choose a stronger password.' : 'The password was not saved. Try again.'); return; }
  closeSheet(); toast('Password saved. You can sign in with it from now on.');
}
render();
(async () => {
  const cfg = window.SCSA_CONFIG || {};
  if(!window.supabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey){ showScreen('login'); loginMessage('This site is not connected to its database yet. Add the Supabase URL and key to <code>config.js</code>.'); $('#login-form').hidden = true; return; }
  sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
  $('#login-form').addEventListener('submit', signInPassword);
  $('#link-btn').addEventListener('click', sendLink);
  $('#pwBtn').addEventListener('click', () => openSheet('__password'));
  $('#signOutBtn').addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });
  const { data:{ session } } = await sb.auth.getSession();
  if(session) startApp(session); else showScreen('login');
  sb.auth.onAuthStateChange((ev, s) => { if(ev === 'SIGNED_IN' && s && !role) startApp(s); if(ev === 'SIGNED_OUT') showScreen('login'); });
})();
})();
