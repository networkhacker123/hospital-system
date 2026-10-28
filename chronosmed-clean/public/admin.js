// ─── Config ──────────────────────────────────────────────────
const API = '/api';
document.getElementById('api-base-display').textContent = API;

// ─── State ───────────────────────────────────────────────────
let allRoomsData = [];
let allMedsData = [];  // flat list: {roomId, roomNum, patientName, med}
let qMedTimes = [];

// ─── Utilities ───────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  try {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
    const data = await res.json();
    return res.ok ? data : { success: false, error: data.error || 'Request failed' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-icon').textContent = type === 'success' ? '✅' : '❌';
  el.className = `show ${type}`;
  setTimeout(() => el.className = '', 3000);
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.sb-item').forEach(i => {
    if (i.getAttribute('onclick')?.includes(page)) i.classList.add('active');
  });
  if (page === 'dashboard') loadDashboard();
  if (page === 'rooms') loadRooms();
  if (page === 'medications') loadMedications();
  if (page === 'alerts') loadAlerts();
  if (page === 'settings') loadSettings();
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ─── DB Health check ─────────────────────────────────────────
async function checkHealth() {
  const data = await apiFetch('/health');
  const dot = document.getElementById('db-dot');
  const txt = document.getElementById('db-status-text');
  if (data.db === 'connected') {
    dot.classList.remove('offline');
    txt.textContent = 'MongoDB Connected';
  } else {
    dot.classList.add('offline');
    txt.textContent = 'Disconnected';
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────
async function loadDashboard() {
  const [roomsRes, alertsRes] = await Promise.all([
    apiFetch('/rooms'),
    apiFetch('/alerts')
  ]);
  if (!roomsRes.success) { toast(roomsRes.error || 'Could not load rooms', 'error'); return; }

  const rooms = roomsRes.data;
  const alerts = alertsRes.data || [];

  document.getElementById('stat-rooms').textContent = rooms.length;
  document.getElementById('stat-critical').textContent = rooms.filter(r => r.status === 'critical').length;
  document.getElementById('stat-alerts').textContent = alerts.filter(a => !a.acknowledged).length;
  document.getElementById('sb-alert-count').textContent = alerts.filter(a => !a.acknowledged).length || '';

  let totalMeds = 0;
  rooms.forEach(r => totalMeds += (r.medications || []).length);
  document.getElementById('stat-meds').textContent = totalMeds;

  // Floor breakdown
  const floorNames = {1:'Floor 1 — Triage',2:'Floor 2 — Trauma',3:'Floor 3 — Med ICU',4:'Floor 4 — Surg ICU',5:'Floor 5 — Cardiac ICU',6:'Floor 6 — Internal',7:'Floor 7 — Cardiology'};
  let html = '';
  for (let f = 1; f <= 7; f++) {
    const fr = rooms.filter(r => r.floor === f);
    const crit = fr.filter(r => r.status === 'critical').length;
    const amb = fr.filter(r => r.status === 'amber').length;
    const ok = fr.filter(r => r.status === 'ok').length;
    html += `<div style="display:flex;align-items:center;padding:11px 18px;border-bottom:1px solid var(--border);gap:10px;font-size:12px;">
      <span style="color:var(--dim);font-family:var(--mono);font-size:11px;width:20px;">${f}</span>
      <span style="flex:1;color:var(--white);">${floorNames[f]}</span>
      <span style="color:var(--red);font-size:11px;">${crit} crit</span>
      <span style="color:var(--amber);font-size:11px;">${amb} amber</span>
      <span style="color:var(--green);font-size:11px;">${ok} ok</span>
    </div>`;
  }
  document.getElementById('floor-breakdown').innerHTML = html;

  // Recent alerts
  const recent = alerts.slice(0, 8);
  document.getElementById('recent-alerts-list').innerHTML = recent.length === 0
    ? '<div style="color:var(--dim);font-size:12px;text-align:center;padding:20px;">No alerts</div>'
    : recent.map(a => `<div class="alert-item">
        <span class="alert-icon">${escapeHtml(a.icon)}</span>
        <div>
          <div class="alert-msg">${escapeHtml(a.message)}</div>
          <div class="alert-time">${new Date(a.createdAt).toLocaleString()} ${a.acknowledged ? '· <span style="color:var(--green);">Ack&#39;d</span>' : ''}</div>
        </div>
      </div>`).join('');
}

// ─── ROOMS ───────────────────────────────────────────────────
async function loadRooms() {
  const floor = document.getElementById('room-floor-filter').value;
  const status = document.getElementById('room-status-filter').value;
  let path = '/rooms?';
  if (floor) path += `floor=${floor}&`;
  if (status) path += `status=${status}&`;
  const data = await apiFetch(path);
  if (!data.success) { toast('Failed to load rooms', 'error'); return; }
  allRoomsData = data.data;
  renderRoomsTable(allRoomsData);
}

function filterRoomsLocal() {
  const q = document.getElementById('room-search').value.toLowerCase();
  if (!q) return renderRoomsTable(allRoomsData);
  const filtered = allRoomsData.filter(r =>
    r.patientName.toLowerCase().includes(q) ||
    r.mrn.toLowerCase().includes(q) ||
    r.diagnosis.toLowerCase().includes(q) ||
    String(r.roomNumber).includes(q)
  );
  renderRoomsTable(filtered);
}

function renderRoomsTable(rooms) {
  document.getElementById('rooms-count').textContent = `${rooms.length} rooms`;
  const tbody = document.getElementById('rooms-tbody');
  tbody.innerHTML = rooms.map(r => `
    <tr>
      <td class="td-mono">${r.roomNumber}</td>
      <td class="td-mono">${r.floor}</td>
      <td class="td-name">${escapeHtml(r.patientName)} <span style="color:var(--dim);font-size:11px;">· ${r.age}y</span></td>
      <td class="td-mono" style="font-size:10px;">${escapeHtml(r.mrn)}</td>
      <td>${escapeHtml(r.diagnosis)}</td>
      <td><span class="pill pill-${r.status}">${r.status}</span></td>
      <td style="max-width:160px;color:var(--dim);font-size:11px;">${escapeHtml(r.alert || '—')}</td>
      <td style="color:var(--cyan);font-family:var(--mono);">${(r.medications||[]).length}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="openEditRoomModal('${r._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteRoom('${r._id}', ${r.roomNumber})">Del</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--dim);">No rooms found</td></tr>';
}

async function openEditRoomModal(id) {
  const data = await apiFetch('/rooms/' + id);
  if (!data.success) { toast('Failed to load room', 'error'); return; }
  const r = data.data;
  document.getElementById('modal-room-title').textContent = `Edit Room ${r.roomNumber} — ${escapeHtml(r.patientName)}`;
  document.getElementById('edit-room-id').value = r._id;
  document.getElementById('edit-room-num').value = r.roomNumber;
  document.getElementById('edit-room-floor').value = r.floor;
  document.getElementById('edit-room-ward').value = r.ward;
  document.getElementById('edit-room-patient').value = r.patientName;
  document.getElementById('edit-room-age').value = r.age;
  document.getElementById('edit-room-mrn').value = r.mrn;
  document.getElementById('edit-room-diag').value = r.diagnosis;
  document.getElementById('edit-room-status').value = r.status;
  document.getElementById('edit-room-alert').value = r.alert || '';
  document.getElementById('edit-room-alert-type').value = r.alertType || '';
  document.getElementById('edit-room-temp').value = r.hvacTemp ?? '';
  document.getElementById('edit-room-humidity').value = r.hvacHumidity ?? '';
  document.getElementById('edit-room-evs').value = r.evsTech || '';
  document.getElementById('edit-room-notes').value = r.notes || '';
  // Render inline meds editor
  renderModalMeds(r.medications || [], r._id);
  openModal('modal-room');
}

function openAddRoomModal() {
  document.getElementById('modal-room-title').textContent = 'Add New Room';
  document.getElementById('edit-room-id').value = '';
  ['edit-room-num','edit-room-patient','edit-room-age','edit-room-mrn','edit-room-diag','edit-room-alert','edit-room-temp','edit-room-humidity','edit-room-evs','edit-room-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('edit-room-alert-type').value = '';
  document.getElementById('edit-room-status').value = 'ok';
  document.getElementById('edit-room-floor').value = '1';
  document.getElementById('edit-room-ward').value = 'general';
  document.getElementById('modal-meds-list').innerHTML = '';
  openModal('modal-room');
}

function renderModalMeds(meds, roomId) {
  const container = document.getElementById('modal-meds-list');
  if (meds.length === 0) { container.innerHTML = '<div style="color:var(--dim);font-size:12px;margin-bottom:8px;">No medications. Click + Add Med.</div>'; return; }
  container.innerHTML = meds.map((m, i) => `
    <div class="med-row" data-idx="${i}">
      <div class="med-row-header">
        <span class="med-name">${escapeHtml(m.name)} <span style="color:var(--dim);font-weight:400;">· ${escapeHtml(m.dose)}</span></span>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="openQMedModal('${roomId}','${m._id}')">Edit</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="pill pill-${m.status === 'Administered' ? 'admin' : m.status === 'Hold' ? 'hold' : m.status === 'Pending' ? 'pending' : 'sched'}">${m.status}</span>
        <span style="font-size:11px;color:var(--dim);">${escapeHtml(m.drugClass || '')}</span>
      </div>
      <div class="med-times">${(m.scheduledTimes || []).map(t => `<span class="time-chip">⏰ ${escapeHtml(t)}</span>`).join('')}</div>
    </div>
  `).join('');
}

function addMedRow() {
  const roomId = document.getElementById('edit-room-id').value;
  if (!roomId) { toast('Save the room before adding medication', 'error'); return; }
  document.getElementById('modal-med-title').textContent = 'Add medication';
  document.getElementById('qmed-room-id').value = roomId;
  document.getElementById('qmed-med-id').value = '';
  ['qmed-name', 'qmed-dose', 'qmed-class', 'qmed-prescriber', 'qmed-nurse'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('qmed-status').value = 'Scheduled';
  qMedTimes = [];
  renderQMedTimes();
  openModal('modal-med');
}

async function saveRoom() {
  const id = document.getElementById('edit-room-id').value;
  const body = {
    roomNumber: parseInt(document.getElementById('edit-room-num').value),
    floor: parseInt(document.getElementById('edit-room-floor').value),
    ward: document.getElementById('edit-room-ward').value,
    patientName: document.getElementById('edit-room-patient').value,
    age: parseInt(document.getElementById('edit-room-age').value),
    mrn: document.getElementById('edit-room-mrn').value,
    diagnosis: document.getElementById('edit-room-diag').value,
    status: document.getElementById('edit-room-status').value,
    alert: document.getElementById('edit-room-alert').value || null,
    alertType: document.getElementById('edit-room-alert-type').value || null,
    hvacTemp: document.getElementById('edit-room-temp').value === '' ? null : Number(document.getElementById('edit-room-temp').value),
    hvacHumidity: document.getElementById('edit-room-humidity').value === '' ? null : Number(document.getElementById('edit-room-humidity').value),
    evsTech: document.getElementById('edit-room-evs').value,
    notes: document.getElementById('edit-room-notes').value,
  };
  const method = id ? 'PUT' : 'POST';
  const path = id ? `/rooms/${id}` : '/rooms';
  const data = await apiFetch(path, { method, body: JSON.stringify(body) });
  if (data.success) {
    toast(id ? 'Room updated successfully' : 'Room created successfully');
    closeModal('modal-room');
    loadRooms();
  } else {
    toast('Error: ' + data.error, 'error');
  }
}

async function deleteRoom(id, num) {
  if (!confirm(`Delete Room ${num}? This cannot be undone.`)) return;
  const data = await apiFetch('/rooms/' + id, { method: 'DELETE' });
  if (data.success) { toast('Room deleted'); loadRooms(); }
  else toast('Error: ' + data.error, 'error');
}

// ─── MEDICATIONS ─────────────────────────────────────────────
async function loadMedications() {
  const floor = document.getElementById('med-floor-filter').value;
  let path = '/rooms?';
  if (floor) path += `floor=${floor}&`;
  const data = await apiFetch(path);
  if (!data.success) { toast(data.error || 'Could not load data', 'error'); return; }
  allMedsData = [];
  data.data.forEach(r => {
    (r.medications || []).forEach(m => {
      allMedsData.push({ roomId: r._id, roomNum: r.roomNumber, patientName: r.patientName, floor: r.floor, med: m });
    });
  });
  filterMedsLocal();
}

function filterMedsLocal() {
  const status = document.getElementById('med-status-filter').value;
  const q = document.getElementById('med-search').value.toLowerCase();
  let filtered = allMedsData;
  if (status) filtered = filtered.filter(x => x.med.status === status);
  if (q) filtered = filtered.filter(x =>
    x.med.name.toLowerCase().includes(q) ||
    x.patientName.toLowerCase().includes(q) ||
    String(x.roomNum).includes(q)
  );
  renderMedsTable(filtered);
}

function renderMedsTable(items) {
  const tbody = document.getElementById('meds-tbody');
  tbody.innerHTML = items.map(({ roomId, roomNum, patientName, med }) => `
    <tr>
      <td class="td-mono">${roomNum}</td>
      <td class="td-name">${escapeHtml(patientName)}</td>
      <td style="color:var(--white);font-weight:500;">${escapeHtml(med.name)}</td>
      <td class="td-mono" style="font-size:11px;">${escapeHtml(med.dose)}</td>
      <td style="color:var(--dim);">${escapeHtml(med.drugClass || '—')}</td>
      <td style="font-family:var(--mono);font-size:11px;color:var(--cyan);">${escapeHtml((med.scheduledTimes || []).join(', ') || '—')}</td>
      <td><span class="pill pill-${med.status === 'Administered' ? 'admin' : med.status === 'Hold' ? 'hold' : med.status === 'Pending' ? 'pending' : 'sched'}">${med.status}</span></td>
      <td style="color:var(--muted);">${escapeHtml(med.administeredBy || '—')}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="openQMedModal('${roomId}','${med._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteMed('${roomId}','${med._id}')">Del</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--dim);">No medications found</td></tr>';
}

async function openQMedModal(roomId, medId) {
  const data = await apiFetch('/rooms/' + roomId);
  if (!data.success) { toast(data.error || 'Could not load data', 'error'); return; }
  const med = data.data.medications.find(m => m._id === medId);
  if (!med) return;
  document.getElementById('qmed-room-id').value = roomId;
  document.getElementById('modal-med-title').textContent = 'Edit medication';
  document.getElementById('qmed-med-id').value = medId;
  document.getElementById('qmed-name').value = med.name;
  document.getElementById('qmed-dose').value = med.dose;
  document.getElementById('qmed-class').value = med.drugClass || '';
  document.getElementById('qmed-prescriber').value = med.prescriber || '';
  document.getElementById('qmed-status').value = med.status;
  document.getElementById('qmed-nurse').value = med.administeredBy || '';
  qMedTimes = [...(med.scheduledTimes || [])];
  renderQMedTimes();
  openModal('modal-med');
}

function renderQMedTimes() {
  document.getElementById('qmed-times-chips').innerHTML = qMedTimes.map((t, i) =>
    `<span class="time-chip">⏰ ${escapeHtml(t)} <span class="time-chip-del" onclick="removeQMedTime(${i})">×</span></span>`
  ).join('');
}
function addQMedTime() {
  const t = document.getElementById('qmed-new-time').value;
  if (t && !qMedTimes.includes(t)) { qMedTimes.push(t); qMedTimes.sort(); renderQMedTimes(); }
}
function removeQMedTime(i) { qMedTimes.splice(i, 1); renderQMedTimes(); }

async function saveQMed() {
  const roomId = document.getElementById('qmed-room-id').value;
  const medId = document.getElementById('qmed-med-id').value;
  const body = {
    name: document.getElementById('qmed-name').value,
    dose: document.getElementById('qmed-dose').value,
    drugClass: document.getElementById('qmed-class').value,
    prescriber: document.getElementById('qmed-prescriber').value,
    status: document.getElementById('qmed-status').value,
    administeredBy: document.getElementById('qmed-nurse').value,
    scheduledTimes: qMedTimes,
  };
  const data = await apiFetch(medId ? `/rooms/${roomId}/medications/${medId}` : `/rooms/${roomId}/medications`, { method: medId ? 'PUT' : 'POST', body: JSON.stringify(body) });
  if (data.success) {
    toast(medId ? 'Medication updated' : 'Medication added');
    closeModal('modal-med');
    loadMedications();
    // If room modal is open, refresh it
    if (document.getElementById('modal-room').classList.contains('open')) {
      const roomData = await apiFetch('/rooms/' + roomId);
      if (roomData.success) renderModalMeds(roomData.data.medications, roomId);
    }
  } else toast('Error: ' + data.error, 'error');
}

async function deleteMed(roomId, medId) {
  if (!confirm('Remove this medication?')) return;
  const data = await apiFetch(`/rooms/${roomId}/medications/${medId}`, { method: 'DELETE' });
  if (data.success) { toast('Medication removed'); loadMedications(); }
  else toast('Error: ' + data.error, 'error');
}

// ─── ALERTS ──────────────────────────────────────────────────
async function loadAlerts() {
  const data = await apiFetch('/alerts');
  if (!data.success) { toast(data.error || 'Could not load data', 'error'); return; }
  const tbody = document.getElementById('alerts-tbody');
  const alerts = data.data;
  document.getElementById('sb-alert-count').textContent = alerts.filter(a => !a.acknowledged).length || '';
  tbody.innerHTML = alerts.map(a => `
    <tr>
      <td style="font-size:18px;">${escapeHtml(a.icon)}</td>
      <td style="color:var(--muted);text-transform:capitalize;">${a.type}</td>
      <td style="max-width:280px;color:var(--white);line-height:1.4;">${escapeHtml(a.message)}</td>
      <td class="td-mono">${a.roomNumber || '—'}</td>
      <td><span class="pill pill-${a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'amber' : 'ok'}">${a.severity}</span></td>
      <td>${a.acknowledged
        ? `<span style="color:var(--green);font-size:11px;">✓ ${escapeHtml(a.acknowledgedBy || 'Staff')}</span>`
        : `<button class="btn btn-success btn-sm" onclick="ackAlert('${a._id}')">Acknowledge</button>`}
      </td>
      <td class="td-mono" style="font-size:10px;">${new Date(a.createdAt).toLocaleString()}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteAlert('${a._id}')">Del</button></td>
    </tr>
  `).join('') || '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--dim);">No alerts</td></tr>';
}

function openAddAlertModal() {
  ['new-alert-room','new-alert-patient','new-alert-msg'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('new-alert-icon').value = '🔔';
  document.getElementById('new-alert-color').value = '#FF9500';
  openModal('modal-alert');
}

async function saveNewAlert() {
  const body = {
    type: document.getElementById('new-alert-type').value,
    severity: document.getElementById('new-alert-severity').value,
    icon: document.getElementById('new-alert-icon').value || '🔔',
    color: document.getElementById('new-alert-color').value || '#FF9500',
    roomNumber: parseInt(document.getElementById('new-alert-room').value) || null,
    patientName: document.getElementById('new-alert-patient').value,
    message: document.getElementById('new-alert-msg').value,
  };
  if (!body.message) { toast('Message is required', 'error'); return; }
  const data = await apiFetch('/alerts', { method: 'POST', body: JSON.stringify(body) });
  if (data.success) { toast('Alert created'); closeModal('modal-alert'); loadAlerts(); }
  else toast('Error: ' + data.error, 'error');
}

async function ackAlert(id) {
  const data = await apiFetch(`/alerts/${id}/acknowledge`, { method: 'PATCH', body: JSON.stringify({ by: 'Admin' }) });
  if (data.success) { toast('Alert acknowledged'); loadAlerts(); }
  else toast('Error', 'error');
}

async function deleteAlert(id) {
  if (!confirm('Delete this alert?')) return;
  const data = await apiFetch('/alerts/' + id, { method: 'DELETE' });
  if (data.success) { toast('Alert deleted'); loadAlerts(); }
  else toast('Error', 'error');
}

async function clearAllAlerts() {
  if (!confirm('Clear ALL alerts? This cannot be undone.')) return;
  const data = await apiFetch('/alerts/clear/all', { method: 'DELETE' });
  if (data.success) { toast('All alerts cleared'); loadAlerts(); }
  else toast('Error', 'error');
}

// ─── SETTINGS ────────────────────────────────────────────────
let currentSettings = {};

async function loadSettings() {
  const data = await apiFetch('/settings');
  if (!data.success) { toast(data.error || 'Could not load data', 'error'); return; }
  const s = data.data;
  currentSettings = s;
  document.getElementById('s-hospital-name').value = s.hospitalName || '';
  document.getElementById('s-doctor-name').value = s.doctorName || '';
  document.getElementById('s-ward').value = s.ward || '';
  document.getElementById('s-default-floor').value = s.defaultFloor || 3;
  document.getElementById('s-alert-threshold').value = s.alertSeverityThreshold || 'amber';
  document.getElementById('s-refresh-interval').value = s.refreshIntervalSeconds || 12;

  const toggleFields = [
    { key: 'alertsEnabled', label: 'Alerts Enabled' },
    { key: 'autoRefresh', label: 'Auto-Refresh Dashboard' },
    { key: 'soundAlerts', label: 'Sound Alerts' },
    { key: 'darkSidebar', label: 'Dark Sidebar' },
    { key: 'emergencyEscalation', label: 'Emergency Escalation' },
    { key: 'showVitals', label: 'Show Vitals' },
    { key: 'shiftHandoffMode', label: 'Shift Handoff Mode' },
  ];

  document.getElementById('settings-toggles').innerHTML = toggleFields.map(f => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:12px;color:var(--white);">${f.label}</span>
      <button class="toggle-btn ${s[f.key] ? 'on' : ''}" data-key="${f.key}" onclick="toggleSetting(this, '${f.key}')">
        ${s[f.key] ? 'ON' : 'OFF'}
      </button>
    </div>
  `).join('');

  // Toggle button styles
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.style.cssText = `padding:4px 14px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:none;font-family:var(--sans);
      background:${btn.classList.contains('on') ? 'rgba(52,199,89,0.2)' : 'var(--bg3)'};
      color:${btn.classList.contains('on') ? 'var(--green)' : 'var(--dim)'};
      border:1px solid ${btn.classList.contains('on') ? 'rgba(52,199,89,0.3)' : 'var(--border)'};`;
  });
}

function toggleSetting(btn, key) {
  const isOn = btn.classList.contains('on');
  btn.classList.toggle('on');
  currentSettings[key] = !isOn;
  btn.textContent = !isOn ? 'ON' : 'OFF';
  btn.style.cssText = `padding:4px 14px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:none;font-family:var(--sans);
    background:${!isOn ? 'rgba(52,199,89,0.2)' : 'var(--bg3)'};
    color:${!isOn ? 'var(--green)' : 'var(--dim)'};
    border:1px solid ${!isOn ? 'rgba(52,199,89,0.3)' : 'var(--border)'};`;
}

async function saveSettings() {
  const body = {
    alertsEnabled: currentSettings.alertsEnabled,
    autoRefresh: currentSettings.autoRefresh,
    soundAlerts: currentSettings.soundAlerts,
    darkSidebar: currentSettings.darkSidebar,
    emergencyEscalation: currentSettings.emergencyEscalation,
    showVitals: currentSettings.showVitals,
    shiftHandoffMode: currentSettings.shiftHandoffMode,
    hospitalName: document.getElementById('s-hospital-name').value,
    doctorName: document.getElementById('s-doctor-name').value,
    ward: document.getElementById('s-ward').value,
    defaultFloor: parseInt(document.getElementById('s-default-floor').value),
    alertSeverityThreshold: document.getElementById('s-alert-threshold').value,
    refreshIntervalSeconds: parseInt(document.getElementById('s-refresh-interval').value),
  };
  const data = await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(body) });
  if (data.success) { currentSettings = data.data; toast('Settings saved'); }
  else toast('Error: ' + data.error, 'error');
}

// ─── Init ─────────────────────────────────────────────────────
checkHealth();
setInterval(checkHealth, 10000);
loadDashboard();

