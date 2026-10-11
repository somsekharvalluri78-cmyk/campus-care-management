import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookOpen, Check, ChevronDown,
  CircleHelp, ClipboardList, Clock3, Download, FilePlus2, Filter, LayoutDashboard, LogOut, Menu,
  Search, Settings2, ShieldCheck, Sparkles, UserRound, Users, X,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '/api';
const DEMO_PASSWORD = 'CampusDemo2026!';
const STATUS_OPTIONS = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Waiting for Student', 'Resolved', 'Closed', 'Rejected'];
const DEMO_ACCOUNTS = [
  { label: 'Student', identifier: 'STU-2026-001', icon: BookOpen },
  { label: 'Staff', identifier: 'STF-001', icon: ClipboardList },
  { label: 'Administrator', identifier: 'ADM-001', icon: ShieldCheck },
];

async function request(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || (response.status === 404 ? 'Server endpoint not found. Please refresh.' : 'The request could not be completed.'));
  }
  return data;
}

function shortDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function timeAgo(value) {
  const hours = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 3600000));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusClass(status) {
  return `status status-${status.toLowerCase().replaceAll(' ', '-')}`;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('campus-token'));
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [categories, setCategories] = useState([]);
  const [staff, setStaff] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState(import.meta.env.DEV ? DEMO_PASSWORD : '');
  const [loginPending, setLoginPending] = useState(false);

  async function refreshData(authToken = token) {
    if (!authToken) return;
    const [dashboard, complaintData, categoryData, notificationData] = await Promise.all([
      request('/dashboard', authToken),
      request('/complaints', authToken),
      request('/categories', authToken),
      request('/notifications', authToken),
    ]);
    setStats(dashboard.stats);
    setComplaints(complaintData.complaints);
    setCategories(categoryData.categories);
    setNotifications(notificationData.notifications);
    if (user?.role === 'admin') {
      const staffData = await request('/staff', authToken);
      setStaff(staffData.staff);
    }
  }

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let alive = true;
    request('/auth/me', token)
      .then(async (profile) => {
        if (!alive) return;
        setUser(profile.user);
        const [complaintData, categoryData, notificationData] = await Promise.all([
          request('/complaints', token), request('/categories', token), request('/notifications', token),
        ]);
        if (!alive) return;
        setComplaints(complaintData.complaints);
        setCategories(categoryData.categories);
        setNotifications(notificationData.notifications);
        setStats((await request('/dashboard', token)).stats);
        if (profile.user.role === 'admin') setStaff((await request('/staff', token)).staff);
      })
      .catch((loadError) => {
        if (alive) {
          localStorage.removeItem('campus-token');
          setToken(null);
          setError(loadError.message);
        }
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [token]);

  async function signIn(event) {
    event.preventDefault();
    setLoginPending(true);
    setError('');
    try {
      const result = await request('/auth/login', null, { method: 'POST', body: JSON.stringify({ identifier: loginIdentifier, password: loginPassword }) });
      localStorage.setItem('campus-token', result.token);
      setToken(result.token);
      setUser(result.user);
      setActiveView('overview');
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoginPending(false);
    }
  }

  async function registerStudent(student) {
    setLoginPending(true);
    setError('');
    try {
      const result = await request('/auth/register', null, { method: 'POST', body: JSON.stringify(student) });
      localStorage.setItem('campus-token', result.token);
      setToken(result.token);
      setUser(result.user);
      setActiveView('overview');
    } catch (registrationError) {
      setError(registrationError.message);
    } finally {
      setLoginPending(false);
    }
  }

  function signOut() {
    localStorage.removeItem('campus-token');
    setToken(null);
    setUser(null);
    setSelected(null);
    setActiveView('overview');
    setStats(null);
    setComplaints([]);
  }

  async function openComplaint(complaint) {
    setError('');
    try {
      const result = await request(`/complaints/${complaint.complaintId}`, token);
      setSelected(result.complaint);
      setHistory(result.history);
    } catch (detailError) {
      setError(detailError.message);
    }
  }

  async function updateStatus(complaintId, status, remarks = '') {
    try {
      await request(`/complaints/${complaintId}/status`, token, { method: 'PATCH', body: JSON.stringify({ status, remarks }) });
      setNotice(`${complaintId} updated to ${status}.`);
      await refreshData();
      if (selected?.complaintId === complaintId) await openComplaint({ complaintId });
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  async function assignComplaint(complaintId, staffId) {
    try {
      await request(`/complaints/${complaintId}/assign`, token, { method: 'PATCH', body: JSON.stringify({ staffId: Number(staffId) }) });
      setNotice(`${complaintId} assigned successfully.`);
      await refreshData();
      if (selected?.complaintId === complaintId) await openComplaint({ complaintId });
    } catch (assignError) {
      setError(assignError.message);
    }
  }

  async function exportCsv() {
    try {
      const response = await fetch(`${API}/complaints/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to export complaints.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campus-care-complaints-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setNotice('Complaint data exported successfully.');
    } catch (exportErr) {
      setError(exportErr.message);
    }
  }

  async function submitComplaint(event, attachmentName = '') {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const rawDescription = form.get('description');
    const finalDescription = attachmentName ? `${rawDescription}\n\n[Attached File: ${attachmentName}]` : rawDescription;
    try {
      const result = await request('/complaints', token, {
        method: 'POST',
        body: JSON.stringify({
          categoryId: Number(form.get('categoryId')),
          title: form.get('title'), description: finalDescription, priority: form.get('priority'),
        }),
      });
      setNotice(`Complaint submitted. Your reference is ${result.complaintId}.`);
      formElement.reset();
      setActiveView('complaints');
      await refreshData();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  const filtered = complaints.filter((complaint) => {
    const matchesSearch = `${complaint.complaintId} ${complaint.title} ${complaint.studentName} ${complaint.category}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === 'All statuses' || complaint.status === statusFilter);
  });
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'complaints', label: isStaff ? 'Assigned cases' : isAdmin ? 'All complaints' : 'My complaints', icon: ClipboardList },
    ...(!isStaff ? [{ id: 'submit', label: 'New complaint', icon: FilePlus2 }] : []),
  ];

  if (loading) return <div className="loading-screen"><span className="loader" />Connecting to Campus Care</div>;
  if (!token || !user) return (
    <LoginPage
      identifier={loginIdentifier}
      password={loginPassword}
      error={error}
      pending={loginPending}
      onIdentifier={setLoginIdentifier}
      onPassword={setLoginPassword}
      onSubmit={signIn}
      onDemo={import.meta.env.DEV ? (identifier) => { setLoginIdentifier(identifier); setLoginPassword(DEMO_PASSWORD); setError(''); } : undefined}
      onRegister={registerStudent}
    />
  );

  const visibleComplaints = filtered.slice(0, activeView === 'overview' ? 5 : 100);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><div className="brand-mark"><span>c</span></div><div><strong>campus<span>care</span></strong><small>STUDENT SERVICES</small></div></div>
        <div className="campus-chip"><span className="campus-dot" /> NORTHFIELD COLLEGE <ChevronDown size={13} /></div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${activeView === id ? 'nav-item-active' : ''}`} onClick={() => { setActiveView(id); setMobileMenuOpen(false); }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === 'complaints' && <span className="nav-count">{complaints.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help"><div className="help-icon"><CircleHelp size={17} /></div><div><strong>Need a hand?</strong><span>Visit the help centre</span></div><ArrowRight size={15} /></div>
          <button className="profile-mini" onClick={signOut} title="Sign out"><div className="avatar">{user.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="profile-mini-copy"><strong>{user.fullName}</strong><span>{user.designation || user.department || user.role}</span></div><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu-toggle" aria-label="Open navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu size={19} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{navItems.find((item) => item.id === activeView)?.label || 'Overview'}</strong></div>
          <div className="topbar-actions"><span className="today-label">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</span>
            <button className={`icon-button notification-button ${notificationOpen ? 'icon-button-active' : ''}`} aria-label="Notifications" onClick={() => setNotificationOpen(!notificationOpen)}><Bell size={18} />{notifications.length > 0 && <i />}</button>
            <button className="topbar-user" onClick={signOut}><div className="avatar avatar-small">{user.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><ChevronDown size={14} /></button>
          </div>
          {notificationOpen && <div className="notification-popover"><div className="popover-heading"><strong>Notifications</strong><span>{notifications.length} recent</span></div>{notifications.length ? notifications.slice(0, 5).map((item) => <div className="notification-row" key={item.id}><span className="notification-mark"><Bell size={14} /></span><div><strong>{item.title}</strong><p>{item.message}</p><small>{timeAgo(item.createdAt)}</small></div></div>) : <div className="notification-empty">You’re all caught up.</div>}</div>}
        </header>

        <div className="page-content">
          {(error || notice) && <div className={`toast ${error ? 'toast-error' : ''}`} role="status"><span>{error || notice}</span><button onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss"><X size={16} /></button></div>}
          {activeView === 'overview' && <Overview user={user} stats={stats} complaints={complaints} onNew={() => setActiveView('submit')} onView={() => setActiveView('complaints')} onOpen={openComplaint} />}
          {activeView === 'complaints' && <section className="content-section">
            <div className="page-heading"><div><div className="eyebrow">{isAdmin ? 'SERVICE DESK' : isStaff ? 'YOUR WORK QUEUE' : 'YOUR RECORD'}</div><h1>{isAdmin ? 'All complaints' : isStaff ? 'Assigned cases' : 'My complaints'}<span className="heading-count">{complaints.length}</span></h1><p>Review cases, follow progress and keep every conversation in one place.</p></div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {isAdmin && <button className="button-quiet" onClick={exportCsv} title="Export complaints to CSV"><Download size={16} /> Export CSV</button>}
                {!isStaff && <button className="button-primary" onClick={() => setActiveView('submit')}><FilePlus2 size={16} /> New complaint</button>}
              </div>
            </div>
            <ComplaintTable rows={visibleComplaints} user={user} search={search} statusFilter={statusFilter} onSearch={setSearch} onFilter={setStatusFilter} onOpen={openComplaint} onStatus={updateStatus} onAssign={assignComplaint} staff={staff} />
          </section>}
          {activeView === 'submit' && <SubmitPage user={user} categories={categories} onSubmit={submitComplaint} onCancel={() => setActiveView('overview')} />}
        </div>
        <footer className="page-footer"><span>Campus Care <span className="footer-dot">/</span> Student services portal</span><span>Private and secure <ShieldCheck size={13} /></span></footer>
      </main>
      {selected && <ComplaintDialog complaint={selected} history={history} user={user} staff={staff} onClose={() => setSelected(null)} onStatus={updateStatus} onAssign={assignComplaint} />}
    </div>
  );
}

const SHORTCUT_MAP = {
  // Computer & IT
  cse: ['computer science & engineering', 'computer science and engineering', 'b.tech cse', 'm.tech computer science', 'b.sc. computer science', 'm.sc. computer science'],
  cs: ['computer science', 'b.tech cse'],
  it: ['information technology', 'b.sc. information technology', 'm.tech it', 'm.sc. information technology'],
  bca: ['bca (bachelor of computer applications)', 'bca'],
  mca: ['mca (master of computer applications)', 'mca'],
  aids: ['artificial intelligence & data science', 'artificial intelligence and data science'],
  'ai&ds': ['artificial intelligence & data science', 'artificial intelligence and data science'],
  aiml: ['artificial intelligence & machine learning', 'artificial intelligence and machine learning'],
  'ai&ml': ['artificial intelligence & machine learning', 'artificial intelligence and machine learning'],
  ai: ['artificial intelligence', 'artificial intelligence & data science', 'artificial intelligence & machine learning'],
  ml: ['machine learning', 'artificial intelligence & machine learning'],
  ds: ['data science', 'artificial intelligence & data science'],
  cyber: ['cyber security'],
  cloud: ['cloud computing'],
  se: ['software engineering'],

  // Electrical & Energy
  eee: ['electrical & electronics engineering', 'electrical and electronics engineering', 'electrical & energy', 'm.tech power systems', 'power electronics', 'electrical machines'],
  ee: ['electrical & electronics engineering', 'electrical'],
  pe: ['power electronics', 'production engineering'],
  ps: ['power systems'],
  re: ['renewable energy'],

  // Electronics & Communication
  ece: ['electronics & communication engineering', 'electronics and communication engineering', 'm.tech ece'],
  ec: ['electronics & communication engineering'],
  vlsi: ['vlsi design', 'm.tech vlsi'],
  iot: ['sensors & iot'],
  embed: ['embedded systems'],

  // Mechanical & Related
  me: ['mechanical engineering', 'm.tech mechanical', 'thermal engineering', 'automobile engineering', 'manufacturing engineering', 'industrial engineering'],
  mech: ['mechanical engineering', 'm.tech mechanical'],
  ae: ['automobile engineering', 'aerospace engineering'],
  aero: ['aerospace engineering'],
  auto: ['automobile engineering'],
  robo: ['robotics & automation'],

  // Civil & Architecture
  ce: ['civil engineering', 'm.tech civil', 'structural engineering'],
  civil: ['civil engineering', 'm.tech civil', 'structural engineering'],
  arch: ['architecture', 'm.arch'],

  // Chemical & Materials
  che: ['chemical engineering'],
  chem: ['chemistry', 'chemical engineering'],
  mme: ['metallurgical & materials engineering'],

  // Other Engineering
  bme: ['biomedical engineering'],
  agri: ['agricultural engineering', 'agriculture'],
  ft: ['food technology'],

  // Management & Commerce
  bba: ['bba', 'bachelor of business administration'],
  mba: ['mba', 'master of business administration', 'pgdm', 'executive mba'],
  bcom: ['b.com', 'commerce'],
  mcom: ['m.com'],
  pgdm: ['pgdm'],

  // Science
  phy: ['physics'],
  math: ['mathematics'],
  bio: ['biology', 'biotechnology', 'microbiology'],
  biotech: ['biotechnology'],

  // Law
  law: ['ba llb', 'llb', 'llm', 'integrated law', 'law'],
  llb: ['ba llb', 'llb', 'bba llb', 'b.com llb'],
  llm: ['llm'],

  // Pharmacy
  pharm: ['d.pharm', 'b.pharm', 'm.pharm', 'pharm.d', 'pharmacy'],
  bpharm: ['b.pharm'],
  dpharm: ['d.pharm'],
  mpharm: ['m.pharm'],

  // Health
  nursing: ['b.sc. nursing', 'm.sc. nursing', 'gnm'],
  nurse: ['nursing'],
  bpt: ['bpt', 'physiotherapy'],
  mpt: ['mpt', 'physiotherapy'],

  // Education
  bed: ['b.ed', 'b.el.ed'],
  med: ['m.ed'],

  // Campus Services
  admin: ['administration'],
  lib: ['library'],
  hostel: ['hostel'],
};

function getDeptStyle(department) {
  if (!department) {
    return {
      bg: '#f1f5f9',
      color: '#475569',
      border: '#cbd5e1',
      badge: 'DEPT',
      accent: '#64748b',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  const name = (department.name || '').toLowerCase();
  const code = (department.code || '').toUpperCase();
  const category = (department.category || '').toLowerCase();

  // 1. Computer Science & Engineering / Computer & IT -> RED (User request: CSE is red)
  if (
    code === 'CSE' ||
    name.includes('computer science') ||
    code.includes('CS') ||
    name.includes('cse') ||
    category.includes('computer')
  ) {
    return {
      bg: '#fef2f2',
      color: '#dc2626',
      border: '#fca5a5',
      badge: code.includes('CSE') || name.includes('cse') ? 'CSE' : (code || 'CS'),
      accent: '#b91c1c',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 2. Electrical & Electronics Engineering (EEE) -> BLUE (User request: EEE is blue)
  if (
    code === 'EEE' ||
    name.includes('electrical & electronics') ||
    name.includes('electrical and electronics') ||
    category.includes('electrical') ||
    code.includes('PWR') ||
    code.includes('RE')
  ) {
    return {
      bg: '#eff6ff',
      color: '#2563eb',
      border: '#93c5fd',
      badge: code.includes('EEE') || name.includes('eee') ? 'EEE' : (code || 'EEE'),
      accent: '#1d4ed8',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 3. Electronics & Communication (ECE) -> CYAN / TEAL
  if (
    code === 'ECE' ||
    name.includes('electronics & communication') ||
    category.includes('electronics & communication') ||
    code.includes('VLSI') ||
    code.includes('EMBED')
  ) {
    return {
      bg: '#ecfeff',
      color: '#0891b2',
      border: '#a5f3fc',
      badge: code || 'ECE',
      accent: '#0e7490',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 4. Mechanical & Related -> VIBRANT ORANGE
  if (
    code === 'ME' ||
    name.includes('mechanical') ||
    category.includes('mechanical') ||
    code.includes('AUTO') ||
    code.includes('AERO') ||
    name.includes('thermal')
  ) {
    return {
      bg: '#fff7ed',
      color: '#ea580c',
      border: '#fed7aa',
      badge: code || 'MECH',
      accent: '#c2410c',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 5. Civil & Architecture -> DEEP EMERALD GREEN
  if (
    code === 'CE' ||
    name.includes('civil') ||
    category.includes('civil') ||
    name.includes('structural') ||
    name.includes('architecture')
  ) {
    return {
      bg: '#f0fdf4',
      color: '#16a34a',
      border: '#86efac',
      badge: code || 'CIVIL',
      accent: '#15803d',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 6. Science -> PURPLE
  if (category.includes('science') && !category.includes('computer')) {
    return {
      bg: '#faf5ff',
      color: '#9333ea',
      border: '#d8b4fe',
      badge: code || 'SCI',
      accent: '#7e22ce',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 7. Management (MBA, BBA) -> INDIGO
  if (category.includes('management') || code.includes('MBA') || code.includes('BBA')) {
    return {
      bg: '#eef2ff',
      color: '#4f46e5',
      border: '#a5b4fc',
      badge: code || 'MGMT',
      accent: '#4338ca',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 8. Commerce & Business -> TEAL
  if (category.includes('commerce') || code.includes('BCOM') || code.includes('MCOM')) {
    return {
      bg: '#f0fdfa',
      color: '#0d9488',
      border: '#5eead4',
      badge: code || 'COMM',
      accent: '#0f766e',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 9. Arts & Humanities -> ROSE
  if (category.includes('arts') || category.includes('humanities')) {
    return {
      bg: '#fff1f2',
      color: '#e11d48',
      border: '#fda4af',
      badge: code || 'ARTS',
      accent: '#be123c',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 10. Law -> BURGUNDY
  if (category.includes('law') || code.includes('LLB') || code.includes('LLM')) {
    return {
      bg: '#fdf2f8',
      color: '#be185d',
      border: '#fbcfe8',
      badge: code || 'LAW',
      accent: '#881337',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 11. Pharmacy -> SKY BLUE
  if (category.includes('pharmacy') || code.includes('PHARM')) {
    return {
      bg: '#f0f9ff',
      color: '#0284c7',
      border: '#7dd3fc',
      badge: code || 'PHARM',
      accent: '#0369a1',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 12. Agriculture -> OLIVE LIME
  if (category.includes('agriculture') || code.includes('AGRI')) {
    return {
      bg: '#f7fee7',
      color: '#65a30d',
      border: '#bef264',
      badge: code || 'AGRI',
      accent: '#4d7c0f',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 13. Health & Allied -> CORAL PINK
  if (category.includes('health') || code.includes('NURS') || code.includes('BPT')) {
    return {
      bg: '#fff1f2',
      color: '#f43f5e',
      border: '#fecdd3',
      badge: code || 'HLTH',
      accent: '#e11d48',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 14. Education -> WARM AMBER
  if (category.includes('education') || code.includes('BED') || code.includes('MED')) {
    return {
      bg: '#fffbeb',
      color: '#d97706',
      border: '#fcd34d',
      badge: code || 'EDU',
      accent: '#b45309',
      fontFamily: "'DM Sans', sans-serif",
    };
  }

  // 15. Fallback / Miscellaneous / Campus Services -> SLATE
  return {
    bg: '#f8fafc',
    color: '#475569',
    border: '#cbd5e1',
    badge: code || 'GEN',
    accent: '#334155',
    fontFamily: "'DM Sans', sans-serif",
  };
}

function normalizeSearchText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesDeptSearch(dept, query) {
  if (!query) return true;
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return true;

  const name = (dept.name || '').toLowerCase();
  const code = (dept.code || '').toLowerCase();
  const category = (dept.category || '').toLowerCase();

  // 1. Direct name / code / category substring
  if (name.includes(cleanQ) || code.includes(cleanQ) || category.includes(cleanQ)) {
    return true;
  }

  // 2. Normalized text match (& <-> and, punctuation, spacing)
  const normName = normalizeSearchText(dept.name);
  const normQ = normalizeSearchText(cleanQ);
  if (normName.includes(normQ) || normQ.includes(normName)) {
    return true;
  }

  // 3. Parentheses match (e.g. "(CSE)", "(EEE)", "(AI&DS)", "(ChE)", "(ME)")
  const parenText = name.match(/\(([^)]+)\)/)?.[1]?.toLowerCase() || '';
  if (parenText && (parenText === cleanQ || parenText.replace(/[^a-z0-9]/g, '') === cleanQ.replace(/[^a-z0-9]/g, ''))) {
    return true;
  }

  // 4. Acronym of words in name
  const words = name.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const acronym = words.map((w) => w[0].toLowerCase()).join('');
  if (acronym === cleanQ || acronym.startsWith(cleanQ)) {
    return true;
  }

  // 5. Shortcut dictionary lookup
  const aliases = SHORTCUT_MAP[cleanQ] || SHORTCUT_MAP[cleanQ.replace(/[^a-z0-9]/g, '')];
  if (aliases) {
    for (const alias of aliases) {
      if (name.includes(alias) || category.includes(alias) || code.includes(alias) || normName.includes(normalizeSearchText(alias))) {
        return true;
      }
    }
  }

  // 6. Multi-word query (e.g. "computer science", "electrical electronics")
  const queryParts = cleanQ.split(/\s+/).filter(Boolean);
  if (queryParts.length > 1) {
    const allMatch = queryParts.every((part) => normName.includes(part) || category.includes(part));
    if (allMatch) return true;
  }

  return false;
}

function DepartmentSearchSelect({
  departments = [],
  value,
  onChange,
  disabled = false,
  loading = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  const selectedDepartment = useMemo(() => {
    return departments.find((d) => String(d.id) === String(value));
  }, [departments, value]);

  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => matchesDeptSearch(dept, search));
  }, [departments, search]);

  // Group filtered departments by category
  const groupedDepartments = useMemo(() => {
    const groups = {};
    for (const dept of filteredDepartments) {
      const cat = dept.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(dept);
    }
    return groups;
  }, [filteredDepartments]);

  const selectedStyle = getDeptStyle(selectedDepartment);

  function handleSelect(dept) {
    onChange(dept.id);
    setIsOpen(false);
    setSearch('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div
      className={`dept-select-wrap ${isOpen ? 'dept-select-open' : ''}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className={`dept-select-trigger ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="dept-selected-content">
          {selectedDepartment ? (
            <>
              <span
                className="dept-badge"
                style={{
                  backgroundColor: selectedStyle.bg,
                  color: selectedStyle.color,
                  borderColor: selectedStyle.border,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  fontFamily: selectedStyle.fontFamily,
                }}
              >
                {selectedStyle.badge}
              </span>
              <span className="dept-selected-name" style={{ color: selectedStyle.color, fontWeight: 700 }}>
                {selectedDepartment.name}
              </span>
            </>
          ) : (
            <span className="dept-placeholder">
              <Search size={14} style={{ opacity: 0.6 }} />
              {loading ? 'Loading all 169 departments…' : 'Search or choose department (e.g. CSE, EEE, Mech)…'}
            </span>
          )}
        </div>
        <ChevronDown size={15} style={{ opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {isOpen && (
        <div className="dept-dropdown-panel" role="listbox">
          <div className="dept-search-box">
            <Search size={14} style={{ color: '#64748b', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              className="dept-search-input"
              placeholder="Type shortcut (CSE, EEE, ECE, ME, CE) or branch name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search department"
            />
            {search && (
              <button
                type="button"
                className="dept-clear-btn"
                onClick={() => setSearch('')}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="dept-count-badge">
            <span>
              {search
                ? `Found ${filteredDepartments.length} matching branch${filteredDepartments.length === 1 ? '' : 'es'}`
                : `All 169 departments (${departments.length} available)`}
            </span>
            <small style={{ color: '#94a3b8', fontWeight: 'normal' }}>
              Instant filter active
            </small>
          </div>

          <div className="dept-options-list">
            {filteredDepartments.length === 0 ? (
              <div className="dept-empty">
                <p>No department found matching &ldquo;<strong>{search}</strong>&rdquo;</p>
                <small style={{ color: '#94a3b8' }}>Try searching by shortcut like CSE, EEE, ME, CE, or MBA.</small>
              </div>
            ) : (
              Object.entries(groupedDepartments).map(([cat, list]) => (
                <div key={cat} className="dept-group">
                  <div className="dept-group-header">
                    <span>{cat}</span>
                    <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 'normal' }}>({list.length})</span>
                  </div>
                  {list.map((dept) => {
                    const isSelected = String(dept.id) === String(value);
                    const style = getDeptStyle(dept);
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`dept-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelect(dept)}
                      >
                        <span
                          className="dept-badge"
                          style={{
                            backgroundColor: style.bg,
                            color: style.color,
                            borderColor: style.border,
                            borderWidth: 1,
                            borderStyle: 'solid',
                            fontFamily: style.fontFamily,
                          }}
                        >
                          {style.badge}
                        </span>
                        <span className="dept-option-name" style={{ color: isSelected ? style.accent : undefined }}>
                          {dept.name}
                        </span>
                        <span className="dept-option-cat">{cat}</span>
                        {isSelected && <Check size={14} style={{ color: style.accent, marginLeft: 4 }} />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LoginPage({ identifier, password, error, pending, onIdentifier, onPassword, onSubmit, onDemo, onRegister }) {
  const [mode, setMode] = useState('login');
  const [departments, setDepartments] = useState([]);
  const [departmentError, setDepartmentError] = useState('');
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    setDepartmentsLoading(true);
    setDepartmentError('');
    try {
      const result = await request('/departments', null);
      setDepartments(result.departments);
    } catch {
      setDepartments([]);
      setDepartmentError('Campus Care cannot reach its database right now. Your registration has not been submitted. Start PostgreSQL, then retry.');
    } finally {
      setDepartmentsLoading(false);
    }
  }

  function submitRegistration(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const deptId = selectedDepartmentId || values.get('departmentId');
    if (!deptId) {
      setFormError('Please choose your college department.');
      return;
    }
    if (values.get('password') !== values.get('confirmPassword')) {
      setFormError('The passwords do not match.');
      return;
    }
    setFormError('');
    onRegister({
      studentId: values.get('studentId'), fullName: values.get('fullName'), email: values.get('email'),
      departmentId: Number(deptId), year: Number(values.get('year')),
      section: values.get('section'), phone: values.get('phone'), password: values.get('password'),
    });
  }

  return <main className="login-screen">
    <section className="login-art"><div className="login-art-top"><div className="brand-lockup brand-lockup-light"><div className="brand-mark"><span>c</span></div><div><strong>campus<span>care</span></strong><small>STUDENT SERVICES</small></div></div><span className="art-index">EST. 2026 <span>•</span> NORTHFIELD COLLEGE</span></div>
      <div className="art-copy"><div className="eyebrow eyebrow-light"><span /> A BETTER CAMPUS, TOGETHER</div><h1>Be heard.<br /><em>We’re listening.</em></h1><p>One thoughtful conversation can make campus life better for everyone. Tell us what needs attention and follow every step.</p><div className="art-stat"><div className="stat-avatars"><span>AM</span><span>JL</span><span>SK</span><span>+</span></div><div><strong>A campus that cares</strong><small>Built around your voice</small></div><div className="art-spark"><Sparkles size={18} /></div></div></div>
      <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-footer"><span>LISTEN CLOSELY. ACT THOUGHTFULLY.</span><span>01 / 03</span></div>
    </section>
    <section className="login-form-area"><div className="login-mobile-brand"><div className="brand-mark"><span>c</span></div><strong>campus<span>care</span></strong></div><div className="login-form-wrap"><div className="login-heading"><div className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'JOIN YOUR CAMPUS'}</div><h2>{mode === 'login' ? <>Sign in to your<br />campus account</> : <>Create your<br />student account</>}</h2><p>{mode === 'login' ? 'Access your dashboard and stay in the loop.' : 'Register once to share concerns and follow their progress.'}</p></div>
      {mode === 'login' ? <form onSubmit={onSubmit} className="login-form"><label htmlFor="login-id">Student / staff ID or email</label><input id="login-id" autoComplete="username" placeholder="Enter your ID or email" value={identifier} onChange={(event) => onIdentifier(event.target.value)} required /><div className="password-label"><label htmlFor="login-password">Password</label>{import.meta.env.DEV && <button type="button" className="text-button" onClick={() => onPassword(DEMO_PASSWORD)}>Use demo password</button>}</div><input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => onPassword(event.target.value)} required />
        {error && <div className="login-error" role="alert">{error}</div>}<button className="button-primary login-submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}<ArrowRight size={17} /></button>
      </form> : <form onSubmit={submitRegistration} className="login-form registration-form">
        <div className="registration-fields"><label>Student ID<input name="studentId" autoComplete="off" minLength="3" maxLength="80" placeholder="Your college student ID" pattern="[A-Za-z0-9-]+" title="Use letters, numbers, and hyphens only." required /></label><label>Full name<input name="fullName" autoComplete="name" minLength="2" maxLength="160" placeholder="As recorded by your college" required /></label></div>
        <label>College email<input name="email" type="email" autoComplete="email" maxLength="255" placeholder="you@college.edu" required /></label>
        <div className="registration-fields">
          <label style={{ position: 'relative' }}>Department
            <DepartmentSearchSelect
              departments={departments}
              value={selectedDepartmentId}
              onChange={setSelectedDepartmentId}
              disabled={departments.length === 0}
              loading={departmentsLoading}
            />
            <input type="hidden" name="departmentId" value={selectedDepartmentId || ''} required />
          </label>
          <label>Year
            <select name="year" defaultValue="" required>
              <option value="" disabled>Choose year</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((year) => <option key={year} value={year}>{year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} year</option>)}
            </select>
          </label>
        </div>
        {departmentError && <div className="department-error" role="alert"><span>{departmentError}</span><button type="button" className="department-retry" onClick={loadDepartments} disabled={departmentsLoading}>{departmentsLoading ? 'Retrying…' : 'Retry'}</button></div>}
        <div className="registration-fields"><label>Section<input name="section" maxLength="20" placeholder="e.g. A" required /></label><label>Phone <span className="optional-label">OPTIONAL</span><input name="phone" type="tel" maxLength="30" autoComplete="tel" placeholder="Phone number" /></label></div>
        <div className="registration-fields"><label>Password<input name="password" type="password" autoComplete="new-password" minLength="10" maxLength="128" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,128}" title="Use at least 10 characters with uppercase, lowercase, and a number." required /></label><label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength="10" maxLength="128" required /></label></div>
        <p className="password-guidance">Use at least 10 characters, with uppercase and lowercase letters plus a number.</p>
        <p className="registration-notice">Use your official student ID. Email ownership and enrollment are not verified yet.</p>
        {(formError || error) && <div className="login-error" role="alert">{formError || error}</div>}
        <button className="button-primary login-submit" disabled={pending || departments.length === 0}>{pending ? 'Creating account…' : 'Create account'}<ArrowRight size={17} /></button>
      </form>}
      <div className="auth-switch">{mode === 'login' ? <>New to Campus Care? <button type="button" onClick={() => { setMode('register'); setFormError(''); setSelectedDepartmentId(''); }}>Create a student account</button></> : <>Already registered? <button type="button" onClick={() => { setMode('login'); setFormError(''); setSelectedDepartmentId(''); }}>Sign in instead</button></>}</div>
      {mode === 'login' && import.meta.env.DEV && <><div className="demo-divider"><span /> QUICK DEMO ACCESS <span /></div><div className="demo-accounts">{DEMO_ACCOUNTS.map(({ label, identifier: demoId, icon: Icon }) => <button key={label} onClick={() => onDemo(demoId)} className="demo-account"><Icon size={17} /><span><strong>{label}</strong><small>{demoId}</small></span><ArrowUpRight size={14} className="demo-arrow" /></button>)}</div></>}
      <div className="login-security"><ShieldCheck size={15} /> Your information is only visible to authorized staff.</div>
    </div><div className="login-form-footer">© 2026 Northfield College <span>•</span> Student support, made simple</div></section>
  </main>;
}

