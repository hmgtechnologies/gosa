/* School Connect — Runtime (auto-generated) */
const App = {

  init() {
    App.applyRoleVisibility();
    App.bindUI();
    App.loadPageData();
  },

  applyRoleVisibility() {
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { location.href = 'login.html'; return; }
      sb.from('profiles').select('role,status').eq('id', user.id).single().then(({ data }) => {
        const role = (data && data.role) || 'student';
        const status = (data && data.status) || 'pending';
        if (status === 'pending') {
          document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px"><div style="max-width:440px;text-align:center;background:white;padding:40px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.1)"><h2 style="margin-bottom:12px">⏳ Account pending approval</h2><p style="color:var(--gray-600)">Your account is awaiting admin approval. You'll receive an email once it's activated.</p></div></div>';
          return;
        }
        if (status === 'suspended') {
          document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px"><div style="max-width:440px;text-align:center;background:white;padding:40px;border-radius:16px"><h2>🚫 Account suspended</h2><p>Please contact the school administrator.</p></div></div>';
          return;
        }
        const isStaff = ['admin','principal','proprietor','head_teacher','staff'].includes(role);
        const isAdmin = ['admin','principal','proprietor'].includes(role);
        document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = isStaff ? '' : 'none');
        document.querySelectorAll('[data-staff-only]').forEach(el => el.style.display = isStaff ? '' : 'none');
      });
    });
  },

  bindUI() {
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-app-action]');
      if (a) {
        const fn = a.dataset.appAction;
        if (App[fn]) App[fn](a);
      }
    });
  },

  toggleDarkMode() {
    const cur = document.body.dataset.theme || 'light';
    document.body.dataset.theme = cur === 'dark' ? 'light' : 'dark';
    localStorage.setItem('sc-theme', document.body.dataset.theme);
  },

  signOut() {
    sb.auth.signOut().then(() => location.href = 'login.html');
  },

  toggleSidebar() {
    const sb = document.getElementById('app-sidebar');
    if (sb) sb.classList.toggle('open');
  },

  switchCampus(name) {
    localStorage.setItem('sc-campus', name);
    location.reload();
  },

  /* Page-aware data loaders */
  async loadPageData() {
    const path = location.pathname.split('/').pop().replace('.html','') || 'dashboard';
    if (path === 'dashboard' && App.loadDashboard) App.loadDashboard();
    if (path === 'voting' && VotingUI) VotingUI.renderPollList();
    if (path === 'notifications' && Notifications) Notifications.loadDropdownItems();
    if (App['load_' + path]) App['load_' + path]();
  },

  async loadDashboard() {
    try {
      const [students, staff, fees, announcements, polls] = await Promise.all([
        sb.from('students').select('id', { count: 'exact', head: true }),
        sb.from('staff').select('id',     { count: 'exact', head: true }),
        sb.from('fee_payments').select('amount_paid'),
        sb.from('announcements').select('*').order('created_at', { ascending: false }).limit(5),
        sb.from('polls').select('*').eq('status','open').order('created_at',{ascending:false}).limit(3)
      ]);
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('stat-students', students.count || 0);
      set('stat-staff', staff.count || 0);
      set('stat-fees', (fees.data || []).reduce((a,b) => a + (b.amount_paid || 0), 0).toLocaleString());
      set('stat-announcements', (announcements.data || []).length);
      const annEl = document.getElementById('dash-announcements');
      if (annEl) annEl.innerHTML = (announcements.data || []).length
        ? announcements.data.map(a => '<div style="padding:10px 0;border-bottom:1px solid var(--gray-200)"><strong>'+esc(a.title)+'</strong><div style="font-size:0.82rem;color:var(--gray-500)">'+new Date(a.created_at).toLocaleString()+'</div></div>').join('')
        : '<p style="color:var(--gray-500)">No announcements yet.</p>';
      const pollEl = document.getElementById('dash-polls');
      if (pollEl) pollEl.innerHTML = (polls.data || []).length
        ? polls.data.map(p => '<div style="padding:10px 0;border-bottom:1px solid var(--gray-200)"><a href="voting.html?poll='+p.id+'"><strong>'+esc(p.title)+'</strong></a><span class="badge badge-success" style="margin-left:8px">open</span></div>').join('')
        : '<p style="color:var(--gray-500)">No active polls.</p>';
      // Chart
      const ctx = document.getElementById('dash-chart');
      if (ctx && window.Chart) {
        new Chart(ctx, { type: 'doughnut', data: { labels:['Paid','Pending'], datasets:[{ data:[((fees.data||[]).length), Math.max(1, students.count - (fees.data||[]).length)], backgroundColor:['#10b981','#e2e8f0'] }] }, options: { responsive:true, plugins:{ legend:{ position:'bottom' } } } });
      }
    } catch (e) { console.warn('Dashboard load failed (demo mode):', e.message); }
  },

  /* Modal */
  openAddModal(type) {
    if (typeof openModal === 'function') openModal('Add ' + type, '<p>Form will be generated for "'+esc(type)+'".</p>');
  }
};

/* ----- Modal helpers ----- */
function openModal(title, body, footer) {
  const b = document.getElementById('modal-backdrop');
  if (!b) return;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-footer').innerHTML = footer || '<button class="btn btn-outline" onclick="closeModal()">Close</button>';
  b.classList.add('show');
}
function closeModal() {
  const b = document.getElementById('modal-backdrop');
  if (b) b.classList.remove('show');
}
function toast(msg, type='info', ms=3500) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = '<div class="toast-msg">' + esc(msg) + '</div>';
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, ms);
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ----- Auth ----- */
async function handleSignIn(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = fd.get('email'); const password = fd.get('password');
  if (!sb) { toast('Database not configured. Edit assets/js/config.js with your Supabase keys.', 'warning', 6000); return; }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { toast(error.message, 'danger'); return; }
  location.href = 'dashboard.html';
}
async function handleSignUp(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (!sb) { toast('Database not configured.', 'warning'); return; }
  const { data, error } = await sb.auth.signUp({
    email: fd.get('email'),
    password: fd.get('password'),
    options: { data: { full_name: fd.get('full_name'), phone: fd.get('phone'), role: fd.get('role') } }
  });
  if (error) { toast(error.message, 'danger'); return; }
  toast('✅ Request sent. Check your email and wait for admin approval.', 'success', 6000);
}

/* Boot */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.init);
else App.init();
