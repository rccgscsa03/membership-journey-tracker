// SCSA daily follow-up digest — Supabase Edge Function ("daily-digest").
// Paste this whole file into Supabase → Edge Functions → Deploy a new function → Via Editor.
// Secrets it needs (Edge Functions → Secrets): RESEND_API_KEY, CRON_SECRET, SITE_URL, optional DIGEST_COPY_TO.
// Test: POST .../functions/v1/daily-digest?force=1&only=pastor@rccgsanantonio.org with header x-cron-secret.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

const TRACKS = {
  A: { name: 'First-time guest', days: 42, limit: 4 },
  B: { name: 'New convert', days: 84, limit: 6 },
  C: { name: 'New member', days: 182, limit: 0 },
  M: { name: 'Member', days: 90, limit: 0 },
  D1: { name: 'Absent member', days: 90, limit: 0 },
  D2: { name: 'Care moment', days: 30, limit: 0 },
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function chicagoNow(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(date).map(p => [p.type, p.value]));
  return { iso: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24, weekday: parts.weekday };
}
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function fmt(iso) { return iso ? `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}` : ''; }
function norm(s) {
  return String(s || '').toLowerCase()
    .replace(/\b(pastor|pst|rev|reverend|dr|deacon|deaconess|bro|brother|sis|sister|mr|mrs|ms|elder|minister)\.?\b/g, ' ')
    .replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
}
function checkpoint(m) { const t = TRACKS[m.track]; return t && m.ft_start ? addDays(m.ft_start, t.days + (m.ft_extend || 0)) : ''; }
function isActive(m) { return !!TRACKS[m.track] && ['active', 'pastor'].includes(m.ft_status || 'active'); }

// Why a member needs attention today — same rules as the tracker page
function reasons(m, today) {
  if (!isActive(m)) return [];
  const out = [];
  if (m.ft_status === 'pastor') out.push("Waiting on the pastor's final call");
  if (m.next_contact && m.next_contact <= today) out.push(m.next_contact < today ? `Contact overdue since ${fmt(m.next_contact)}` : 'Contact due today');
  const cp = checkpoint(m); if (cp && cp <= today) out.push(`Checkpoint reached ${fmt(cp)}`);
  const lim = TRACKS[m.track].limit; if (lim && (m.attempts || 0) >= lim && m.ft_status !== 'pastor') out.push(`All ${lim} attempts used`);
  if (m.track === 'D1' && m.last_contact && addDays(m.last_contact, 90) <= today) out.push('90 days without contact');
  return out;
}

