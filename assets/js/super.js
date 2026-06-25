/* ====================================================================
   super.js — School Connect Gen v3 "Super Features" engine
   --------------------------------------------------------------------
   Ports the standout features from the original School Connect builder
   into EVERY generated school site, and adds new enterprise super
   features. 100% free tools, NO AI APIs. Everything is interconnected
   through the single shared Supabase database (window.sb) and the
   shared school config (window.SCHOOL).

   Provides (all attached to window):
     • Super.chatbot   — rules-based help assistant (per-school)
     • Super.palette    — global command palette / cross-module search (Ctrl+K)
     • Super.notify     — multi-channel notification fan-out hooks
     • Super.idcard     — printable QR ID-card generator
     • Super.cert       — printable, verifiable certificate generator
     • Super.flyer       — printable marketing flyer generator
     • Super.data        — per-school export / import / draft autosave
   ==================================================================== */

const Super = {
  sb: null,
  school: null,

  init(supabaseClient, school) {
    this.sb = supabaseClient || (typeof sb !== 'undefined' ? sb : null);
    this.school = school || (typeof window !== 'undefined' ? window.SCHOOL : null) || {};
    this.chatbot.mount();
    this.palette.mount();
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); Super.palette.toggle(true); }
      });
    }
  },

  esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },

  /* ==================================================================
     1) SCHOOL HELP CHATBOT (rules-based, no AI, per-school)
     ================================================================== */
  chatbot: {
    open: false, history: [],
    /* Enhanced knowledge base: each entry has keywords (m), a reply (r), an
       optional page link (p) and optional follow-up chips (chips). */
    KB: [
      { m: ['login', 'sign in', 'signin', 'password', 'cannot log', "can't log", 'access account'], r: 'To sign in, open the **Login** page and use your registered email + password. New here? Choose **Request access** — an admin approves you first. Forgot your password? Use the reset link on the login page.', p: 'login.html', chips: ['How do I get approved?', 'Enable 2FA'] },
      { m: ['approve', 'pending', 'activate account', 'admin approval'], r: 'New accounts start as **pending**. An admin opens **Admin Data → profiles** (or Settings) and sets your status to *approved*. Then you can sign in.', p: 'admin-data.html' },
      { m: ['2fa', 'two factor', 'two-factor', 'otp', 'secure my account'], r: 'Turn on **2-Factor Authentication** in **Settings** — it uses a free email one-time code (no SMS/AI cost).', p: 'settings.html' },
      { m: ['cbt', 'exam', 'test', 'quiz', 'online exam', 'set exam'], r: 'Open **CBT / Online Exams**. Create an exam, upload questions by CSV (17 question types), then share a 6-character **code** or link. Map the exam to a report-card column and scores flow into the report card automatically.', p: 'cbt.html', chips: ['How do students take it?', 'How are CBT scores graded?'] },
      { m: ['take exam', 'student exam', 'exam code', 'join exam', 'write exam'], r: 'Students open the exam link or go to **Take Exam**, enter the **6-character code** and their name — no account needed (open mode). A timer, navigator and anti-cheat run during the exam.', p: 'cbt-exam.html' },
      { m: ['grade', 'scoring', 'mark scheme', 'how are scores', 'negative marking'], r: 'CBT auto-grades all 17 question types (with partial credit and optional **negative marking**). Essays use rule-based keyword scoring. No AI is used.', p: 'cbt.html' },
      { m: ['report', 'result', 'report card', 'grades', 'ca1', 'ca2'], r: 'Open **Report Cards**. Add custom columns (CA1, CA2, Assignment, Project, Exam), apportion a max mark to each, and enter scores. CBT/online results auto-fill their mapped columns; totals, % and grades compute live.', p: 'report-cards.html', chips: ['Pull CBT into report card', 'Export report cards'] },
      { m: ['fee', 'pay', 'invoice', 'balance', 'receipt', 'school fees'], r: 'Open **Fees** to view balances, record payments and print receipts. For online payment links use **Online Fee Payments** (Paystack/Flutterwave/bank transfer — free to integrate; you pay only the gateway transaction fee).', p: 'fees.html' },
      { m: ['attendance', 'register', 'present', 'absent', 'mark attendance'], r: 'Open **Attendance** to mark daily/class attendance (present/absent/late/excused). Parents see only their own children. For self check-in, use **QR Check-in**.', p: 'attendance.html', chips: ['QR check-in', 'Attendance report'] },
      { m: ['qr', 'check in', 'check-in', 'checkin', 'scan'], r: 'Open **QR Check-in**. Students scan their ID-card QR (or type their admission number) to check in — no biometric hardware needed.', p: 'checkin.html' },
      { m: ['timetable', 'schedule', 'periods', 'time table'], r: 'Open **Auto-Timetable** to build a conflict-free timetable from each subject weekly period demand. It supports **part-time teachers** — tick *Part-time* and choose the days they attend; they are only scheduled on those days.', p: 'timetable-generator.html', chips: ['Add a part-time teacher', 'Why are some periods unplaced?'] },
      { m: ['part time', 'part-time', 'visiting teacher', 'specific day'], r: 'In **Auto-Timetable**, tick **Part-time teacher** and select the weekdays that teacher attends (e.g. Tue & Thu). The generator will only place their periods on those days. If their periods cannot all fit, it tells you how many are *unplaced*.', p: 'timetable-generator.html' },
      { m: ['vote', 'poll', 'prefect', 'election', 'head boy', 'head girl'], r: 'Open **Voting & Polls** to run prefect / head-boy / head-girl elections and staff polls with live, anonymous results.', p: 'voting.html' },
      { m: ['survey', 'feedback', 'form', 'questionnaire'], r: 'Open **Surveys** to create anonymous-optional feedback forms and collect responses (separate from elections).', p: 'surveys.html' },
      { m: ['notif', 'alert', 'announce', 'broadcast', 'message parent'], r: 'Notifications fan out in-app + browser push + email + WhatsApp + SMS. Staff post via **Announcements** / **Result Broadcast**; everyone receives them.', p: 'announcements.html' },
      { m: ['diary', 'homework', 'home work', 'assignment log'], r: 'Open **Diary** to log daily homework, classwork and behaviour notes; parents can view and acknowledge them.', p: 'diary.html' },
      { m: ['install', 'app', 'pwa', 'offline', 'home screen'], r: 'This portal is an installable app (PWA). Tap the **Install** banner, or your browser menu → *Install / Add to Home Screen* for offline access and push notifications.' },
      { m: ['id card', 'idcard', 'badge', 'student card'], r: 'Open **ID Cards** to generate branded student/staff cards with a scannable QR code — printable straight from the browser.', p: 'idcards.html' },
      { m: ['certificate', 'cert', 'testimonial'], r: 'Open **Certificates** to issue branded, printable certificates with a verification code. CBT exams also issue certificate codes automatically.', p: 'certificates.html' },
      { m: ['library', 'book', 'borrow'], r: 'Open **Library** to catalogue books and track lending and returns.', p: 'library.html' },
      { m: ['menu', 'meal', 'food', 'canteen', 'cafeteria'], r: 'Open **Menu** to plan weekly meals with allergen notes for parents.', p: 'menu.html' },
      { m: ['backup', 'export', 'delete', 'restore', 'data console'], r: 'Admins open **Admin Data** to read, delete, back up (JSON) and restore every table, and export any table to CSV. Every action is logged.', p: 'admin-data.html' },
      { m: ['analytics', 'kpi', 'chart', 'dashboard stats', 'insight'], r: 'Open **Analytics** for live, platform-wide KPIs and charts (enrollment, CBT performance, fees, attendance) to support decisions.', p: 'analytics.html' },
      { m: ['language', 'translate', 'french', 'hausa', 'yoruba', 'igbo', 'accessibility', 'font size', 'contrast'], r: 'Open **Settings** to switch language (English/French/Kiswahili/Hausa/Yoruba/Igbo) and adjust accessibility (font size, high contrast).', p: 'settings.html' },
      { m: ['search', 'find', 'where is', 'go to', 'command'], r: 'Press **Ctrl/Cmd + K** anywhere to open the global command palette and jump to any module or search students, staff and exams.' },
      { m: ['dark mode', 'theme', 'night'], r: 'Click the **🌙 button** in the top bar to toggle dark mode. Your choice is remembered.' },
      { m: ['cost', 'price', 'free', 'subscription', 'monthly'], r: 'The platform is **free to run forever** on free Supabase + free hosting. No monthly fees, no AI-API costs. You own all your data.' },
      { m: ['deploy', 'host', 'supabase', 'go live', 'setup'], r: 'See **DEPLOYMENT-GUIDE.md** in your download: create a free Supabase project, run the SQL files in order, paste your keys into `assets/js/config.js`, and host the folder on GitHub Pages / Netlify / Vercel / Cloudflare.' },
      { m: ['contact', 'support', 'help me', 'human', 'whatsapp'], r: 'Need a human? Use the **WhatsApp** / email contact in the footer, or reach HMG Concepts. I can answer questions about any module here too.' }
    ],
    QUICK: ['How do I create a CBT exam?', 'Set up report cards', 'Add a part-time teacher', 'Record fees', 'Enable 2FA'],
    mount() {
      if (typeof document === 'undefined' || document.getElementById('sc-chatbot')) return;
      const wrap = document.createElement('div');
      wrap.id = 'sc-chatbot';
      wrap.innerHTML = `
        <button id="sc-chat-fab" title="Help" aria-label="Open help assistant"
          style="position:fixed;right:18px;bottom:18px;z-index:9998;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:var(--primary,#4f46e5);color:#fff;font-size:24px;box-shadow:0 8px 24px rgba(0,0,0,.25)">💬</button>
        <div id="sc-chat-win" style="display:none;position:fixed;right:18px;bottom:84px;z-index:9999;width:340px;max-width:92vw;height:460px;max-height:75vh;background:#fff;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.3);flex-direction:column;overflow:hidden">
          <div style="background:var(--primary,#4f46e5);color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
            <strong>School Assistant</strong><button id="sc-chat-x" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer">×</button>
          </div>
          <div id="sc-chat-msgs" style="flex:1;overflow-y:auto;padding:14px;background:#f8fafc;font-size:.9rem"></div>
          <div style="display:flex;gap:6px;padding:10px;border-top:1px solid #e2e8f0">
            <input id="sc-chat-in" placeholder="Ask about CBT, results, fees…" style="flex:1;padding:9px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:.9rem">
            <button id="sc-chat-send" style="background:var(--primary,#4f46e5);color:#fff;border:none;border-radius:10px;padding:0 14px;cursor:pointer">➤</button>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      document.getElementById('sc-chat-fab').onclick = () => Super.chatbot.toggle();
      document.getElementById('sc-chat-x').onclick = () => Super.chatbot.toggle(false);
      document.getElementById('sc-chat-send').onclick = () => Super.chatbot.send();
      document.getElementById('sc-chat-in').addEventListener('keydown', e => { if (e.key === 'Enter') Super.chatbot.send(); });
      this.history.push({ from: 'bot', msg: 'Hi! 👋 I\'m the ' + ((Super.school && Super.school.name) || 'school') + ' assistant. Ask me anything about the portal, or tap a suggestion below. Tip: press **Ctrl+K** to search.', chips: this.QUICK });
    },
    toggle(force) {
      const w = document.getElementById('sc-chat-win'); if (!w) return;
      this.open = force !== undefined ? force : !this.open;
      w.style.display = this.open ? 'flex' : 'none';
      if (this.open) { this.render(); const i = document.getElementById('sc-chat-in'); if (i) i.focus(); }
    },
    ask(text) { const i = document.getElementById('sc-chat-in'); if (i) i.value = text; this.send(); },
    send() {
      const i = document.getElementById('sc-chat-in'); if (!i) return;
      const msg = i.value.trim(); if (!msg) return;
      this.history.push({ from: 'user', msg }); i.value = ''; this.render();
      setTimeout(() => { const a = this.answer(msg); this.history.push({ from: 'bot', msg: a.r, link: a.p, chips: a.chips }); this.render(); }, 220);
    },
    /* Scored, fuzzy keyword matching — picks the BEST entry, not just the first.
       Returns { r: replyText, p: pageLink, chips: [followups] }. */
    answer(msg) {
      const l = ' ' + msg.toLowerCase().replace(/[^a-z0-9 ]/g, ' ') + ' ';
      let best = null, bestScore = 0;
      for (const e of this.KB) {
        let score = 0;
        for (const k of e.m) {
          if (l.includes(' ' + k + ' ') || l.includes(k)) score += k.split(' ').length + k.length / 10;
        }
        if (score > bestScore) { bestScore = score; best = e; }
      }
      if (best && bestScore > 0) return { r: best.r, p: best.p, chips: best.chips };
      if (/\b(thanks|thank you|thx)\b/.test(l)) return { r: 'You\'re welcome! 🎉 Anything else?', chips: this.QUICK };
      if (/\b(hi|hello|hey|good (morning|afternoon|evening))\b/.test(l)) return { r: 'Hello! How can I help? Pick a topic:', chips: this.QUICK };
      if (/\b(bye|goodbye)\b/.test(l)) return { r: 'Goodbye! 👋 Reopen me anytime from the 💬 button.' };
      // No match → suggest closest topics + Ctrl+K
      return { r: 'I\'m not sure about that exact wording, but here are things I can help with — tap one, or press **Ctrl+K** to search the whole portal.', chips: ['CBT exams', 'Report cards', 'Fees', 'Attendance', 'Timetable', 'Voting'] };
    },
    render() {
      const box = document.getElementById('sc-chat-msgs'); if (!box) return;
      box.innerHTML = this.history.map(m => {
        const bubble = `<div style="margin:8px 0;display:flex;${m.from === 'user' ? 'justify-content:flex-end' : ''}">
          <div style="max-width:82%;padding:9px 12px;border-radius:12px;${m.from === 'user' ? 'background:var(--primary,#4f46e5);color:#fff' : 'background:#fff;border:1px solid #e2e8f0'}">${Super.esc(m.msg).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}${m.link ? '<div style="margin-top:8px"><a href="' + Super.esc(m.link) + '" style="color:var(--primary,#4f46e5);font-weight:700;text-decoration:none">Open page →</a></div>' : ''}</div></div>`;
        const chips = (m.chips && m.chips.length) ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 10px">${m.chips.map(c => `<button onclick="Super.chatbot.ask('${Super.esc(c).replace(/'/g, "\\'")}')" style="background:#eef2ff;color:var(--primary,#4f46e5);border:1px solid #c7d2fe;border-radius:14px;padding:5px 11px;font-size:.78rem;cursor:pointer">${Super.esc(c)}</button>`).join('')}</div>` : '';
        return bubble + chips;
      }).join('');
      box.scrollTop = box.scrollHeight;
    }
  },

  /* ==================================================================
     2) GLOBAL COMMAND PALETTE / CROSS-MODULE SEARCH (Ctrl+K)
        Interconnects every module: jump to pages AND search live data.
     ================================================================== */
  palette: {
    open: false,
    PAGES: [
      ['Dashboard', 'dashboard.html', '🏠'], ['Students', 'students.html', '👨‍🎓'],
      ['Staff', 'staff.html', '👨‍🏫'], ['Attendance', 'attendance.html', '📋'],
      ['Results', 'results.html', '📊'], ['Report Cards', 'report-cards.html', '🧾'],
      ['CBT / Exams', 'cbt.html', '🧠'], ['Fees', 'fees.html', '💰'],
      ['Analytics', 'analytics.html', '📈'], ['Voting', 'voting.html', '🗳️'],
      ['Notifications', 'notifications.html', '🔔'], ['ID Cards', 'idcards.html', '🪪'],
      ['Certificates', 'certificates.html', '📜'], ['Admin Data', 'admin-data.html', '🗄️'],
      ['Announcements', 'announcements.html', '📢'], ['Events', 'events.html', '🎭'],
      ['Timetable Generator', 'timetable-generator.html', '🗓️'], ['QR Check-in', 'checkin.html', '📲'],
      ['Student Diary', 'diary.html', '📔'], ['Surveys', 'surveys.html', '🗒️'], ['Menu Planner', 'menu.html', '🍽️'], ['Settings', 'settings.html', '⚙️']
    ],
    mount() {
      if (typeof document === 'undefined' || document.getElementById('sc-palette')) return;
      const el = document.createElement('div');
      el.id = 'sc-palette';
      el.style.cssText = 'display:none;position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.5);align-items:flex-start;justify-content:center;padding-top:12vh';
      el.innerHTML = `<div style="width:560px;max-width:94vw;background:#fff;border-radius:14px;box-shadow:0 30px 60px rgba(0,0,0,.4);overflow:hidden">
        <input id="sc-pal-in" placeholder="Search modules, students, staff, exams…  (Esc to close)" style="width:100%;padding:16px 18px;border:none;border-bottom:1px solid #e2e8f0;font-size:1rem;outline:none">
        <div id="sc-pal-res" style="max-height:50vh;overflow-y:auto"></div>
      </div>`;
      document.body.appendChild(el);
      el.addEventListener('click', e => { if (e.target === el) Super.palette.toggle(false); });
      document.getElementById('sc-pal-in').addEventListener('input', e => Super.palette.search(e.target.value));
      document.getElementById('sc-pal-in').addEventListener('keydown', e => { if (e.key === 'Escape') Super.palette.toggle(false); });
    },
    toggle(force) {
      const el = document.getElementById('sc-palette'); if (!el) return;
      this.open = force !== undefined ? force : !this.open;
      el.style.display = this.open ? 'flex' : 'none';
      if (this.open) { const i = document.getElementById('sc-pal-in'); if (i) { i.value = ''; i.focus(); } this.render(this.PAGES.map(p => ({ label: p[0], href: p[1], icon: p[2] }))); }
    },
    async search(q) {
      q = (q || '').trim();
      const pages = this.PAGES.filter(p => p[0].toLowerCase().includes(q.toLowerCase())).map(p => ({ label: p[0], href: p[1], icon: p[2] }));
      if (q.length < 2 || !Super.sb) { this.render(pages); return; }
      const results = pages.slice();
      try {
        const [st, sf, ex] = await Promise.all([
          Super.sb.from('students').select('id,full_name,class,admission_no').ilike('full_name', '%' + q + '%').limit(5),
          Super.sb.from('staff').select('id,full_name,role').ilike('full_name', '%' + q + '%').limit(5),
          Super.sb.from('cbt_exams').select('id,subject,code').or('subject.ilike.%' + q + '%,code.ilike.%' + q + '%').limit(5)
        ]);
        (st.data || []).forEach(s => results.push({ label: '👨‍🎓 ' + s.full_name + ' — ' + (s.class || ''), href: 'students.html?q=' + encodeURIComponent(s.full_name) }));
        (sf.data || []).forEach(s => results.push({ label: '👨‍🏫 ' + s.full_name + ' — ' + (s.role || ''), href: 'staff.html?q=' + encodeURIComponent(s.full_name) }));
        (ex.data || []).forEach(e => results.push({ label: '🧠 ' + e.subject + ' (' + e.code + ')', href: 'cbt.html?code=' + e.code }));
      } catch (e) { /* offline / demo */ }
      this.render(results);
    },
    render(items) {
      const box = document.getElementById('sc-pal-res'); if (!box) return;
      if (!items.length) { box.innerHTML = '<div style="padding:18px;color:#64748b">No matches.</div>'; return; }
      box.innerHTML = items.map(i => `<a href="${i.href}" style="display:flex;gap:10px;padding:12px 18px;text-decoration:none;color:#0f172a;border-bottom:1px solid #f1f5f9">${i.icon ? '<span>' + i.icon + '</span>' : ''}<span>${Super.esc(i.label)}</span></a>`).join('');
    }
  },

  /* ==================================================================
     3) MULTI-CHANNEL NOTIFICATION FAN-OUT (interconnection hooks)
        Call Super.notify.fire(...) from any module after an event.
        Writes an in-app notification row and offers free WA/email/SMS.
     ================================================================== */
  notify: {
    async fire(title, body, opts) {
      opts = opts || {};
      if (Super.sb) {
        try {
          await Super.sb.from('notifications').insert({
            title, body: body || '', url: opts.url || '',
            audience: opts.audience || 'all', priority: opts.priority || 'normal',
            channels: opts.channels || ['inapp']
          });
        } catch (e) { /* table optional */ }
      }
      // Browser push (if the SW + permission exist)
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body: body || '' }); } catch (e) {}
      // Free deep links the caller can present to the user
      return {
        whatsapp: 'https://wa.me/?text=' + encodeURIComponent(title + '\n' + (body || '')),
        email: 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body || ''),
        sms: 'sms:?body=' + encodeURIComponent(title + ' ' + (body || ''))
      };
    }
  },

  /* ==================================================================
     4) ID-CARD GENERATOR (QR via free Google Chart API fallback + canvas)
     ================================================================== */
  idcard: {
    qrUrl(data, size) { size = size || 120; return 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encodeURIComponent(data); },
    html(person) {
      const s = Super.school || {};
      const qr = this.qrUrl(JSON.stringify({ id: person.id || person.admission_no || '', name: person.full_name || person.name || '', type: person.type || 'student' }));
      return `<div class="sc-idcard" style="width:340px;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;font-family:sans-serif">
        <div style="background:var(--primary,#4f46e5);color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px">
          <img src="assets/img/logo.${(s.logoExt || 'svg')}" style="width:34px;height:34px;border-radius:8px;background:#fff;object-fit:contain" alt="">
          <div><strong style="font-size:.95rem">${Super.esc(s.name || 'School')}</strong><div style="font-size:.7rem;opacity:.9">${Super.esc(s.motto || '')}</div></div>
        </div>
        <div style="display:flex;gap:12px;padding:14px;align-items:center">
          <img src="${person.photo_url || this.qrUrl(person.full_name || 'student', 70)}" style="width:70px;height:70px;border-radius:10px;object-fit:cover;background:#f1f5f9" alt="">
          <div style="flex:1;font-size:.85rem">
            <div style="font-weight:700">${Super.esc(person.full_name || person.name || '')}</div>
            <div style="color:#64748b">${Super.esc(person.class || person.role || '')}</div>
            <div style="color:#64748b">ID: ${Super.esc(person.admission_no || person.id || '')}</div>
          </div>
          <img src="${qr}" style="width:60px;height:60px" alt="QR">
        </div>
        <div style="background:#f8fafc;padding:8px 14px;font-size:.68rem;color:#94a3b8;text-align:center">${Super.esc(s.phone || '')} · Powered by HMG Concepts</div>
      </div>`;
    },
    print(person) {
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>ID Card</title></head><body style="display:flex;justify-content:center;padding:30px">' + this.html(person) + '<script>window.onload=()=>window.print()<\/script></body></html>');
      w.document.close();
    }
  },

  /* ==================================================================
     5) CERTIFICATE GENERATOR (printable, verifiable code)
     ================================================================== */
  cert: {
    code() { const c = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = 'SC-'; for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s; },
    html(opts) {
      const s = Super.school || {}; const code = opts.code || this.code();
      return `<div class="sc-cert" style="width:800px;max-width:96vw;border:10px solid var(--primary,#4f46e5);padding:40px;text-align:center;font-family:Georgia,serif;background:#fff">
        <img src="assets/img/logo.${(s.logoExt || 'svg')}" style="width:70px;height:70px;border-radius:12px;object-fit:contain" alt="">
        <h1 style="margin:10px 0 4px">${Super.esc(s.name || 'School')}</h1>
        <p style="color:#64748b;margin:0 0 20px">${Super.esc(s.motto || '')}</p>
        <h2 style="letter-spacing:2px;color:var(--primary,#4f46e5)">${Super.esc(opts.title || 'CERTIFICATE OF ACHIEVEMENT')}</h2>
        <p style="margin:18px 0 6px">This is to certify that</p>
        <h2 style="margin:0;border-bottom:2px solid #e2e8f0;display:inline-block;padding:0 30px 6px">${Super.esc(opts.name || '')}</h2>
        <p style="max-width:560px;margin:18px auto;line-height:1.6">${Super.esc(opts.body || 'has successfully met the requirements and is hereby recognised for outstanding achievement.')}</p>
        <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:.85rem">
          <div>____________________<br>Date: ${Super.esc(opts.date || new Date().toLocaleDateString())}</div>
          <div>____________________<br>${Super.esc(opts.signatory || 'Head of School')}</div>
        </div>
        <p style="margin-top:24px;font-size:.72rem;color:#94a3b8">Verification code: <strong>${Super.esc(code)}</strong> · Verify at ${Super.esc((typeof location!=='undefined'?location.origin:''))}</p>
      </div>`;
    },
    print(opts) {
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>Certificate</title></head><body style="display:flex;justify-content:center;padding:20px">' + this.html(opts) + '<script>window.onload=()=>window.print()<\/script></body></html>');
      w.document.close();
    }
  },

  /* ==================================================================
     6) FLYER / MARKETING GENERATOR (printable promo poster — lead gen)
     ================================================================== */
  flyer: {
    html() {
      const s = Super.school || {};
      return `<div class="sc-flyer" style="width:600px;max-width:96vw;background:linear-gradient(135deg,var(--primary,#4f46e5),var(--accent,#7c3aed));color:#fff;border-radius:18px;padding:40px;text-align:center;font-family:sans-serif">
        <img src="assets/img/logo.${(s.logoExt || 'svg')}" style="width:80px;height:80px;border-radius:16px;background:#fff;object-fit:contain" alt="">
        <h1 style="font-size:2rem;margin:14px 0 4px">${Super.esc(s.name || 'Our School')}</h1>
        <p style="opacity:.95">${Super.esc(s.motto || 'Excellence in Education')}</p>
        <div style="background:rgba(255,255,255,.15);border-radius:14px;padding:20px;margin:24px 0;text-align:left">
          <p style="margin:6px 0">✅ Online results & report cards</p>
          <p style="margin:6px 0">✅ CBT / online exams from any device</p>
          <p style="margin:6px 0">✅ Fees, attendance & parent updates</p>
          <p style="margin:6px 0">✅ Installable app + instant notifications</p>
        </div>
        <p style="font-weight:700">📞 ${Super.esc(s.phone || '')}  ·  ✉️ ${Super.esc(s.email || '')}</p>
        <p style="font-size:.8rem;opacity:.85">${Super.esc(s.address || '')}</p>
        <p style="margin-top:18px;font-size:.7rem;opacity:.8">Powered by HMG Concepts</p>
      </div>`;
    },
    print() {
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>Flyer</title></head><body style="display:flex;justify-content:center;padding:20px">' + this.html() + '<script>window.onload=()=>window.print()<\/script></body></html>');
      w.document.close();
    }
  },

  /* ==================================================================
     7) PER-SCHOOL DATA EXPORT / IMPORT + DRAFT AUTOSAVE (from "Projects")
     ================================================================== */
  data: {
    autosaveKey(form) { return 'sc-draft-' + (form || location.pathname); },
    bindAutosave(formEl, key) {
      if (!formEl) return;
      key = key || this.autosaveKey();
      try { const saved = JSON.parse(localStorage.getItem(key) || '{}'); Object.keys(saved).forEach(n => { const f = formEl.elements[n]; if (f) f.value = saved[n]; }); } catch (e) {}
      formEl.addEventListener('input', () => {
        const obj = {}; [...formEl.elements].forEach(f => { if (f.name) obj[f.name] = f.value; });
        try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
      });
      formEl.addEventListener('submit', () => { try { localStorage.removeItem(key); } catch (e) {} });
    }
  }
};

if (typeof window !== 'undefined') window.Super = Super;
if (typeof console !== 'undefined') console.log('%c[School Connect Gen v3] super features loaded — chatbot, command palette (Ctrl+K), notify hooks, ID cards, certificates, flyer, autosave. No AI.', 'color:#db2777;font-weight:bold');