function Overview({ user, stats, complaints, onNew, onView, onOpen }) {
  const isAdmin = user.role === 'admin';
  const isStaff = user.role === 'staff';
  const cards = isAdmin
    ? [{ label: 'Total students', value: stats?.peopleCount ?? '—', icon: Users, tone: 'sage', change: 'ACTIVE ACCOUNTS' }, { label: 'Total complaints', value: stats?.total ?? 0, icon: ClipboardList, tone: 'blue', change: 'ALL TIME' }, { label: 'Needs attention', value: stats?.pending ?? 0, icon: Clock3, tone: 'amber', change: 'PENDING REVIEW' }, { label: 'Critical cases', value: stats?.critical ?? 0, icon: Activity, tone: 'rose', change: 'HIGH PRIORITY' }]
    : isStaff
      ? [{ label: 'Assigned cases', value: stats?.total ?? 0, icon: ClipboardList, tone: 'sage', change: 'IN YOUR QUEUE' }, { label: 'New cases', value: stats?.pending ?? 0, icon: Sparkles, tone: 'amber', change: 'NEEDS A LOOK' }, { label: 'In progress', value: stats?.in_progress ?? 0, icon: Activity, tone: 'blue', change: 'BEING HANDLED' }, { label: 'Resolved', value: stats?.resolved ?? 0, icon: Check, tone: 'mint', change: 'THIS PERIOD' }]
      : [{ label: 'All complaints', value: stats?.total ?? 0, icon: ClipboardList, tone: 'sage', change: 'SUBMITTED BY YOU' }, { label: 'Under review', value: stats?.pending ?? 0, icon: Clock3, tone: 'amber', change: 'WE’RE ON IT' }, { label: 'In progress', value: stats?.in_progress ?? 0, icon: Activity, tone: 'blue', change: 'BEING HANDLED' }, { label: 'Resolved', value: (stats?.resolved ?? 0) + (stats?.closed ?? 0), icon: Check, tone: 'mint', change: 'COMPLETED' }];
  const firstName = user.fullName.split(' ')[0];
  const openCount = stats?.pending ?? 0;
  return <section className="content-section overview-section">
    <div className="welcome-banner"><div><div className="eyebrow eyebrow-light"><span /> YOUR CAMPUS, IN GOOD HANDS</div><h1>{isAdmin ? 'Good morning' : isStaff ? 'Good to see you' : 'Hello'}, {firstName}<span className="wave">.</span></h1><p>{isAdmin ? 'Here’s what’s happening across your service desk today.' : isStaff ? 'Here’s a clear view of the cases on your desk.' : 'Here’s the latest on what you’ve shared with us.'}</p></div><div className="welcome-side"><div className="welcome-side-icon"><Sparkles size={19} /></div><span>{openCount === 0 ? 'All caught up' : `${openCount} ${openCount === 1 ? 'item' : 'items'} need attention`}</span><div className="welcome-progress"><i style={{ width: `${Math.max(18, 100 - openCount * 9)}%` }} /></div><small>YOUR SERVICE SNAPSHOT</small></div><div className="banner-doodle doodle-a" /><div className="banner-doodle doodle-b" /></div>
    <div className="stats-grid">{cards.map(({ label, value, icon: Icon, tone, change }, index) => <article className={`stat-card stat-${tone}`} key={label}><div className="stat-card-top"><span>{label}</span><span className="stat-icon"><Icon size={17} /></span></div><div className="stat-number">{value}</div><div className="stat-foot"><span className="stat-trend">{index === 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{change}</span><span className="stat-period">2026</span></div></article>)}</div>
    <div className="section-heading-row"><div><div className="eyebrow">THE LATEST</div><h2>Recent activity</h2></div><button className="text-button view-all" onClick={onView}>View all <ArrowRight size={15} /></button></div>
    <ComplaintTable rows={complaints.slice(0, 5)} user={user} compact onOpen={onOpen} />
    {!isStaff && <button className="new-complaint-strip" onClick={onNew}><span className="strip-icon"><FilePlus2 size={18} /></span><span><strong>Something on your mind?</strong><small>Share a concern with the right people at Northfield.</small></span><span className="strip-action">Submit a complaint <ArrowRight size={15} /></span></button>}
  </section>;
}

function ComplaintTable({ rows, user, compact = false, search = '', statusFilter = 'All statuses', onSearch, onFilter, onOpen, onStatus, onAssign, staff = [] }) {
  const admin = user.role === 'admin';
  const staffUser = user.role === 'staff';
  return <div className={`table-shell ${compact ? 'table-compact' : ''}`}>
    {!compact && <div className="table-toolbar"><div className="table-search"><Search size={16} /><input aria-label="Search complaints" placeholder="Search by ID, title or student" value={search} onChange={(event) => onSearch(event.target.value)} /></div><label className="filter-select"><Filter size={15} /><select aria-label="Filter by status" value={statusFilter} onChange={(event) => onFilter(event.target.value)}><option>All statuses</option>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={14} /></label></div>}
    {rows.length ? <div className="table-overflow"><table><thead><tr><th>REFERENCE</th><th>COMPLAINT</th>{admin && <th>STUDENT</th>}<th>PRIORITY</th><th>STATUS</th><th>UPDATED</th><th><span className="sr-only">Open complaint</span></th></tr></thead><tbody>{rows.map((row) => <tr key={row.complaintId} onClick={() => onOpen(row)} tabIndex="0" onKeyDown={(event) => event.key === 'Enter' && onOpen(row)}>
      <td><span className="case-id">{row.complaintId}</span></td><td><div className="case-title">{row.title}</div><div className="case-meta">{row.category}<span>·</span>{row.department && (() => { const dStyle = getDeptStyle({ name: row.department }); return <span style={{ color: dStyle.accent, fontWeight: 700 }}>{row.department}</span>; })()}</div></td>{admin && <td><div className="student-cell">{row.studentName}<small>{row.studentLoginId}</small></div></td>}
      <td><span className={`priority priority-${row.priority.toLowerCase()}`}><i />{row.priority}</span></td><td><span className={statusClass(row.status)}><i />{row.status}</span></td><td className="updated-cell">{compact ? timeAgo(row.updatedAt) : shortDate(row.updatedAt)}</td>
      <td><button className="row-open" aria-label={`Open ${row.complaintId}`} onClick={(event) => { event.stopPropagation(); onOpen(row); }}><ArrowUpRight size={16} /></button></td>
    </tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-icon"><ClipboardList size={21} /></div><strong>{search ? 'No matching complaints' : 'No complaints to show'}</strong><p>{search ? 'Try another keyword or clear the status filter.' : staffUser ? 'New cases assigned to you will appear here.' : 'When you submit a complaint, it will appear here.'}</p></div>}
    {rows.length > 0 && (admin || staffUser) && !compact && <div className="table-footer"><span>Showing {rows.length} {rows.length === 1 ? 'case' : 'cases'}</span><span>Updated just now <span className="live-dot" /></span></div>}
  </div>;
}

function SubmitPage({ user, categories, onSubmit, onCancel }) {
  const [attachmentName, setAttachmentName] = useState('');
  return <section className="content-section submit-section"><div className="page-heading"><div><div className="eyebrow">STUDENT SUPPORT</div><h1>Tell us what’s happening</h1><p>Your concern goes to the right team. You can follow its progress from your dashboard.</p></div><button className="button-quiet" onClick={onCancel}>Cancel</button></div>
    <div className="form-layout"><form className="complaint-form" onSubmit={(e) => onSubmit(e, attachmentName)}><div className="form-section-label"><span>01</span><div><strong>Your concern</strong><small>Give us enough detail to understand and help.</small></div></div>
      <div className="form-field-grid"><label>Category<select name="categoryId" required defaultValue=""><option value="" disabled>Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Priority<select name="priority" defaultValue="Medium"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label></div>
      <label>Complaint title<input name="title" minLength="5" maxLength="180" placeholder="A clear, short summary" required /></label><label>What happened?<textarea name="description" minLength="20" maxLength="5000" rows="5" placeholder="Share the details that will help us understand the situation…" required /><span className="field-hint">Include when and where it happened, and what you’ve already tried.</span></label>
      <div className="form-section-label form-section-second"><span>02</span><div><strong>Where should this go?</strong><small>We’ll route your concern to the right department.</small></div></div>
      <label>Your department
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user.department && (() => {
            const dStyle = getDeptStyle({ name: user.department });
            return <span className="dept-badge" style={{ backgroundColor: dStyle.bg, color: dStyle.color, borderColor: dStyle.border, borderWidth: 1, borderStyle: 'solid' }}>{dStyle.badge}</span>;
          })()}
          <input value={user.department || 'Not assigned'} readOnly style={{ flex: 1 }} />
        </div>
      </label>
      <div className="attachment-box"><label className="attachment-label"><span className="attachment-icon"><FilePlus2 size={17} /></span><span><strong>{attachmentName || 'Add a supporting file'}</strong><small>{attachmentName ? 'File attached' : 'Optional · PNG, JPG, or PDF (up to 5MB)'}</small></span><span className="attachment-browse">{attachmentName ? 'Change' : 'Browse'}</span><input type="file" accept="image/*,.pdf" onChange={(event) => setAttachmentName(event.target.files?.[0]?.name || '')} /></label></div>
      <div className="form-footer"><span><ShieldCheck size={15} /> Only authorized college staff can view your submission.</span><button className="button-primary" type="submit">Submit complaint <ArrowRight size={16} /></button></div>
    </form><aside className="form-aside"><div className="aside-note"><div className="aside-note-icon"><Clock3 size={17} /></div><div className="eyebrow">WHAT HAPPENS NEXT</div><h3>Every step, accounted for.</h3><p>Your complaint receives a reference number and is added to a visible timeline as the team responds.</p><div className="mini-timeline"><div className="mini-step mini-step-active"><span><Check size={11} /></span><div><strong>Submitted</strong><small>We’ve received your report</small></div></div><div className="mini-step"><span>2</span><div><strong>Review</strong><small>Routed to the right team</small></div></div><div className="mini-step"><span>3</span><div><strong>Resolution</strong><small>Follow progress in your dashboard</small></div></div></div></div><div className="privacy-note"><ShieldCheck size={16} /><span><strong>Your privacy matters.</strong> Your personal details are only shared with staff handling this case.</span></div></aside></div>
  </section>;
}

function ComplaintDialog({ complaint, history, user, staff, onClose, onStatus, onAssign }) {
  const [remarks, setRemarks] = useState('');
  return <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="detail-dialog" role="dialog" aria-modal="true" aria-label={`Complaint ${complaint.complaintId}`}>
    <header className="dialog-header"><div><div className="eyebrow">CASE DETAILS</div><span className="case-id">{complaint.complaintId}</span></div><button className="icon-button" aria-label="Close details" onClick={onClose}><X size={18} /></button></header>
    <div className="dialog-body"><span className={statusClass(complaint.status)}><i />{complaint.status}</span><h2>{complaint.title}</h2>
      <div className="dialog-tags">
        <span>{complaint.category}</span>
        {complaint.department && (() => {
          const dStyle = getDeptStyle({ name: complaint.department });
          return <span style={{ backgroundColor: dStyle.bg, color: dStyle.color, borderColor: dStyle.border, borderWidth: 1, borderStyle: 'solid', fontWeight: 700, padding: '4px 8px', borderRadius: '4px' }}>{complaint.department}</span>;
        })()}
        <span className={`priority priority-${complaint.priority.toLowerCase()}`}><i />{complaint.priority} priority</span>
      </div>
      <p className="dialog-description">{complaint.description}</p>
      <div className="detail-facts"><div><small>SUBMITTED BY</small><strong>{complaint.studentName}</strong><span>{complaint.studentLoginId}</span></div><div><small>SUBMITTED</small><strong>{shortDate(complaint.createdAt)}</strong><span>Last updated {timeAgo(complaint.updatedAt)}</span></div><div><small>ASSIGNED TO</small><strong>{complaint.assignedStaff || 'Not assigned'}</strong><span>{complaint.department}</span></div></div>
      {(user.role === 'admin' || user.role === 'staff') && <div className="dialog-actions">{user.role === 'admin' && <label>Assign to<select value={complaint.assignedStaffId || ''} onChange={(event) => event.target.value && onAssign(complaint.complaintId, event.target.value)}><option value="" disabled>Choose staff member</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.fullName} · {person.department}</option>)}</select></label>}<label>Update status<select value={complaint.status} onChange={(event) => onStatus(complaint.complaintId, event.target.value, remarks)}>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></label><label className="remarks-input">Add a remark<textarea rows="2" placeholder="Add context for the student…" value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label></div>}
      {user.role === 'student' && complaint.status === 'Resolved' && <div className="dialog-actions"><label className="remarks-input">Provide Feedback & Close Case<textarea rows="2" placeholder="Share your feedback on how this concern was resolved…" value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label><button className="button-primary" onClick={() => onStatus(complaint.complaintId, 'Closed', remarks ? `Feedback: ${remarks}` : 'Resolved satisfactorily.')}><Check size={16} /> Accept Resolution & Close</button></div>}
      <div className="timeline-heading"><div><div className="eyebrow">AUDIT TRAIL</div><h3>Case history</h3></div><span>{history.length} {history.length === 1 ? 'event' : 'events'}</span></div>
      <div className="history-timeline">{history.map((entry, index) => <div className="history-event" key={`${entry.action}-${entry.createdAt}-${index}`}><span className={`history-dot ${index === 0 ? 'history-dot-first' : ''}`} /><div className="history-event-main"><div><strong>{entry.newStatus || entry.action}</strong><small>{entry.actorName}</small></div><time>{shortDate(entry.createdAt)}</time></div>{entry.remarks && <p>{entry.remarks}</p>}</div>)}</div>
    </div><footer className="dialog-footer"><span><ShieldCheck size={14} /> Changes are recorded in this case’s history.</span><button className="button-quiet" onClick={onClose}>Done</button></footer>
  </section></div>;
}

export default App;