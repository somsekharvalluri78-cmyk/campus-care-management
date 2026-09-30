import React, { useEffect, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookOpen, Check, ChevronDown,
  CircleHelp, ClipboardList, Clock3, FilePlus2, Filter, LayoutDashboard, LogOut, Menu,
  Search, Settings2, ShieldCheck, Sparkles, UserRound, Users, X,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api');
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
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
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

  async function submitComplaint(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const result = await request('/complaints', token, {
        method: 'POST',
        body: JSON.stringify({
          categoryId: Number(form.get('categoryId')),
          title: form.get('title'), description: form.get('description'), priority: form.get('priority'),
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
              {!isStaff && <button className="button-primary" onClick={() => setActiveView('submit')}><FilePlus2 size={16} /> New complaint</button>}
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

function LoginPage({ identifier, password, error, pending, onIdentifier, onPassword, onSubmit, onDemo, onRegister }) {
  const [mode, setMode] = useState('login');
  const [departments, setDepartments] = useState([]);
  const [departmentError, setDepartmentError] = useState('');
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
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
    if (values.get('password') !== values.get('confirmPassword')) {
      setFormError('The passwords do not match.');
      return;
    }
    setFormError('');
    onRegister({
      studentId: values.get('studentId'), fullName: values.get('fullName'), email: values.get('email'),
      departmentId: Number(values.get('departmentId')), year: Number(values.get('year')),
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
        <div className="registration-fields"><label>Department<select name="departmentId" defaultValue="" required disabled={departments.length === 0}><option value="" disabled>{departmentsLoading ? 'Loading departments…' : departments.length ? 'Choose department' : 'Unavailable'}</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label><label>Year<select name="year" defaultValue="" required><option value="" disabled>Choose year</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((year) => <option key={year} value={year}>{year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} year</option>)}</select></label></div>
        {departmentError && <div className="department-error" role="alert"><span>{departmentError}</span><button type="button" className="department-retry" onClick={loadDepartments} disabled={departmentsLoading}>{departmentsLoading ? 'Retrying…' : 'Retry'}</button></div>}
        <div className="registration-fields"><label>Section<input name="section" maxLength="20" placeholder="e.g. A" required /></label><label>Phone <span className="optional-label">OPTIONAL</span><input name="phone" type="tel" maxLength="30" autoComplete="tel" placeholder="Phone number" /></label></div>
        <div className="registration-fields"><label>Password<input name="password" type="password" autoComplete="new-password" minLength="10" maxLength="128" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,128}" title="Use at least 10 characters with uppercase, lowercase, and a number." required /></label><label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength="10" maxLength="128" required /></label></div>
        <p className="password-guidance">Use at least 10 characters, with uppercase and lowercase letters plus a number.</p>
        <p className="registration-notice">Use your official student ID. Email ownership and enrollment are not verified yet.</p>
        {(formError || error) && <div className="login-error" role="alert">{formError || error}</div>}
        <button className="button-primary login-submit" disabled={pending || departments.length === 0}>{pending ? 'Creating account…' : 'Create account'}<ArrowRight size={17} /></button>
      </form>}
      <div className="auth-switch">{mode === 'login' ? <>New to Campus Care? <button type="button" onClick={() => { setMode('register'); setFormError(''); }}>Create a student account</button></> : <>Already registered? <button type="button" onClick={() => { setMode('login'); setFormError(''); }}>Sign in instead</button></>}</div>
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
      <td><span className="case-id">{row.complaintId}</span></td><td><div className="case-title">{row.title}</div><div className="case-meta">{row.category}<span>·</span>{row.department}</div></td>{admin && <td><div className="student-cell">{row.studentName}<small>{row.studentLoginId}</small></div></td>}
      <td><span className={`priority priority-${row.priority.toLowerCase()}`}><i />{row.priority}</span></td><td><span className={statusClass(row.status)}><i />{row.status}</span></td><td className="updated-cell">{compact ? timeAgo(row.updatedAt) : shortDate(row.updatedAt)}</td>
      <td><button className="row-open" aria-label={`Open ${row.complaintId}`} onClick={(event) => { event.stopPropagation(); onOpen(row); }}><ArrowUpRight size={16} /></button></td>
    </tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-icon"><ClipboardList size={21} /></div><strong>{search ? 'No matching complaints' : 'No complaints to show'}</strong><p>{search ? 'Try another keyword or clear the status filter.' : staffUser ? 'New cases assigned to you will appear here.' : 'When you submit a complaint, it will appear here.'}</p></div>}
    {rows.length > 0 && (admin || staffUser) && !compact && <div className="table-footer"><span>Showing {rows.length} {rows.length === 1 ? 'case' : 'cases'}</span><span>Updated just now <span className="live-dot" /></span></div>}
  </div>;
}

function SubmitPage({ user, categories, onSubmit, onCancel }) {
  const [attachmentName, setAttachmentName] = useState('');
  return <section className="content-section submit-section"><div className="page-heading"><div><div className="eyebrow">STUDENT SUPPORT</div><h1>Tell us what’s happening</h1><p>Your concern goes to the right team. You can follow its progress from your dashboard.</p></div><button className="button-quiet" onClick={onCancel}>Cancel</button></div>
    <div className="form-layout"><form className="complaint-form" onSubmit={onSubmit}><div className="form-section-label"><span>01</span><div><strong>Your concern</strong><small>Give us enough detail to understand and help.</small></div></div>
      <div className="form-field-grid"><label>Category<select name="categoryId" required defaultValue=""><option value="" disabled>Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Priority<select name="priority" defaultValue="Medium"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label></div>
      <label>Complaint title<input name="title" minLength="5" maxLength="180" placeholder="A clear, short summary" required /></label><label>What happened?<textarea name="description" minLength="20" maxLength="5000" rows="5" placeholder="Share the details that will help us understand the situation…" required /><span className="field-hint">Include when and where it happened, and what you’ve already tried.</span></label>
      <div className="form-section-label form-section-second"><span>02</span><div><strong>Where should this go?</strong><small>We’ll route your concern to the right department.</small></div></div>
      <label>Your department<input value={user.department || 'Not assigned'} readOnly /></label>
      <div className="attachment-box"><label className="attachment-label"><span className="attachment-icon"><FilePlus2 size={17} /></span><span><strong>{attachmentName || 'Add a supporting file'}</strong><small>Optional · Attachments are not enabled in this demo</small></span><span className="attachment-browse">Browse</span><input type="file" accept="image/*,.pdf" disabled onChange={(event) => setAttachmentName(event.target.files?.[0]?.name || '')} /></label></div>
      <div className="form-footer"><span><ShieldCheck size={15} /> Only authorized college staff can view your submission.</span><button className="button-primary" type="submit">Submit complaint <ArrowRight size={16} /></button></div>
    </form><aside className="form-aside"><div className="aside-note"><div className="aside-note-icon"><Clock3 size={17} /></div><div className="eyebrow">WHAT HAPPENS NEXT</div><h3>Every step, accounted for.</h3><p>Your complaint receives a reference number and is added to a visible timeline as the team responds.</p><div className="mini-timeline"><div className="mini-step mini-step-active"><span><Check size={11} /></span><div><strong>Submitted</strong><small>We’ve received your report</small></div></div><div className="mini-step"><span>2</span><div><strong>Review</strong><small>Routed to the right team</small></div></div><div className="mini-step"><span>3</span><div><strong>Resolution</strong><small>Follow progress in your dashboard</small></div></div></div></div><div className="privacy-note"><ShieldCheck size={16} /><span><strong>Your privacy matters.</strong> Your personal details are only shared with staff handling this case.</span></div></aside></div>
  </section>;
}

function ComplaintDialog({ complaint, history, user, staff, onClose, onStatus, onAssign }) {
  const [remarks, setRemarks] = useState('');
  return <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="detail-dialog" role="dialog" aria-modal="true" aria-label={`Complaint ${complaint.complaintId}`}>
    <header className="dialog-header"><div><div className="eyebrow">CASE DETAILS</div><span className="case-id">{complaint.complaintId}</span></div><button className="icon-button" aria-label="Close details" onClick={onClose}><X size={18} /></button></header>
    <div className="dialog-body"><span className={statusClass(complaint.status)}><i />{complaint.status}</span><h2>{complaint.title}</h2><div className="dialog-tags"><span>{complaint.category}</span><span>{complaint.department}</span><span className={`priority priority-${complaint.priority.toLowerCase()}`}><i />{complaint.priority} priority</span></div><p className="dialog-description">{complaint.description}</p>
      <div className="detail-facts"><div><small>SUBMITTED BY</small><strong>{complaint.studentName}</strong><span>{complaint.studentLoginId}</span></div><div><small>SUBMITTED</small><strong>{shortDate(complaint.createdAt)}</strong><span>Last updated {timeAgo(complaint.updatedAt)}</span></div><div><small>ASSIGNED TO</small><strong>{complaint.assignedStaff || 'Not assigned'}</strong><span>{complaint.department}</span></div></div>
      {(user.role === 'admin' || user.role === 'staff') && <div className="dialog-actions">{user.role === 'admin' && <label>Assign to<select value={complaint.assignedStaffId || ''} onChange={(event) => event.target.value && onAssign(complaint.complaintId, event.target.value)}><option value="" disabled>Choose staff member</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.fullName} · {person.department}</option>)}</select></label>}<label>Update status<select value={complaint.status} onChange={(event) => onStatus(complaint.complaintId, event.target.value, remarks)}>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></label><label className="remarks-input">Add a remark<textarea rows="2" placeholder="Add context for the student…" value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label></div>}
      <div className="timeline-heading"><div><div className="eyebrow">AUDIT TRAIL</div><h3>Case history</h3></div><span>{history.length} {history.length === 1 ? 'event' : 'events'}</span></div>
      <div className="history-timeline">{history.map((entry, index) => <div className="history-event" key={`${entry.action}-${entry.createdAt}-${index}`}><span className={`history-dot ${index === 0 ? 'history-dot-first' : ''}`} /><div className="history-event-main"><div><strong>{entry.newStatus || entry.action}</strong><small>{entry.actorName}</small></div><time>{shortDate(entry.createdAt)}</time></div>{entry.remarks && <p>{entry.remarks}</p>}</div>)}</div>
    </div><footer className="dialog-footer"><span><ShieldCheck size={14} /> Changes are recorded in this case’s history.</span><button className="button-quiet" onClick={onClose}>Done</button></footer>
  </section></div>;
}

export default App;