// Build one digest per staff member. Pastors also get final calls and the church-wide summary.
function buildDigests(members, staff, today) {
  const digests = [];
  const weekAgo = addDays(today, -7);
  const summary = {
    total: members.length,
    needsAttention: members.filter(m => reasons(m, today).length).length,
    overdue: members.filter(m => isActive(m) && m.next_contact && m.next_contact < today).length,
    joinedThisWeek: members.filter(m => (m.joined || '') >= weekAgo && (m.joined || '') <= today).length,
    lowTouch: members.filter(m => m.ft_status === 'lowtouch').length,
    byTrack: Object.fromEntries(Object.keys(TRACKS).map(k => [k, members.filter(m => m.track === k && isActive(m)).length])),
  };
  for (const s of staff) {
    const me = norm(s.full_name);
    const mine = me ? members.filter(m => isActive(m) && norm(m.owner) === me) : [];
    const due = mine.map(m => ({ m, why: reasons(m, today) })).filter(x => x.why.length)
      .sort((a, b) => (a.m.next_contact || '9999').localeCompare(b.m.next_contact || '9999'));
    const upcoming = mine.filter(m => !reasons(m, today).length && m.next_contact && m.next_contact <= addDays(today, 7))
      .sort((a, b) => a.next_contact.localeCompare(b.next_contact));
    const isPastor = s.role === 'pastor';
    const finalCalls = isPastor ? members.filter(m => m.ft_status === 'pastor' && TRACKS[m.track]) : [];
    if (!isPastor && !due.length && !upcoming.length) continue; // nothing for this leader today
    digests.push({ to: s.email, name: s.full_name || s.email, isPastor, owned: mine.length, due, upcoming, finalCalls, summary: isPastor ? summary : null });
  }
  return digests;
}

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function renderEmail(d, today, site) {
  const first = String(d.name).replace(/^(pastor|pst|rev|dr)\.?\s+/i, '').split(' ')[0];
  const row = (m, sub) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e4e3dc"><a href="${esc(site)}" style="color:#00254a;font-weight:600;text-decoration:none">${esc(m.name)}</a> <span style="color:#6b6a63;font-size:12px">· ${esc(m.track)} ${esc(TRACKS[m.track]?.name || '')}</span><div style="color:#6b6a63;font-size:13px;margin-top:2px">${esc(sub)}</div></td></tr>`;
  const section = (title, rows) => rows.length ? `<h2 style="font:600 16px Georgia,serif;color:#00254a;margin:26px 0 4px">${esc(title)}</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows.join('')}</table>` : '';
  const due = d.due.map(x => row(x.m, x.why.join(' · ') + (x.m.phone ? ` · ${x.m.phone}` : '')));
  const upcoming = d.upcoming.map(m => row(m, `Next contact ${fmt(m.next_contact)}`));
  const finals = d.finalCalls.map(m => row(m, `Owner: ${m.owner || 'none'} · ${m.attempts || 0} attempts, no answer`));
  let summary = '';
  if (d.summary) {
    const s = d.summary;
    const tracks = Object.entries(s.byTrack).filter(([, n]) => n).map(([k, n]) => `${k} ${TRACKS[k].name}: ${n}`).join(' · ') || 'No one on an active track';
    summary = `<h2 style="font:600 16px Georgia,serif;color:#00254a;margin:26px 0 8px">Across the church</h2>
      <p style="margin:0 0 6px;color:#2e2c27;font-size:14px"><b>${s.needsAttention}</b> need attention · <b>${s.overdue}</b> contacts overdue · <b>${s.joinedThisWeek}</b> joined this week · <b>${s.lowTouch}</b> on the low-touch list · ${s.total} people tracked</p>
      <p style="margin:0;color:#6b6a63;font-size:13px">Active follow-up — ${esc(tracks)}</p>`;
  }
  const lead = d.due.length
    ? (d.due.length === 1 ? '1 of your follow-ups needs you today.' : `${d.due.length} of your follow-ups need you today.`)
    : (d.isPastor ? 'None of your own follow-ups are due today.' : 'Nothing is due today; here is what is coming up this week.');
  const html = `<!doctype html><html><body style="margin:0;background:#f8f4ea;font-family:-apple-system,'Segoe UI',Arial,sans-serif;color:#2e2c27">
  <div style="max-width:600px;margin:0 auto;padding:28px 20px">
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8f5b0a;font-weight:700">RCCG Salvation Center San Antonio</div>
    <h1 style="font:600 24px Georgia,serif;color:#00254a;margin:6px 0 4px">Good morning, ${esc(first)}</h1>
    <div style="height:3px;background:#e1a612;border-radius:2px;margin:10px 0 14px"></div>
    <p style="margin:0;font-size:15px">${esc(lead)}</p>
    ${section('Due today', due)}
    ${section("Waiting on your final call", finals)}
    ${section('Coming up this week', upcoming)}
    ${summary}
    <p style="margin:28px 0 0"><a href="${esc(site)}" style="display:inline-block;background:#00254a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Open the tracker</a></p>
    <p style="margin:22px 0 0;color:#6b6a63;font-size:12px">Membership Journey Tracker · ${esc(fmt(today))} · Sent weekdays to staff with follow-ups due. Pastor's notes are never included.</p>
  </div></body></html>`;
  const lines = [`Good morning, ${first}`, lead, ''];
  if (d.due.length) { lines.push('DUE TODAY'); d.due.forEach(x => lines.push(`- ${x.m.name} (${x.m.track}): ${x.why.join('; ')}`)); lines.push(''); }
  if (d.finalCalls.length) { lines.push('WAITING ON YOUR FINAL CALL'); d.finalCalls.forEach(m => lines.push(`- ${m.name} (owner: ${m.owner || 'none'})`)); lines.push(''); }
  if (d.upcoming.length) { lines.push('COMING UP THIS WEEK'); d.upcoming.forEach(m => lines.push(`- ${m.name}: next contact ${fmt(m.next_contact)}`)); lines.push(''); }
  if (d.summary) { const s = d.summary; lines.push(`ACROSS THE CHURCH: ${s.needsAttention} need attention, ${s.overdue} overdue, ${s.joinedThisWeek} joined this week, ${s.lowTouch} low-touch, ${s.total} tracked.`); lines.push(''); }
  lines.push(`Open the tracker: ${site}`);
  const subject = d.due.length ? `Tracker: ${d.due.length} follow-up${d.due.length === 1 ? '' : 's'} due today` : (d.isPastor ? 'Tracker: your morning summary' : 'Tracker: follow-ups coming up this week');
  return { subject, html, text: lines.join('\n') };
}

async function run(env, now = new Date(), force = false, only = '') {
  const local = chicagoNow(now);
  // The schedule fires at both 11:00 and 12:00 UTC so it lands on 6 a.m. Central in summer and winter.
  if (!force && (local.hour !== 6 || ['Sat', 'Sun'].includes(local.weekday))) return { skipped: `local time ${local.weekday} ${local.hour}:00` };
  const headers = { apikey: env.key, Authorization: `Bearer ${env.key}` };
  const get = async path => { const r = await fetch(`${env.url}/rest/v1/${path}`, { headers }); if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`); return r.json(); };
  const [members, staff] = await Promise.all([get('members?select=*'), get('staff?select=*')]);
  const digests = buildDigests(members, staff, local.iso);
  const sent = [];
  for (const d of digests) {
    if (only && d.to.toLowerCase() !== only.toLowerCase()) continue; // test send to one person
    const mail = renderEmail(d, local.iso, env.site);
    const to = [d.to];
    const body = { from: env.from, to, subject: mail.subject, html: mail.html, text: mail.text };
    if (d.isPastor && env.copyTo) body.bcc = [env.copyTo];
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    sent.push({ to: d.to, ok: r.ok, status: r.status, due: d.due.length });
  }
  return { date: local.iso, sent };
}

// Supabase entry point
Deno.serve(async req => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('Forbidden', { status: 403 });
  const params = new URL(req.url).searchParams;
  const force = params.get('force') === '1';
  const only = params.get('only') || '';
  try {
    const result = await run({
      url: Deno.env.get('SUPABASE_URL'),
      key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      resendKey: Deno.env.get('RESEND_API_KEY'),
      site: Deno.env.get('SITE_URL') || 'https://scsatracker.netlify.app',
      from: Deno.env.get('DIGEST_FROM') || 'Salvation Center Tracker <notifications@scsatracker.org>',
      copyTo: Deno.env.get('DIGEST_COPY_TO') || '',
    }, new Date(), force, only);
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
