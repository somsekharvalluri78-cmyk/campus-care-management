import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Activity, AlertTriangle, Archive, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen,
  Building2, Calendar, Check, ChevronDown, CircleHelp, ClipboardList, Clock, Clock3, Download, Eye,
  FilePlus2, Filter, Flame, HeartPulse, KeyRound, LayoutDashboard, Lock, LogOut, Menu,
  RotateCcw, Search, Settings2, ShieldAlert, ShieldCheck, Siren, Sparkles, Trash2, UserPen, UserRound, Users, X,
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
  const [allSubmittedComplaints, setAllSubmittedComplaints] = useState([]);
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
  const [contextMenu, setContextMenu] = useState(null);
  const [retractTarget, setRetractTarget] = useState(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [credentialsTab, setCredentialsTab] = useState('username');
  const profileMenuRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [profileMenuOpen]);

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
    if (user?.role === 'student') {
      try {
        const vaultData = await request('/complaints?scope=all', authToken);
        setAllSubmittedComplaints(vaultData.complaints || []);
      } catch (err) {
        console.warn('Personal vault refresh notice:', err);
      }
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
        const fetches = [
          request('/complaints', token),
          request('/categories', token),
          request('/notifications', token),
        ];
        if (profile.user.role === 'student') {
          fetches.push(request('/complaints?scope=all', token).catch(() => ({ complaints: [] })));
        }
        const [complaintData, categoryData, notificationData, vaultData] = await Promise.all(fetches);
        if (!alive) return;
        setComplaints(complaintData.complaints);
        setCategories(categoryData.categories);
        setNotifications(notificationData.notifications);
        if (vaultData?.complaints) {
          setAllSubmittedComplaints(vaultData.complaints);
        }
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

  function promptSignOut() {
    setProfileMenuOpen(false);
    setSignOutConfirmOpen(true);
  }

  function confirmSignOut() {
    localStorage.removeItem('campus-token');
    setToken(null);
    setUser(null);
    setSelected(null);
    setActiveView('overview');
    setStats(null);
    setComplaints([]);
    setAllSubmittedComplaints([]);
    setContextMenu(null);
    setRetractTarget(null);
    setPermanentDeleteTarget(null);
    setProfileMenuOpen(false);
    setSignOutConfirmOpen(false);
    setCredentialsModalOpen(false);
    // Crucial: Clear username and password completely so sign-in inputs are completely empty!
    setLoginIdentifier('');
    setLoginPassword('');
    setNotice('You have been signed out safely. Please enter your credentials to sign in.');
  }

  function signOut() {
    promptSignOut();
  }

  async function handleUpdateUsername({ currentUsername, newUsername }) {
    const result = await request('/auth/username', token, {
      method: 'PATCH',
      body: JSON.stringify({ currentUsername, newUsername }),
    });
    setUser(result.user);
    setNotice(result.message || 'Username successfully updated in database.');
    return result;
  }

  async function handleUpdatePassword({ currentPassword, newPassword }) {
    const result = await request('/auth/password', token, {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setNotice(result.message || 'Password successfully updated in database.');
    return result;
  }

  async function handleUpdateProfile(profileData) {
    const result = await request('/auth/profile', token, {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
    setUser(result.user);
    setNotice(result.message || 'Personal details successfully updated in database.');
    return result;
  }

  async function handleRetractComplaint(complaint) {
    if (!complaint?.complaintId) return;
    try {
      await request(`/complaints/${complaint.complaintId}`, token, { method: 'DELETE' });
      setNotice(`Complaint ${complaint.complaintId} retracted from desk. Safely saved in your Personal Storage.`);
      setRetractTarget(null);
      setContextMenu(null);
      if (selected?.complaintId === complaint.complaintId) {
        setSelected((prev) => prev ? { ...prev, isDeleted: true } : null);
      }
      await refreshData();
    } catch (err) {
      setError(err.message || 'Failed to retract complaint');
    }
  }

  async function handleRestoreComplaint(complaint) {
    if (!complaint?.complaintId) return;
    try {
      await request(`/complaints/${complaint.complaintId}/restore`, token, { method: 'POST' });
      setNotice(`Complaint ${complaint.complaintId} restored back to the active service desk.`);
      setContextMenu(null);
      if (selected?.complaintId === complaint.complaintId) {
        setSelected((prev) => prev ? { ...prev, isDeleted: false } : null);
      }
      await refreshData();
    } catch (err) {
      setError(err.message || 'Failed to restore complaint');
    }
  }

  async function handlePermanentDeleteComplaint(complaint) {
    if (!complaint?.complaintId) return;
    try {
      await request(`/complaints/${complaint.complaintId}/permanent`, token, { method: 'DELETE' });
      setNotice(`Complaint ${complaint.complaintId} permanently deleted. Record completely erased.`);
      setPermanentDeleteTarget(null);
      setContextMenu(null);
      if (selected?.complaintId === complaint.complaintId) {
        setSelected(null);
      }
      await refreshData();
    } catch (err) {
      setError(err.message || 'Failed to permanently delete complaint');
    }
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
      const payload = {
        categoryId: Number(form.get('categoryId')),
        title: form.get('title'),
        description: finalDescription,
        priority: form.get('priority') || 'Medium',
        collegeName: form.get('collegeName') || '',
        campusName: form.get('campusName') || '',
        complaintDate: form.get('complaintDate') || '',
        complaintTime: form.get('complaintTime') || '',
        blockName: form.get('blockName') || '',
        floorNumber: form.get('floorNumber') || '',
        roomNumber: form.get('roomNumber') || '',
        daysFacingProblem: form.get('daysFacingProblem') || '',
        problemAppearance: form.get('problemAppearance') || '',
        suggestions: form.get('suggestions') || '',
        membersAffected: form.get('membersAffected') || '',
        emergencyType: form.get('emergencyType') || '',
        collegeRegisterNo: form.get('collegeRegisterNo') || '',
      };
      const result = await request('/complaints', token, {
        method: 'POST',
        body: JSON.stringify(payload),
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
          <button className="profile-mini" onClick={promptSignOut} title="Sign out"><div className="avatar">{user.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="profile-mini-copy"><strong>{user.fullName}</strong><span>{user.designation || user.department || user.role}</span></div><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu-toggle" aria-label="Open navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu size={19} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeView === 'edit-profile' ? 'Edit Personal Details' : (navItems.find((item) => item.id === activeView)?.label || 'Overview')}</strong></div>
          <div className="topbar-actions"><span className="today-label">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</span>
            <button className={`icon-button notification-button ${notificationOpen ? 'icon-button-active' : ''}`} aria-label="Notifications" onClick={() => setNotificationOpen(!notificationOpen)}><Bell size={18} />{notifications.length > 0 && <i />}</button>
            <button
              type="button"
              className="topbar-signout-btn"
              onClick={promptSignOut}
              title="Sign out of account"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
            <div className="profile-menu-container" ref={profileMenuRef}>
              <button
                type="button"
                className={`topbar-user ${profileMenuOpen ? 'topbar-user-active' : ''}`}
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                title="Account profile & credentials"
              >
                <div className="avatar avatar-small">{user.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
                <ChevronDown size={14} style={{ transform: profileMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
              </button>
              {profileMenuOpen && (
                <div className="profile-menu-popover" role="menu">
                  <div className="profile-menu-header">
                    <div className="avatar avatar-small">{user.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
                    <div>
                      <strong>{user.fullName}</strong>
                      <small>{user.studentId || user.loginId || user.email}</small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="profile-menu-item"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setCredentialsTab('username');
                      setCredentialsModalOpen(true);
                    }}
                  >
                    <div className="profile-item-icon"><KeyRound size={16} /></div>
                    <div className="profile-item-copy">
                      <strong>Edit Sign-in Username & Password</strong>
                      <p>Update portal login identifier or account password</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="profile-menu-item"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setActiveView('edit-profile');
                    }}
                  >
                    <div className="profile-item-icon"><UserPen size={16} /></div>
                    <div className="profile-item-copy">
                      <strong>Edit Personal Details</strong>
                      <p>Update branch, semester, section & phone</p>
                    </div>
                  </button>
                  <div className="profile-menu-divider" />
                  <button
                    type="button"
                    className="profile-menu-item danger"
                    onClick={promptSignOut}
                  >
                    <div className="profile-item-icon"><LogOut size={16} /></div>
                    <div className="profile-item-copy">
                      <strong>Sign Out</strong>
                      <p>Exit your session safely</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
          {notificationOpen && <div className="notification-popover"><div className="popover-heading"><strong>Notifications</strong><span>{notifications.length} recent</span></div>{notifications.length ? notifications.slice(0, 5).map((item) => <div className="notification-row" key={item.id}><span className="notification-mark"><Bell size={14} /></span><div><strong>{item.title}</strong><p>{item.message}</p><small>{timeAgo(item.createdAt)}</small></div></div>) : <div className="notification-empty">You’re all caught up.</div>}</div>}
        </header>

        <div className="page-content">
          {(error || notice) && <div className={`toast ${error ? 'toast-error' : ''}`} role="status"><span>{error || notice}</span><button onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss"><X size={16} /></button></div>}
          {activeView === 'overview' && (
            <Overview
              user={user}
              stats={stats}
              complaints={complaints}
              allSubmittedComplaints={allSubmittedComplaints}
              onNew={() => setActiveView('submit')}
              onView={() => setActiveView('complaints')}
              onOpen={openComplaint}
              onContextMenu={(e, c) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, complaint: c });
              }}
              onRetract={(c) => setRetractTarget(c)}
              onRestore={handleRestoreComplaint}
              onPermanentDelete={(c) => setPermanentDeleteTarget(c)}
            />
          )}
          {activeView === 'complaints' && <section className="content-section">
            <div className="page-heading"><div><div className="eyebrow">{isAdmin ? 'SERVICE DESK' : isStaff ? 'YOUR WORK QUEUE' : 'YOUR RECORD'}</div><h1>{isAdmin ? 'All complaints' : isStaff ? 'Assigned cases' : 'My complaints'}<span className="heading-count">{complaints.length}</span></h1><p>Review cases, follow progress and keep every conversation in one place.</p></div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {isAdmin && <button className="button-quiet" onClick={exportCsv} title="Export complaints to CSV"><Download size={16} /> Export CSV</button>}
                {!isStaff && <button className="button-primary" onClick={() => setActiveView('submit')}><FilePlus2 size={16} /> New complaint</button>}
              </div>
            </div>
            <ComplaintTable
              rows={visibleComplaints}
              user={user}
              search={search}
              statusFilter={statusFilter}
              onSearch={setSearch}
              onFilter={setStatusFilter}
              onOpen={openComplaint}
              onStatus={updateStatus}
              onAssign={assignComplaint}
              staff={staff}
              onContextMenu={(e, c) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, complaint: c });
              }}
              onRetract={(c) => setRetractTarget(c)}
              onRestore={handleRestoreComplaint}
              onPermanentDelete={(c) => setPermanentDeleteTarget(c)}
            />
          </section>}
          {activeView === 'submit' && <SubmitPage user={user} categories={categories} onSubmit={submitComplaint} onCancel={() => setActiveView('overview')} />}
          {activeView === 'edit-profile' && (
            <EditPersonalDetailsPage
              user={user}
              onBack={() => setActiveView('overview')}
              onSave={handleUpdateProfile}
              onSignOut={promptSignOut}
            />
          )}
        </div>
        <footer className="page-footer"><span>Campus Care <span className="footer-dot">/</span> Student services portal</span><span>Private and secure <ShieldCheck size={13} /></span></footer>
      </main>

      {/* Floating Details Dialog */}
      {selected && (
        <ComplaintDialog
          complaint={selected}
          history={history}
          user={user}
          staff={staff}
          onClose={() => setSelected(null)}
          onStatus={updateStatus}
          onAssign={assignComplaint}
          onRetract={(c) => setRetractTarget(c)}
          onRestore={handleRestoreComplaint}
          onPermanentDelete={(c) => setPermanentDeleteTarget(c)}
        />
      )}

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <>
          <div
            className="context-menu-backdrop"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            className="complaint-context-menu"
            style={{
              top: Math.min(contextMenu.y, (window.innerHeight || 800) - 180),
              left: Math.min(contextMenu.x, (window.innerWidth || 1200) - 260),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="context-menu-header">
              <div className="context-menu-id">{contextMenu.complaint.complaintId}</div>
              <div className="context-menu-title">{contextMenu.complaint.title}</div>
            </div>
            <button
              className="context-menu-item"
              onClick={() => {
                const c = contextMenu.complaint;
                setContextMenu(null);
                openComplaint(c);
              }}
            >
              <Eye size={14} />
              <span>View Details</span>
            </button>
            {!contextMenu.complaint.isDeleted ? (
              <button
                className="context-menu-item danger"
                onClick={() => {
                  const c = contextMenu.complaint;
                  setContextMenu(null);
                  setRetractTarget(c);
                }}
              >
                <Trash2 size={14} />
                <span>Delete from Desk (Temporary)</span>
                <span className="context-menu-hint">Personal</span>
              </button>
            ) : (
              <>
                <button
                  className="context-menu-item restore"
                  onClick={() => {
                    const c = contextMenu.complaint;
                    setContextMenu(null);
                    handleRestoreComplaint(c);
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Restore to Desk</span>
                </button>
                <button
                  className="context-menu-item perm-danger"
                  onClick={() => {
                    const c = contextMenu.complaint;
                    setContextMenu(null);
                    setPermanentDeleteTarget(c);
                  }}
                >
                  <Trash2 size={14} />
                  <span>Permanently Delete</span>
                  <span className="context-menu-hint">Erase</span>
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Temporary Retract Confirmation Modal */}
      {retractTarget && (
        <div className="confirm-modal-backdrop" onClick={() => setRetractTarget(null)}>
          <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-top">
              <div className="confirm-icon-wrap confirm-icon-amber">
                <Archive size={22} />
              </div>
              <div className="confirm-modal-copy">
                <h3>Delete from Active Desk?</h3>
                <p>
                  This complaint will be removed from the active desk so that <strong>administrators and staff cannot see it</strong>.
                </p>
                <p style={{ marginTop: '6px' }}>
                  It will be stored in your <strong>Personal Storage</strong> (visible only to you under Overview), where you can restore it anytime or permanently delete it.
                </p>
                <div className="confirm-modal-ref">{retractTarget.complaintId}: {retractTarget.title}</div>
              </div>
            </div>
            <div className="confirm-modal-actions">
              <button className="button-quiet" onClick={() => setRetractTarget(null)}>Cancel</button>
              <button className="button-danger" style={{ background: '#e11d48', borderColor: '#be123c' }} onClick={() => handleRetractComplaint(retractTarget)}>
                <Trash2 size={14} /> Yes, Delete from Desk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {permanentDeleteTarget && (
        <div className="confirm-modal-backdrop" onClick={() => setPermanentDeleteTarget(null)}>
          <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-top">
              <div className="confirm-icon-wrap confirm-icon-red">
                <AlertTriangle size={22} />
              </div>
              <div className="confirm-modal-copy">
                <h3 style={{ color: '#dc2626' }}>Permanently Delete Complaint?</h3>
                <p style={{ color: '#b91c1c', fontWeight: 600 }}>
                  This action is 100% irreversible and permanent!
                </p>
                <p style={{ marginTop: '6px' }}>
                  The record and all audit events will be completely wiped from the database. It will <strong>NOT be shown anywhere</strong> — not on the desk, not in personal storage, and never to admins.
                </p>
                <div className="confirm-modal-ref" style={{ color: '#dc2626', background: '#fee2e2' }}>
                  {permanentDeleteTarget.complaintId}: {permanentDeleteTarget.title}
                </div>
              </div>
            </div>
            <div className="confirm-modal-actions">
              <button className="button-quiet" onClick={() => setPermanentDeleteTarget(null)}>Keep Complaint</button>
              <button className="button-danger" onClick={() => handlePermanentDeleteComplaint(permanentDeleteTarget)}>
                <Trash2 size={14} /> Permanently Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        isOpen={signOutConfirmOpen}
        onConfirm={confirmSignOut}
        onCancel={() => setSignOutConfirmOpen(false)}
      />

      {/* Edit Sign-in Credentials Modal (Username & Password) */}
      <CredentialsModal
        isOpen={credentialsModalOpen}
        user={user}
        initialTab={credentialsTab}
        onClose={() => setCredentialsModalOpen(false)}
        onSaveUsername={handleUpdateUsername}
        onSavePassword={handleUpdatePassword}
      />
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

  // 1. Computer Science & Engineering / Computer & IT -> RED with Space Grotesk (Tech/Code)
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
      fontFamily: "'Space Grotesk', sans-serif",
    };
  }

  // 2. Electrical & Electronics Engineering (EEE) -> BLUE with Plus Jakarta Sans (Precision Engineering)
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
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    };
  }

  // 3. Electronics & Communication (ECE) -> CYAN / TEAL with Syne (High Frequency & Signals)
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
      fontFamily: "'Syne', sans-serif",
    };
  }

  // 4. Mechanical & Related -> VIBRANT ORANGE with Outfit (Industrial Mechanical Power)
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
      fontFamily: "'Outfit', sans-serif",
    };
  }

  // 5. Civil & Architecture -> DEEP EMERALD GREEN with Manrope (Structural & Architectural Balance)
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
      fontFamily: "'Manrope', sans-serif",
    };
  }

  // 6. Science -> PURPLE with Epilogue (Inquiry & Research)
  if (category.includes('science') && !category.includes('computer')) {
    return {
      bg: '#faf5ff',
      color: '#9333ea',
      border: '#d8b4fe',
      badge: code || 'SCI',
      accent: '#7e22ce',
      fontFamily: "'Epilogue', sans-serif",
    };
  }

  // 7. Management (MBA, BBA) -> INDIGO with Plus Jakarta Sans (Executive Leadership)
  if (category.includes('management') || code.includes('MBA') || code.includes('BBA')) {
    return {
      bg: '#eef2ff',
      color: '#4f46e5',
      border: '#a5b4fc',
      badge: code || 'MGMT',
      accent: '#4338ca',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    };
  }

  // 8. Commerce & Business -> TEAL with Lexend (Fintech & Hyper-Readability)
  if (category.includes('commerce') || code.includes('BCOM') || code.includes('MCOM')) {
    return {
      bg: '#f0fdfa',
      color: '#0d9488',
      border: '#5eead4',
      badge: code || 'COMM',
      accent: '#0f766e',
      fontFamily: "'Lexend', sans-serif",
    };
  }

  // 9. Arts & Humanities -> ROSE with Fraunces (Literary & Creative Expression)
  if (category.includes('arts') || category.includes('humanities')) {
    return {
      bg: '#fff1f2',
      color: '#e11d48',
      border: '#fda4af',
      badge: code || 'ARTS',
      accent: '#be123c',
      fontFamily: "'Fraunces', serif",
    };
  }

  // 10. Law -> BURGUNDY with Fraunces (Judicial Gravitas & Legal Heritage)
  if (category.includes('law') || code.includes('LLB') || code.includes('LLM')) {
    return {
      bg: '#fdf2f8',
      color: '#be185d',
      border: '#fbcfe8',
      badge: code || 'LAW',
      accent: '#881337',
      fontFamily: "'Fraunces', serif",
    };
  }

  // 11. Pharmacy -> SKY BLUE with DM Sans (Clean Clinical Pharmacology)
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

  // 12. Agriculture -> OLIVE LIME with Lexend (Agronomy & Bio-sciences)
  if (category.includes('agriculture') || code.includes('AGRI')) {
    return {
      bg: '#f7fee7',
      color: '#65a30d',
      border: '#bef264',
      badge: code || 'AGRI',
      accent: '#4d7c0f',
      fontFamily: "'Lexend', sans-serif",
    };
  }

  // 13. Health & Allied -> CORAL PINK with Outfit (Vital Medical Healthcare)
  if (category.includes('health') || code.includes('NURS') || code.includes('BPT')) {
    return {
      bg: '#fff1f2',
      color: '#f43f5e',
      border: '#fecdd3',
      badge: code || 'HLTH',
      accent: '#e11d48',
      fontFamily: "'Outfit', sans-serif",
    };
  }

  // 14. Education -> WARM AMBER with Plus Jakarta Sans (Pedagogical Clarity)
  if (category.includes('education') || code.includes('BED') || code.includes('MED')) {
    return {
      bg: '#fffbeb',
      color: '#d97706',
      border: '#fcd34d',
      badge: code || 'EDU',
      accent: '#b45309',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    };
  }

  // 15. Fallback / Miscellaneous / Campus Services -> SLATE with DM Sans
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
              <span className="dept-selected-name" style={{ color: selectedStyle.color, fontWeight: 700, fontFamily: selectedStyle.fontFamily }}>
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
                        <span className="dept-option-name" style={{ color: isSelected ? style.accent : undefined, fontFamily: style.fontFamily, fontWeight: isSelected ? 700 : 600 }}>
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

function getDepartmentYearConfig(department) {
  if (!department) {
    return {
      totalYears: 4,
      programType: 'Academic Degree Program',
      years: [1, 2, 3, 4],
    };
  }

  const name = (department.name || '').toLowerCase();
  const code = (department.code || '').toUpperCase();
  const cat = (department.category || '').toLowerCase();

  // 1. Pharm.D (6 Years)
  if (code === 'PHARMD' || name.includes('pharm.d') || name.includes('doctor of pharmacy')) {
    return {
      totalYears: 6,
      programType: '6-Year Professional Doctorate Program',
      years: [1, 2, 3, 4, 5, 6],
    };
  }

  // 2. 5-Year Integrated Law, Ph.D, Architecture
  if (
    name.includes('5 year') ||
    name.includes('5-year') ||
    code === 'BALLB' ||
    code === 'BBALLB' ||
    code === 'BCOMLLB' ||
    code === 'INT-LAW' ||
    code === 'PHD-ED' ||
    name.includes('ph.d') ||
    name.includes('integrated law') ||
    (cat.includes('law') && (name.includes('ba llb') || name.includes('bba llb') || name.includes('b.com llb')))
  ) {
    return {
      totalYears: 5,
      programType: name.includes('ph.d') ? '5-Year Doctoral Research Program' : '5-Year Integrated Professional Degree',
      years: [1, 2, 3, 4, 5],
    };
  }

  // 3. 2-Year Programs: M.Tech, M.Sc, M.A, M.Com, MBA, MCA, M.Pharm, M.Ed, B.Ed, D.Pharm, D.El.Ed, MPT, M.Arch, PGDM, M.Phil
  if (
    name.startsWith('m.tech') ||
    code.startsWith('MTECH') ||
    name.startsWith('m.sc') ||
    code.startsWith('MSC') ||
    name.startsWith('ma ') ||
    name.startsWith('m.a') ||
    code.startsWith('MA-') ||
    name.startsWith('m.com') ||
    code.startsWith('MCOM') ||
    code === 'MBA' ||
    code === 'MBA-SPEC' ||
    code === 'EXEC-MBA' ||
    code === 'PGDM' ||
    code === 'MCA' ||
    name.includes('mca') ||
    name.includes('mba') ||
    name.includes('pgdm') ||
    name.startsWith('m.pharm') ||
    code.startsWith('MPHARM') ||
    code === 'DPHARM' ||
    name.startsWith('d.pharm') ||
    code === 'BED' ||
    name.startsWith('b.ed') ||
    code === 'MED' ||
    name.startsWith('m.ed') ||
    code === 'DELED' ||
    name.startsWith('d.el.ed') ||
    code === 'MPHIL-ED' ||
    code === 'MPT' ||
    code === 'MARCH' ||
    name.includes('m.arch') ||
    name.includes('master')
  ) {
    return {
      totalYears: 2,
      programType: code === 'DPHARM' || code === 'DELED' ? '2-Year Diploma Program' : code === 'BED' ? '2-Year Bachelor of Education' : '2-Year Post-Graduate (PG) Program',
      years: [1, 2],
    };
  }

  // 4. 4-Year Programs: B.Tech, B.E., Engineering, B.Pharm, B.Sc Agriculture/Horticulture/Forestry, B.Sc Nursing, BPT, B.El.Ed, Hotel Management
  if (
    cat.includes('engineering') ||
    cat.includes('electrical') ||
    cat.includes('electronics') ||
    cat.includes('mechanical') ||
    cat.includes('civil') ||
    name.includes('engineering') ||
    name.includes('b.tech') ||
    code === 'BPHARM' ||
    name.includes('b.pharm') ||
    code === 'BELED' ||
    name.includes('b.el.ed') ||
    code === 'NURS-BSC' ||
    name.includes('b.sc. nursing') ||
    code === 'BPT' ||
    name.includes('physiotherapy') ||
    code === 'HOTEL-MGMT' ||
    name.includes('hotel management') ||
    (cat.includes('agriculture') && name.startsWith('b.sc')) ||
    code.startsWith('AGRI-') ||
    code === 'BSC-AGRI' ||
    code === 'BSC-HORT' ||
    code === 'BSC-FOR' ||
    code === 'BSC-FISH' ||
    code === 'BSC-SERI'
  ) {
    return {
      totalYears: 4,
      programType: '4-Year Professional Degree Program',
      years: [1, 2, 3, 4],
    };
  }

  // 5. 3-Year Programs: Standard B.Sc, B.A, B.Com, BBA, BCA, LLB (3-Year), GNM, Allied Health, Design, Animation, Diplomas
  return {
    totalYears: 3,
    programType: code === 'LLB' ? '3-Year Bachelor of Law' : '3-Year Under-Graduate (UG) Program',
    years: [1, 2, 3],
  };
}

const YEAR_DETAILS = {
  1: {
    badge: 'YEAR 1',
    bg: '#f0f9ff',
    color: '#0284c7',
    border: '#bae6fd',
    title: '1st Year',
    sub: 'Fresher • Initial Enrollment & Foundations',
    fontFamily: "'Lexend', sans-serif",
    badgeFont: "'Space Grotesk', monospace",
  },
  2: {
    badge: 'YEAR 2',
    bg: '#eef2ff',
    color: '#6366f1',
    border: '#c7d2fe',
    title: '2nd Year',
    sub: 'Sophomore • Core Domain Coursework',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    badgeFont: "'Space Grotesk', monospace",
  },
  3: {
    badge: 'YEAR 3',
    bg: '#fffbeb',
    color: '#d97706',
    border: '#fde68a',
    title: '3rd Year',
    sub: 'Pre-Final • Advanced Projects & Labs',
    fontFamily: "'Outfit', sans-serif",
    badgeFont: "'Space Grotesk', monospace",
  },
  4: {
    badge: 'YEAR 4',
    bg: '#f0fdf4',
    color: '#16a34a',
    border: '#bbf7d0',
    title: '4th Year',
    sub: 'Final Year • Capstone & Campus Placements',
    fontFamily: "'Syne', sans-serif",
    badgeFont: "'Space Grotesk', monospace",
  },
  5: {
    badge: 'YEAR 5',
    bg: '#faf5ff',
    color: '#9333ea',
    border: '#e9d5ff',
    title: '5th Year',
    sub: 'Finalist • Integrated Professional Practice',
    fontFamily: "'Epilogue', sans-serif",
    badgeFont: "'Space Grotesk', monospace",
  },
  6: {
    badge: 'YEAR 6',
    bg: '#fff1f2',
    color: '#e11d48',
    border: '#fecdd3',
    title: '6th Year',
    sub: 'Doctoral Residency • Hospital Internship',
    fontFamily: "'Fraunces', serif",
    badgeFont: "'Space Grotesk', monospace",
  },
};

function getYearSuffix(y) {
  if (y === 1) return '1st';
  if (y === 2) return '2nd';
  if (y === 3) return '3rd';
  return `${y}th`;
}

function YearSelect({
  value,
  semester = 1,
  onChangeYear,
  onChangeSemester,
  department,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const yearConfig = useMemo(() => getDepartmentYearConfig(department), [department]);
  const hasDepartment = Boolean(department);

  const selectedYear = Number(value) || null;
  const selectedSemester = Number(semester) || 1;
  const selectedDetail = selectedYear ? YEAR_DETAILS[selectedYear] : null;

  // Track which year is expanded in the dropdown accordion.
  // Default to the selected year or the first year of the course.
  const [expandedYear, setExpandedYear] = useState(() => selectedYear || (yearConfig.years[0] ?? 1));

  useEffect(() => {
    if (selectedYear) {
      setExpandedYear(selectedYear);
    } else if (yearConfig.years.length > 0) {
      setExpandedYear(yearConfig.years[0]);
    }
  }, [selectedYear, yearConfig]);

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

  function handleSelectSemester(y, s) {
    if (onChangeYear) onChangeYear(y);
    if (onChangeSemester) onChangeSemester(s);
    setIsOpen(false);
  }

  function handleToggleYearAccordion(y) {
    setExpandedYear((prev) => (prev === y ? null : y));
  }

  const selectedCumulativeSem = selectedYear ? (selectedYear - 1) * 2 + selectedSemester : null;

  return (
    <div
      className={`year-select-wrap ${isOpen ? 'year-select-open' : ''}`}
      ref={containerRef}
    >
      <button
        type="button"
        className={`year-select-trigger ${!hasDepartment || disabled ? 'disabled' : ''}`}
        onClick={() => hasDepartment && !disabled && setIsOpen(!isOpen)}
        disabled={!hasDepartment || disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="year-selected-content">
          {selectedYear && selectedDetail ? (
            <>
              <span
                className="year-badge"
                style={{
                  backgroundColor: selectedDetail.bg,
                  color: selectedDetail.color,
                  borderColor: selectedDetail.border,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  fontFamily: selectedDetail.badgeFont || "'Space Grotesk', monospace",
                  fontWeight: 800,
                  letterSpacing: '0.4px',
                }}
              >
                {selectedDetail.badge} • SEM {selectedSemester}
              </span>
              <span className="year-selected-name" style={{ fontFamily: selectedDetail.fontFamily, fontWeight: 700 }}>
                {selectedDetail.title} • {selectedSemester === 1 ? '1st Sem' : '2nd Sem'} <small style={{ color: '#64748b', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>(Sem {selectedCumulativeSem})</small>
              </span>
            </>
          ) : (
            <span className="year-placeholder">
              {!hasDepartment ? 'Select department first' : `Choose year & semester (${yearConfig.totalYears} years)`}
            </span>
          )}
        </div>
        <ChevronDown
          size={15}
          style={{
            opacity: hasDepartment ? 0.7 : 0.4,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform .15s',
          }}
        />
      </button>

      {isOpen && (
        <div className="year-dropdown-panel" role="listbox">
          <div className="year-panel-header">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', fontFamily: "'Outfit', sans-serif" }}>
                Academic Year & Semester Selection
              </span>
              <span style={{ fontSize: 9.5, color: '#64748b' }}>
                Each year splits into 1st & 2nd semester
              </span>
            </div>
            <span className="year-program-tag" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {yearConfig.totalYears} Years • {yearConfig.totalYears * 2} Sems
            </span>
          </div>

          <div className="year-options-list">
            {yearConfig.years.map((y) => {
              const detail = YEAR_DETAILS[y] || {
                badge: `YEAR ${y}`,
                bg: '#f1f5f9',
                color: '#475569',
                border: '#cbd5e1',
                title: `${y}${getYearSuffix(y)} Year`,
                sub: `Academic Year ${y}`,
                fontFamily: "'Outfit', sans-serif",
                badgeFont: "'Space Grotesk', monospace",
              };
              const isExpanded = expandedYear === y;
              const isThisYearSelected = selectedYear === y;
              const semA = (y - 1) * 2 + 1;
              const semB = (y - 1) * 2 + 2;
              const isSem1Selected = isThisYearSelected && selectedSemester === 1;
              const isSem2Selected = isThisYearSelected && selectedSemester === 2;

              return (
                <div
                  key={y}
                  className={`year-accordion-item ${isExpanded ? 'active' : ''}`}
                  style={{
                    borderColor: isThisYearSelected ? detail.border : undefined,
                  }}
                >
                  <button
                    type="button"
                    className="year-accordion-trigger"
                    onClick={() => handleToggleYearAccordion(y)}
                    aria-expanded={isExpanded}
                  >
                    <span
                      className="year-badge"
                      style={{
                        backgroundColor: detail.bg,
                        color: detail.color,
                        borderColor: detail.border,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        fontFamily: detail.badgeFont || "'Space Grotesk', monospace",
                        fontWeight: 800,
                      }}
                    >
                      {detail.badge}
                    </span>
                    <div className="year-option-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          className="year-option-title"
                          style={{ color: isThisYearSelected ? detail.color : '#0f172a', fontFamily: detail.fontFamily, fontWeight: 700 }}
                        >
                          {detail.title}
                        </span>
                        {isThisYearSelected && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: detail.color,
                              background: detail.bg,
                              border: `1px solid ${detail.border}`,
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontFamily: "'Space Grotesk', sans-serif",
                            }}
                          >
                            {selectedSemester === 1 ? '1st Sem' : '2nd Sem'} (Sem {selectedCumulativeSem})
                          </span>
                        )}
                      </div>
                      <span className="year-option-sub" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {detail.sub}
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      style={{
                        marginLeft: 'auto',
                        color: '#64748b',
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  </button>

                  {isExpanded && (
                    <div className="year-semesters-drawer">
                      <div style={{ padding: '2px 4px 4px', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                        Choose semester for {detail.title}:
                      </div>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSem1Selected}
                        className={`sem-split-btn ${isSem1Selected ? 'selected' : ''}`}
                        onClick={() => handleSelectSemester(y, 1)}
                        style={{
                          borderColor: isSem1Selected ? detail.color : undefined,
                          backgroundColor: isSem1Selected ? detail.bg : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className="sem-pill-badge"
                            style={{
                              backgroundColor: detail.bg,
                              color: detail.color,
                              border: `1px solid ${detail.border}`,
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            SEM {semA}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isSem1Selected ? detail.color : '#1e293b', fontFamily: detail.fontFamily }}>
                              {detail.title} • 1st Semester
                            </span>
                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              Odd Semester (Autumn Session)
                            </span>
                          </div>
                        </div>
                        {isSem1Selected ? (
                          <Check size={14} style={{ color: detail.color }} />
                        ) : (
                          <ArrowRight size={13} style={{ color: '#94a3b8' }} />
                        )}
                      </button>

                      <button
                        type="button"
                        role="option"
                        aria-selected={isSem2Selected}
                        className={`sem-split-btn ${isSem2Selected ? 'selected' : ''}`}
                        onClick={() => handleSelectSemester(y, 2)}
                        style={{
                          borderColor: isSem2Selected ? detail.color : undefined,
                          backgroundColor: isSem2Selected ? detail.bg : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className="sem-pill-badge"
                            style={{
                              backgroundColor: detail.bg,
                              color: detail.color,
                              border: `1px solid ${detail.border}`,
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            SEM {semB}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isSem2Selected ? detail.color : '#1e293b', fontFamily: detail.fontFamily }}>
                              {detail.title} • 2nd Semester
                            </span>
                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              Even Semester (Spring Session)
                            </span>
                          </div>
                        </div>
                        {isSem2Selected ? (
                          <Check size={14} style={{ color: detail.color }} />
                        ) : (
                          <ArrowRight size={13} style={{ color: '#94a3b8' }} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [formError, setFormError] = useState('');

  const selectedDept = useMemo(() => {
    return departments.find((d) => String(d.id) === String(selectedDepartmentId));
  }, [departments, selectedDepartmentId]);

  useEffect(() => {
    if (selectedDept) {
      const config = getDepartmentYearConfig(selectedDept);
      if (selectedYear && !config.years.includes(Number(selectedYear))) {
        setSelectedYear('');
        setSelectedSemester(1);
      }
    } else {
      setSelectedYear('');
      setSelectedSemester(1);
    }
  }, [selectedDept]);

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
    const yr = selectedYear || values.get('year');
    const sem = selectedSemester || values.get('semester') || 1;
    if (!deptId) {
      setFormError('Please choose your college department.');
      return;
    }
    if (!yr) {
      setFormError('Please choose your academic year.');
      return;
    }
    if (values.get('password') !== values.get('confirmPassword')) {
      setFormError('The passwords do not match.');
      return;
    }
    setFormError('');
    onRegister({
      studentId: values.get('studentId'), fullName: values.get('fullName'), email: values.get('email'),
      departmentId: Number(deptId), year: Number(yr), semester: Number(sem),
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
          <label style={{ position: 'relative' }}>Year & Semester
            <YearSelect
              value={selectedYear}
              semester={selectedSemester}
              onChangeYear={setSelectedYear}
              onChangeSemester={setSelectedSemester}
              department={selectedDept}
              disabled={!selectedDept}
            />
            <input type="hidden" name="year" value={selectedYear || ''} required />
            <input type="hidden" name="semester" value={selectedSemester || 1} required />
            {selectedYear && (
              <div className="sem-switcher-row">
                <span className="sem-switcher-label" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>SEMESTER:</span>
                <button
                  type="button"
                  className={`sem-toggle-btn ${selectedSemester === 1 ? 'active' : ''}`}
                  onClick={() => setSelectedSemester(1)}
                  title="Switch to 1st Semester"
                  style={{ fontFamily: (YEAR_DETAILS[Number(selectedYear)]?.fontFamily) || "'Plus Jakarta Sans', sans-serif" }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>✦</span> {getYearSuffix(Number(selectedYear))} Year 1st Sem
                </button>
                <button
                  type="button"
                  className={`sem-toggle-btn ${selectedSemester === 2 ? 'active' : ''}`}
                  onClick={() => setSelectedSemester(2)}
                  title="Switch to 2nd Semester"
                  style={{ fontFamily: (YEAR_DETAILS[Number(selectedYear)]?.fontFamily) || "'Plus Jakarta Sans', sans-serif" }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>✦</span> {getYearSuffix(Number(selectedYear))} Year 2nd Sem
                </button>
              </div>
            )}
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
      <div className="auth-switch">{mode === 'login' ? <>New to Campus Care? <button type="button" onClick={() => { setMode('register'); setFormError(''); setSelectedDepartmentId(''); setSelectedYear(''); setSelectedSemester(1); }}>Create a student account</button></> : <>Already registered? <button type="button" onClick={() => { setMode('login'); setFormError(''); setSelectedDepartmentId(''); setSelectedYear(''); setSelectedSemester(1); }}>Sign in instead</button></>}</div>
      {mode === 'login' && import.meta.env.DEV && <><div className="demo-divider"><span /> QUICK DEMO ACCESS <span /></div><div className="demo-accounts">{DEMO_ACCOUNTS.map(({ label, identifier: demoId, icon: Icon }) => <button key={label} onClick={() => onDemo(demoId)} className="demo-account"><Icon size={17} /><span><strong>{label}</strong><small>{demoId}</small></span><ArrowUpRight size={14} className="demo-arrow" /></button>)}</div></>}
      <div className="login-security"><ShieldCheck size={15} /> Your information is only visible to authorized staff.</div>
    </div><div className="login-form-footer">© 2026 Northfield College <span>•</span> Student support, made simple</div></section>
  </main>;
}

function Overview({
  user,
  stats,
  complaints,
  allSubmittedComplaints = [],
  onNew,
  onView,
  onOpen,
  onContextMenu,
  onRetract,
  onRestore,
  onPermanentDelete,
}) {
  const isAdmin = user.role === 'admin';
  const isStaff = user.role === 'staff';
  const isStudent = user.role === 'student';
  const cards = isAdmin
    ? [{ label: 'Total students', value: stats?.peopleCount ?? '—', icon: Users, tone: 'sage', change: 'ACTIVE ACCOUNTS' }, { label: 'Total complaints', value: stats?.total ?? 0, icon: ClipboardList, tone: 'blue', change: 'ALL TIME' }, { label: 'Needs attention', value: stats?.pending ?? 0, icon: Clock3, tone: 'amber', change: 'PENDING REVIEW' }, { label: 'Critical cases', value: stats?.critical ?? 0, icon: Activity, tone: 'rose', change: 'HIGH PRIORITY' }]
    : isStaff
      ? [{ label: 'Assigned cases', value: stats?.total ?? 0, icon: ClipboardList, tone: 'sage', change: 'IN YOUR QUEUE' }, { label: 'New cases', value: stats?.pending ?? 0, icon: Sparkles, tone: 'amber', change: 'NEEDS A LOOK' }, { label: 'In progress', value: stats?.in_progress ?? 0, icon: Activity, tone: 'blue', change: 'BEING HANDLED' }, { label: 'Resolved', value: stats?.resolved ?? 0, icon: Check, tone: 'mint', change: 'THIS PERIOD' }]
      : [{ label: 'All complaints', value: stats?.total ?? 0, icon: ClipboardList, tone: 'sage', change: 'SUBMITTED BY YOU' }, { label: 'Under review', value: stats?.pending ?? 0, icon: Clock3, tone: 'amber', change: 'WE’RE ON IT' }, { label: 'In progress', value: stats?.in_progress ?? 0, icon: Activity, tone: 'blue', change: 'BEING HANDLED' }, { label: 'Resolved', value: (stats?.resolved ?? 0) + (stats?.closed ?? 0), icon: Check, tone: 'mint', change: 'COMPLETED' }];
  const firstName = user.fullName.split(' ')[0];
  const openCount = stats?.pending ?? 0;

  const [vaultTab, setVaultTab] = useState('all');
  const [vaultSearch, setVaultSearch] = useState('');

  const activeVaultCount = allSubmittedComplaints.filter((c) => !c.isDeleted).length;
  const retractedVaultCount = allSubmittedComplaints.filter((c) => c.isDeleted).length;

  const displayedVaultComplaints = allSubmittedComplaints.filter((item) => {
    if (vaultTab === 'active' && item.isDeleted) return false;
    if (vaultTab === 'retracted' && !item.isDeleted) return false;
    if (vaultSearch.trim()) {
      const q = vaultSearch.toLowerCase();
      const match = `${item.complaintId} ${item.title} ${item.category} ${item.department || ''} ${item.status}`.toLowerCase();
      return match.includes(q);
    }
    return true;
  });

  return (
    <section className="content-section overview-section">
      <div className="welcome-banner">
        <div>
          <div className="eyebrow eyebrow-light"><span /> YOUR CAMPUS, IN GOOD HANDS</div>
          <h1>{isAdmin ? 'Good morning' : isStaff ? 'Good to see you' : 'Hello'}, {firstName}<span className="wave">.</span></h1>
          <p>{isAdmin ? 'Here’s what’s happening across your service desk today.' : isStaff ? 'Here’s a clear view of the cases on your desk.' : 'Here’s the latest on what you’ve shared with us.'}</p>
        </div>
        <div className="welcome-side">
          <div className="welcome-side-icon"><Sparkles size={19} /></div>
          <span>{openCount === 0 ? 'All caught up' : `${openCount} ${openCount === 1 ? 'item' : 'items'} need attention`}</span>
          <div className="welcome-progress"><i style={{ width: `${Math.max(18, 100 - openCount * 9)}%` }} /></div>
          <small>YOUR SERVICE SNAPSHOT</small>
        </div>
        <div className="banner-doodle doodle-a" />
        <div className="banner-doodle doodle-b" />
      </div>

      <div className="stats-grid">
        {cards.map(({ label, value, icon: Icon, tone, change }, index) => (
          <article className={`stat-card stat-${tone}`} key={label}>
            <div className="stat-card-top"><span>{label}</span><span className="stat-icon"><Icon size={17} /></span></div>
            <div className="stat-number">{value}</div>
            <div className="stat-foot">
              <span className="stat-trend">{index === 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{change}</span>
              <span className="stat-period">2026</span>
            </div>
          </article>
        ))}
      </div>

      {/* Recent activity */}
      <div className="section-heading-row">
        <div>
          <div className="eyebrow">THE LATEST</div>
          <h2>Recent activity</h2>
        </div>
        <button className="text-button view-all" onClick={onView}>View all <ArrowRight size={15} /></button>
      </div>
      <ComplaintTable
        rows={complaints.slice(0, 5)}
        user={user}
        compact
        onOpen={onOpen}
        onContextMenu={onContextMenu}
        onRetract={onRetract}
        onRestore={onRestore}
        onPermanentDelete={onPermanentDelete}
      />

      {/* STUDENT PERSONAL STORAGE VAULT */}
      {isStudent && (
        <article className="personal-vault-card">
          <header className="vault-header-strip">
            <div className="vault-header-title">
              <div className="vault-icon-badge">
                <Lock size={17} />
              </div>
              <div className="vault-title-text">
                <h3>
                  Personal Storage • All Submitted Complaints
                  <span className="tag" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '11px', padding: '1px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    {allSubmittedComplaints.length} Total
                  </span>
                </h3>
                <p>
                  Your private personal locker. Deleted complaints are saved here safely and cannot be viewed by college administrators or staff.
                </p>
              </div>
            </div>
            <span className="vault-privacy-chip">
              <ShieldCheck size={13} /> Visible Only To You
            </span>
          </header>

          <div className="vault-toolbar">
            <div className="vault-tabs">
              <button
                type="button"
                className={`vault-tab-btn ${vaultTab === 'all' ? 'active' : ''}`}
                onClick={() => setVaultTab('all')}
              >
                All Records ({allSubmittedComplaints.length})
              </button>
              <button
                type="button"
                className={`vault-tab-btn ${vaultTab === 'active' ? 'active' : ''}`}
                onClick={() => setVaultTab('active')}
              >
                Active on Desk ({activeVaultCount})
              </button>
              <button
                type="button"
                className={`vault-tab-btn ${vaultTab === 'retracted' ? 'active' : ''}`}
                onClick={() => setVaultTab('retracted')}
              >
                Retracted in Vault ({retractedVaultCount})
              </button>
            </div>
            <div className="table-search" style={{ maxWidth: '240px', margin: 0 }}>
              <Search size={14} />
              <input
                aria-label="Search personal storage"
                placeholder="Search personal storage…"
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
              />
            </div>
          </div>

          {displayedVaultComplaints.length ? (
            <div className="table-overflow">
              <table>
                <thead>
                  <tr>
                    <th>REFERENCE</th>
                    <th>COMPLAINT</th>
                    <th>STORAGE STATUS</th>
                    <th>PRIORITY</th>
                    <th>CASE STATUS</th>
                    <th>UPDATED</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedVaultComplaints.map((row) => (
                    <tr
                      key={row.complaintId}
                      onClick={() => onOpen(row)}
                      onContextMenu={(e) => onContextMenu?.(e, row)}
                      tabIndex="0"
                      onKeyDown={(event) => event.key === 'Enter' && onOpen(row)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td><span className="case-id">{row.complaintId}</span></td>
                      <td>
                        <div className="case-title">{row.title}</div>
                        <div className="case-meta">
                          {row.category}
                          <span>·</span>
                          {row.department && (() => {
                            const dStyle = getDeptStyle({ name: row.department });
                            return <span style={{ color: dStyle.accent, fontWeight: 700 }}>{row.department}</span>;
                          })()}
                        </div>
                      </td>
                      <td>
                        {row.isDeleted ? (
                          <span className="storage-badge storage-badge-retracted" title="Hidden from admin desk · Stored in personal vault">
                            <Archive size={10} /> RETRACTED IN VAULT
                          </span>
                        ) : (
                          <span className="storage-badge storage-badge-active" title="Visible on active college desk">
                            <Check size={10} /> ACTIVE ON DESK
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`priority priority-${row.priority.toLowerCase()}`}>
                          <i />{row.priority}
                        </span>
                      </td>
                      <td>
                        <span className={statusClass(row.status)}>
                          <i />{row.status}
                        </span>
                      </td>
                      <td className="updated-cell">{shortDate(row.updatedAt)}</td>
                      <td>
                        <div className="row-actions-cell" onClick={(e) => e.stopPropagation()}>
                          {!row.isDeleted ? (
                            <button
                              type="button"
                              className="row-action-btn row-retract-btn"
                              title="Delete from Desk (Temporary · Stored in Vault)"
                              onClick={(e) => { e.stopPropagation(); onRetract?.(row); }}
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="row-action-btn row-restore-btn"
                                title="Restore to Active Desk"
                                onClick={(e) => { e.stopPropagation(); onRestore?.(row); }}
                              >
                                <RotateCcw size={13} />
                              </button>
                              <button
                                type="button"
                                className="row-action-btn row-perm-delete-btn"
                                title="Permanently Delete Forever"
                                onClick={(e) => { e.stopPropagation(); onPermanentDelete?.(row); }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="row-action-btn"
                            title="Open complaint details"
                            onClick={(e) => { e.stopPropagation(); onOpen(row); }}
                          >
                            <ArrowUpRight size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '28px 16px' }}>
              <div className="empty-icon"><Lock size={18} /></div>
              <strong>No complaints found in this personal vault view</strong>
              <p>
                {vaultTab === 'retracted'
                  ? 'You have no retracted complaints. If you delete a complaint temporarily, it will be kept safe here.'
                  : 'Submitted complaints will be safely cataloged here for your personal record.'}
              </p>
            </div>
          )}

          <div className="vault-hint" style={{ padding: '9px 16px', background: '#fafafa', borderTop: '1px solid #f1f5f9' }}>
            <Sparkles size={13} />
            Tip: <strong>Right-click any complaint row</strong> to open the quick action menu. Temporarily deleted complaints are kept safe here and never shown to college admins.
          </div>
        </article>
      )}

      {!isStaff && (
        <button className="new-complaint-strip" onClick={onNew}>
          <span className="strip-icon"><FilePlus2 size={18} /></span>
          <span>
            <strong>Something on your mind?</strong>
            <small>Share a concern with the right people at Northfield.</small>
          </span>
          <span className="strip-action">Submit a complaint <ArrowRight size={15} /></span>
        </button>
      )}
    </section>
  );
}

function ComplaintTable({
  rows,
  user,
  compact = false,
  search = '',
  statusFilter = 'All statuses',
  onSearch,
  onFilter,
  onOpen,
  onStatus,
  onAssign,
  staff = [],
  onContextMenu,
  onRetract,
  onRestore,
  onPermanentDelete,
}) {
  const admin = user.role === 'admin';
  const staffUser = user.role === 'staff';
  const isStudent = user.role === 'student';

  return (
    <div className={`table-shell ${compact ? 'table-compact' : ''}`}>
      {!compact && (
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={16} />
            <input
              aria-label="Search complaints"
              placeholder="Search by ID, title or student"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
            />
          </div>
          <label className="filter-select">
            <Filter size={15} />
            <select aria-label="Filter by status" value={statusFilter} onChange={(event) => onFilter(event.target.value)}>
              <option>All statuses</option>
              {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
      )}
      {rows.length ? (
        <div className="table-overflow">
          <table>
            <thead>
              <tr>
                <th>REFERENCE</th>
                <th>COMPLAINT</th>
                {admin && <th>STUDENT</th>}
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>UPDATED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.complaintId}
                  onClick={() => onOpen(row)}
                  onContextMenu={(e) => onContextMenu?.(e, row)}
                  tabIndex="0"
                  onKeyDown={(event) => event.key === 'Enter' && onOpen(row)}
                  style={{ cursor: 'pointer' }}
                >
                  <td><span className="case-id">{row.complaintId}</span></td>
                  <td>
                    <div className="case-title">{row.title}</div>
                    <div className="case-meta">
                      {row.category}
                      <span>·</span>
                      {row.department && (() => {
                        const dStyle = getDeptStyle({ name: row.department });
                        return <span style={{ color: dStyle.accent, fontWeight: 700 }}>{row.department}</span>;
                      })()}
                    </div>
                  </td>
                  {admin && (
                    <td>
                      <div className="student-cell">
                        {row.studentName}
                        <small>{row.studentLoginId}</small>
                      </div>
                    </td>
                  )}
                  <td>
                    <span className={`priority priority-${row.priority.toLowerCase()}`}>
                      <i />{row.priority}
                    </span>
                  </td>
                  <td>
                    <span className={statusClass(row.status)}>
                      <i />{row.status}
                    </span>
                  </td>
                  <td className="updated-cell">{compact ? timeAgo(row.updatedAt) : shortDate(row.updatedAt)}</td>
                  <td>
                    <div className="row-actions-cell" onClick={(e) => e.stopPropagation()}>
                      {isStudent && (
                        !row.isDeleted ? (
                          <button
                            type="button"
                            className="row-action-btn row-retract-btn"
                            title="Delete from Desk (Temporary · Right-click enabled)"
                            onClick={(e) => { e.stopPropagation(); onRetract?.(row); }}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="row-action-btn row-restore-btn"
                              title="Restore to Desk"
                              onClick={(e) => { e.stopPropagation(); onRestore?.(row); }}
                            >
                              <RotateCcw size={13} />
                            </button>
                            <button
                              type="button"
                              className="row-action-btn row-perm-delete-btn"
                              title="Permanently Delete Forever"
                              onClick={(e) => { e.stopPropagation(); onPermanentDelete?.(row); }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )
                      )}
                      <button
                        type="button"
                        className="row-open"
                        aria-label={`Open ${row.complaintId}`}
                        onClick={(event) => { event.stopPropagation(); onOpen(row); }}
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><ClipboardList size={21} /></div>
          <strong>{search ? 'No matching complaints' : 'No complaints to show'}</strong>
          <p>
            {search
              ? 'Try another keyword or clear the status filter.'
              : staffUser
                ? 'New cases assigned to you will appear here.'
                : 'When you submit a complaint, it will appear here.'}
          </p>
        </div>
      )}
      {rows.length > 0 && (admin || staffUser) && !compact && (
        <div className="table-footer">
          <span>Showing {rows.length} {rows.length === 1 ? 'case' : 'cases'}</span>
          <span>Updated just now <span className="live-dot" /></span>
        </div>
      )}
    </div>
  );
}

function SubmitPage({ user, categories, onSubmit, onCancel }) {
  const [attachmentName, setAttachmentName] = useState('');
  const [selectedEmergency, setSelectedEmergency] = useState('');

  // Date default to today
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [complaintDate, setComplaintDate] = useState(todayStr);

  // Time: default locked sign-in time
  const defaultTimeStr = useMemo(() => {
    return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date());
  }, []);

  const defaultUsername = user.loginId || user.studentId || 'STUDENT';
  const defaultRegisterNo = user.studentId || '';

  return (
    <section className="content-section submit-section">
      <div className="page-heading">
        <div>
          <div className="eyebrow">STUDENT SUPPORT & INCIDENT REGISTRATION</div>
          <h1>Tell us what’s happening</h1>
          <p>Register your concern with detailed campus locations and incident tracking. Every field is securely logged.</p>
        </div>
        <button type="button" className="button-quiet" onClick={onCancel}>Cancel</button>
      </div>

      <div className="form-layout">
        <form className="complaint-form" onSubmit={(e) => onSubmit(e, attachmentName)}>

          {/* SECTION 1: IDENTITY & CAMPUS REGISTRATION */}
          <div className="form-section-label">
            <span>01</span>
            <div>
              <strong>Student & Campus Location Details</strong>
              <small>Identity, college, timing and exact location series</small>
            </div>
          </div>

          <div className="complaint-fields-series">
            {/* 1. Default Username (Locked) */}
            <div className="complaint-field-card c-field-username">
              <div className="complaint-field-top">
                <span className="f-label-title">Username (Default)</span>
                <span className="f-badge"><Lock size={12} /> Default • Uneditable</span>
              </div>
              <input
                name="usernameDisplay"
                value={defaultUsername}
                readOnly
                disabled
                className="f-input-manual"
                title="Username is locked to your authenticated login session."
              />
              <small style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#6366f1', fontFamily: "'Space Grotesk', monospace" }}>
                🔒 Locked to current student session — cannot be modified.
              </small>
            </div>

            {/* 2. College Register Number */}
            <div className="complaint-field-card c-field-regno">
              <div className="complaint-field-top">
                <span className="f-label-title">Enter your college register.no</span>
                <span className="f-badge">Roll / Reg No</span>
              </div>
              <input
                name="collegeRegisterNo"
                defaultValue={defaultRegisterNo}
                placeholder="Enter your college register / enrollment number"
                className="f-input-manual"
                required
              />
            </div>

            {/* 3. College Name (Manual unlimited) */}
            <div className="complaint-field-card c-field-college">
              <div className="complaint-field-top">
                <span className="f-label-title">Enter your college name clearly</span>
                <span className="f-badge">Institution</span>
              </div>
              <input
                name="collegeName"
                placeholder="Enter full college name (no character limit)"
                className="f-input-manual"
                defaultValue="Northfield College of Engineering & Technology"
                required
              />
            </div>

            {/* 4. Campus Name */}
            <div className="complaint-field-card c-field-campus">
              <div className="complaint-field-top">
                <span className="f-label-title">Enter your campus name</span>
                <span className="f-badge">Campus Zone</span>
              </div>
              <input
                name="campusName"
                placeholder="e.g. Northfield Main Campus, South Lake Campus, City Extension"
                className="f-input-manual"
                defaultValue="Northfield Main Campus"
                required
              />
            </div>

            {/* 5. Date with Calendar */}
            <div className="complaint-field-card c-field-date">
              <div className="complaint-field-top">
                <span className="f-label-title">Date</span>
                <span className="f-badge"><Calendar size={12} /> Interactive Calendar</span>
              </div>
              <input
                type="date"
                name="complaintDate"
                value={complaintDate}
                onChange={(e) => setComplaintDate(e.target.value)}
                className="f-input-manual"
                required
              />
              <small style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#047857', fontFamily: "'Lexend', sans-serif" }}>
                📅 Click field to open the full calendar picker.
              </small>
            </div>

            {/* 6. Time (Default Sign-in Timestamp - Non-editable) */}
            <div className="complaint-field-card c-field-time">
              <div className="complaint-field-top">
                <span className="f-label-title">Time</span>
                <span className="f-badge"><Clock size={12} /> Sign-in Logged • System Default</span>
              </div>
              <input
                name="complaintTime"
                value={defaultTimeStr}
                readOnly
                className="f-input-manual"
                title="System-captured sign-in time. Uneditable by any user."
              />
              <small style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#64748b', fontFamily: "'Space Mono', monospace" }}>
                ⏱ Captured from active sign-in session. Permanent & non-editable.
              </small>
            </div>

            {/* 7. Department */}
            <div className="complaint-field-card c-field-dept">
              <div className="complaint-field-top">
                <span className="f-label-title">Your Department</span>
                <span className="f-badge">Academic Division</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user.department && (() => {
                  const dStyle = getDeptStyle({ name: user.department });
                  return (
                    <span
                      className="dept-badge"
                      style={{
                        backgroundColor: dStyle.bg,
                        color: dStyle.color,
                        borderColor: dStyle.border,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        fontFamily: dStyle.fontFamily,
                      }}
                    >
                      {dStyle.badge}
                    </span>
                  );
                })()}
                <input
                  value={user.department || 'Computer Science & Engineering (CSE)'}
                  readOnly
                  className="f-input-manual"
                  style={{ flex: 1, background: '#fef3c7', color: '#92400e', fontWeight: 700, fontFamily: "'Syne', sans-serif" }}
                />
              </div>
            </div>

            {/* 8. Block Name */}
            <div className="complaint-field-card c-field-block">
              <div className="complaint-field-top">
                <span className="f-label-title">Enter your block name</span>
                <span className="f-badge"><Building2 size={12} /> Campus Block</span>
              </div>
              <input
                name="blockName"
                placeholder="e.g. Science & Tech Block, Ramanujan Bhavan, Hostel Block C"
                className="f-input-manual"
                required
              />
            </div>

            {/* 9. Floor Number in Selected Block */}
            <div className="complaint-field-card c-field-floor">
              <div className="complaint-field-top">
                <span className="f-label-title">Enter the floor number in the selected block</span>
                <span className="f-badge">Level</span>
              </div>
              <input
                name="floorNumber"
                placeholder="e.g. Ground Floor, 2nd Floor, 3rd Floor"
                className="f-input-manual"
                required
              />
            </div>

            {/* 10. Room No in Selected Floor */}
            <div className="complaint-field-card c-field-room">
              <div className="complaint-field-top">
                <span className="f-label-title">Enter your room no in a selected floor</span>
                <span className="f-badge">Room / Lab</span>
              </div>
              <input
                name="roomNumber"
                placeholder="e.g. Room 304, Computer Lab 2, Seminar Hall A"
                className="f-input-manual"
                required
              />
            </div>

            {/* 11. Days Facing Problem */}
            <div className="complaint-field-card c-field-days">
              <div className="complaint-field-top">
                <span className="f-label-title">From the how many days are facing with the problem?</span>
                <span className="f-badge">Duration</span>
              </div>
              <input
                name="daysFacingProblem"
                placeholder="e.g. 3 days, since last week, past 24 hours"
                className="f-input-manual"
                required
              />
            </div>

            {/* 12. How Does Problem Appear? */}
            <div className="complaint-field-card c-field-appearance">
              <div className="complaint-field-top">
                <span className="f-label-title">How does this problem appears?</span>
                <span className="f-badge">Appearance / Symptoms</span>
              </div>
              <textarea
                name="problemAppearance"
                rows="3"
                placeholder="Describe how and when this problem manifests (e.g. sparks flickering from electrical board, water clogging every evening, sudden connection drops during classes)…"
                className="f-input-manual"
                required
              />
            </div>

            {/* 13. Enter Your Suggestion */}
            <div className="complaint-field-card c-field-suggestions">
              <div className="complaint-field-top">
                <span className="f-label-title">Enter your suggestion?</span>
                <span className="f-badge">Student Suggestion</span>
              </div>
              <textarea
                name="suggestions"
                rows="3"
                placeholder="Provide your ideas or proposed suggestions to fix this concern…"
                className="f-input-manual"
              />
            </div>

            {/* 14. Members Suffered / Presently Suffering */}
            <div className="complaint-field-card c-field-members">
              <div className="complaint-field-top">
                <span className="f-label-title">How many members suffered / presently suffering from this complaint</span>
                <span className="f-badge"><Users size={12} /> Impact Count</span>
              </div>
              <input
                name="membersAffected"
                placeholder="e.g. Entire batch (approx 65 students), 4 hostel roommates, only myself"
                className="f-input-manual"
                required
              />
            </div>
          </div>

          {/* SECTION 2: EMERGENCY DISPATCH SELECTOR */}
          <div className="form-section-label form-section-second" style={{ marginTop: 24 }}>
            <span>02</span>
            <div>
              <strong>Emergency Dispatch & Services</strong>
              <small>Choose the option if there is an emergency complaint</small>
            </div>
          </div>

          <div className={`emergency-dispatch-panel ${selectedEmergency ? 'active' : ''}`}>
            <div className="emerg-header">
              <div className="emerg-header-title">
                <ShieldAlert size={20} color="#e11d48" />
                <span>Choose the option if there is an emergency complaint:</span>
              </div>
              {selectedEmergency ? (
                <span className="emerg-header-badge">
                  🚨 ACTIVE: {selectedEmergency.toUpperCase()}
                </span>
              ) : (
                <span style={{ fontSize: 11.5, color: '#64748b' }}>
                  Click one below if urgent dispatch needed
                </span>
              )}
            </div>

            <input type="hidden" name="emergencyType" value={selectedEmergency} />

            <div className="emerg-grid">
              {/* Option 1: Fire Engine */}
              <button
                type="button"
                className={`emerg-option-btn emerg-option-fire ${selectedEmergency === 'Fire Engine' ? 'selected' : ''}`}
                onClick={() => setSelectedEmergency((prev) => (prev === 'Fire Engine' ? '' : 'Fire Engine'))}
              >
                <div className="emerg-icon-wrap">
                  <Flame size={22} />
                </div>
                <span className="emerg-option-title">Fire Engine</span>
                <span className="emerg-option-sub">Fire breakout, electrical spark hazard or gas emergency</span>
              </button>

              {/* Option 2: Ambulance */}
              <button
                type="button"
                className={`emerg-option-btn emerg-option-ambulance ${selectedEmergency === 'Ambulance' ? 'selected' : ''}`}
                onClick={() => setSelectedEmergency((prev) => (prev === 'Ambulance' ? '' : 'Ambulance'))}
              >
                <div className="emerg-icon-wrap">
                  <HeartPulse size={22} />
                </div>
                <span className="emerg-option-title">Ambulance</span>
                <span className="emerg-option-sub">Critical injury, fainting, cardiac or medical urgency</span>
              </button>

              {/* Option 3: Third Aid Medical Kit (First Aid Kit) */}
              <button
                type="button"
                className={`emerg-option-btn emerg-option-firstaid ${selectedEmergency === 'First Aid Medical Kit' ? 'selected' : ''}`}
                onClick={() => setSelectedEmergency((prev) => (prev === 'First Aid Medical Kit' ? '' : 'First Aid Medical Kit'))}
              >
                <div className="emerg-icon-wrap">
                  <Activity size={22} />
                </div>
                <span className="emerg-option-title">Third Aid Medical Kit</span>
                <span className="emerg-option-sub">Campus clinic dispatch, cuts, burns, dressing & first aid</span>
              </button>

              {/* Option 4: Police */}
              <button
                type="button"
                className={`emerg-option-btn emerg-option-police ${selectedEmergency === 'Police' ? 'selected' : ''}`}
                onClick={() => setSelectedEmergency((prev) => (prev === 'Police' ? '' : 'Police'))}
              >
                <div className="emerg-icon-wrap">
                  <Siren size={22} />
                </div>
                <span className="emerg-option-title">Police</span>
                <span className="emerg-option-sub">Security threat, trespassing, physical safety & police dispatch</span>
              </button>
            </div>

            {selectedEmergency && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}>
                  ⚠️ Priority will automatically escalate to Critical for immediate team notification.
                </span>
                <button
                  type="button"
                  className="button-quiet"
                  style={{ fontSize: 11.5, padding: '4px 10px', height: 'auto' }}
                  onClick={() => setSelectedEmergency('')}
                >
                  Clear Emergency (Standard Case)
                </button>
              </div>
            )}
          </div>

          {/* SECTION 3: CORE COMPLAINT SUMMARY */}
          <div className="form-section-label form-section-second" style={{ marginTop: 24 }}>
            <span>03</span>
            <div>
              <strong>Complaint Classification & Summary</strong>
              <small>Category, title and thorough explanation</small>
            </div>
          </div>

          <div className="form-field-grid">
            <label>Category
              <select name="categoryId" required defaultValue="">
                <option value="" disabled>Choose a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label>Priority
              <select
                name="priority"
                value={selectedEmergency ? 'Critical' : undefined}
                defaultValue="Medium"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </label>
          </div>

          <label>Complaint title
            <input name="title" minLength={3} maxLength={180} placeholder="A clear, short summary" required />
          </label>

          <label>What happened?
            <textarea
              name="description"
              minLength={10}
              maxLength={5000}
              rows={4}
              placeholder="Share the details that will help us understand the situation…"
              required
            />
            <span className="field-hint">Include when and where it happened, and what you’ve already tried.</span>
          </label>

          <div className="attachment-box">
            <label className="attachment-label">
              <span className="attachment-icon"><FilePlus2 size={17} /></span>
              <span>
                <strong>{attachmentName || 'Add a supporting file'}</strong>
                <small>{attachmentName ? 'File attached' : 'Optional · PNG, JPG, or PDF (up to 5MB)'}</small>
              </span>
              <span className="attachment-browse">{attachmentName ? 'Change' : 'Browse'}</span>
              <input type="file" accept="image/*,.pdf" onChange={(event) => setAttachmentName(event.target.files?.[0]?.name || '')} />
            </label>
          </div>

          <div className="form-footer">
            <span><ShieldCheck size={15} /> Only authorized college staff can view your submission.</span>
            <button className="button-primary" type="submit">
              Submit complaint <ArrowRight size={16} />
            </button>
          </div>
        </form>

        <aside className="form-aside">
          <div className="aside-note">
            <div className="aside-note-icon"><Clock3 size={17} /></div>
            <div className="eyebrow">WHAT HAPPENS NEXT</div>
            <h3>Every step, accounted for.</h3>
            <p>Your complaint receives a reference number and is added to a visible timeline as the team responds.</p>
            <div className="mini-timeline">
              <div className="mini-step mini-step-active">
                <span><Check size={11} /></span>
                <div><strong>Submitted</strong><small>We’ve received your report</small></div>
              </div>
              <div className="mini-step">
                <span>2</span>
                <div><strong>Review</strong><small>Routed to the right team</small></div>
              </div>
              <div className="mini-step">
                <span>3</span>
                <div><strong>Resolution</strong><small>Follow progress in your dashboard</small></div>
              </div>
            </div>
          </div>
          <div className="privacy-note">
            <ShieldCheck size={16} />
            <span><strong>Your privacy matters.</strong> Your personal details are only shared with staff handling this case.</span>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ComplaintDialog({
  complaint,
  history,
  user,
  staff,
  onClose,
  onStatus,
  onAssign,
  onRetract,
  onRestore,
  onPermanentDelete,
}) {
  const [remarks, setRemarks] = useState('');
  const isStudent = user.role === 'student';

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="detail-dialog" role="dialog" aria-modal="true" aria-label={`Complaint ${complaint.complaintId}`}>
        <header className="dialog-header">
          <div>
            <div className="eyebrow">CASE DETAILS</div>
            <span className="case-id">{complaint.complaintId}</span>
          </div>
          <button className="icon-button" aria-label="Close details" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="dialog-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className={statusClass(complaint.status)}><i />{complaint.status}</span>
            {complaint.isDeleted && (
              <span className="storage-badge storage-badge-retracted" style={{ padding: '4px 9px', fontSize: '11px' }}>
                <Archive size={12} /> RETRACTED IN PERSONAL VAULT
              </span>
            )}
          </div>

          <h2>{complaint.title}</h2>
          <div className="dialog-tags">
            <span>{complaint.category}</span>
            {complaint.department && (() => {
              const dStyle = getDeptStyle({ name: complaint.department });
              return (
                <span style={{ backgroundColor: dStyle.bg, color: dStyle.color, borderColor: dStyle.border, borderWidth: 1, borderStyle: 'solid', fontWeight: 700, padding: '4px 8px', borderRadius: '4px' }}>
                  {complaint.department}
                </span>
              );
            })()}
            <span className={`priority priority-${complaint.priority.toLowerCase()}`}><i />{complaint.priority} priority</span>
          </div>

          {complaint.emergencyType && (
            <div
              className="dialog-emergency-banner"
              style={{
                background:
                  complaint.emergencyType === 'Fire Engine' ? '#fef2f2' :
                  complaint.emergencyType === 'Ambulance' ? '#fff1f2' :
                  complaint.emergencyType === 'First Aid Medical Kit' ? '#ecfdf5' : '#eff6ff',
                border: `1.5px solid ${
                  complaint.emergencyType === 'Fire Engine' ? '#dc2626' :
                  complaint.emergencyType === 'Ambulance' ? '#e11d48' :
                  complaint.emergencyType === 'First Aid Medical Kit' ? '#059669' : '#1d4ed8'
                }`,
                color:
                  complaint.emergencyType === 'Fire Engine' ? '#b91c1c' :
                  complaint.emergencyType === 'Ambulance' ? '#be123c' :
                  complaint.emergencyType === 'First Aid Medical Kit' ? '#047857' : '#1e40af',
              }}
            >
              {complaint.emergencyType === 'Fire Engine' && <Flame size={20} />}
              {complaint.emergencyType === 'Ambulance' && <HeartPulse size={20} />}
              {complaint.emergencyType === 'First Aid Medical Kit' && <Activity size={20} />}
              {complaint.emergencyType === 'Police' && <Siren size={20} />}
              <div>
                <strong>EMERGENCY DISPATCH: {complaint.emergencyType.toUpperCase()}</strong>
                <div style={{ fontSize: 11.5, opacity: 0.9 }}>
                  Emergency services alerted during incident submission.
                </div>
              </div>
            </div>
          )}

          {complaint.isDeleted && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', padding: '12px 14px', borderRadius: '8px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
              <Archive size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Retracted Complaint:</strong> This case was deleted from the active desk. It cannot be seen by college administrators or staff. It is preserved securely in your personal vault.
              </div>
            </div>
          )}

          <p className="dialog-description">{complaint.description}</p>

          {/* Location & Academic Details Card */}
          {(complaint.collegeName || complaint.campusName || complaint.blockName || complaint.floorNumber || complaint.roomNumber || complaint.daysFacingProblem || complaint.problemAppearance || complaint.suggestions || complaint.membersAffected || complaint.collegeRegisterNo) && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, margin: '14px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={14} /> Comprehensive Location & Incident Details
              </div>
              <div className="dialog-location-grid">
                {complaint.collegeName && (
                  <div className="dialog-location-cell" style={{ borderLeft: '3px solid #0284c7' }}>
                    <small style={{ color: '#0369a1', fontFamily: "'Outfit', sans-serif" }}>College Name</small>
                    <strong style={{ fontFamily: "'Outfit', sans-serif" }}>{complaint.collegeName}</strong>
                  </div>
                )}
                {complaint.campusName && (
                  <div className="dialog-location-cell" style={{ borderLeft: '3px solid #0d9488' }}>
                    <small style={{ color: '#0f766e', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Campus Name</small>
                    <strong style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{complaint.campusName}</strong>
                  </div>
                )}
                {(complaint.complaintDate || complaint.complaintTime) && (
                  <div className="dialog-location-cell" style={{ borderLeft: '3px solid #059669' }}>
                    <small style={{ color: '#047857', fontFamily: "'Lexend', sans-serif" }}>Date & Time</small>
                    <strong style={{ fontFamily: "'Space Mono', monospace" }}>
                      {complaint.complaintDate || 'Recorded'} {complaint.complaintTime ? `• ${complaint.complaintTime}` : ''}
                    </strong>
                  </div>
                )}
                {complaint.blockName && (
                  <div className="dialog-location-cell" style={{ borderLeft: '3px solid #ea580c' }}>
                    <small style={{ color: '#c2410c', fontFamily: "'Epilogue', sans-serif" }}>Block Name</small>
                    <strong style={{ fontFamily: "'Epilogue', sans-serif" }}>{complaint.blockName}</strong>
                  </div>
                )}
                {complaint.floorNumber && (
                  <div className="dialog-location-cell" style={{ borderLeft: '3px solid #0891b2' }}>
                    <small style={{ color: '#0e7490', fontFamily: "'DM Sans', sans-serif" }}>Floor Number</small>
                    <strong style={{ fontFamily: "'DM Sans', sans-serif" }}>{complaint.floorNumber}</strong>
                  </div>
                )}
                {complaint.roomNumber && (
                  <div className="dialog-location-cell" style={{ borderLeft: '3px solid #e11d48' }}>
                    <small style={{ color: '#be123c', fontFamily: "'Fraunces', serif" }}>Room Number</small>
                    <strong style={{ fontFamily: "'Fraunces', serif" }}>{complaint.roomNumber}</strong>
                  </div>
                )}
                {complaint.daysFacingProblem && (
                  <div className="dialog-location-cell" style={{ borderLeft: '3px solid #9333ea' }}>
                    <small style={{ color: '#7e22ce', fontFamily: "'Lexend', sans-serif" }}>Days Facing Problem</small>
                    <strong style={{ fontFamily: "'Lexend', sans-serif" }}>{complaint.daysFacingProblem}</strong>
                  </div>
                )}
                {complaint.membersAffected && (
                  <div className="dialog-location-cell" style={{ borderLeft: '3px solid #2563eb' }}>
                    <small style={{ color: '#1d4ed8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Members Affected</small>
                    <strong style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{complaint.membersAffected}</strong>
                  </div>
                )}
                {complaint.collegeRegisterNo && (
                  <div className="dialog-location-cell" style={{ borderLeft: '3px solid #7c3aed' }}>
                    <small style={{ color: '#6b21a8', fontFamily: "'JetBrains Mono', monospace" }}>College Register No</small>
                    <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{complaint.collegeRegisterNo}</strong>
                  </div>
                )}
              </div>
              {complaint.problemAppearance && (
                <div style={{ marginTop: 10, padding: 10, background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: 8 }}>
                  <small style={{ display: 'block', color: '#a21caf', fontWeight: 800, textTransform: 'uppercase', fontSize: 10.5, fontFamily: "'Manrope', sans-serif" }}>
                    How Does Problem Appear
                  </small>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#701a75', fontFamily: "'Manrope', sans-serif" }}>
                    {complaint.problemAppearance}
                  </p>
                </div>
              )}
              {complaint.suggestions && (
                <div style={{ marginTop: 8, padding: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                  <small style={{ display: 'block', color: '#15803d', fontWeight: 800, textTransform: 'uppercase', fontSize: 10.5, fontFamily: "'Outfit', sans-serif" }}>
                    Student Suggestion
                  </small>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#14532d', fontFamily: "'Outfit', sans-serif" }}>
                    {complaint.suggestions}
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="detail-facts">
            <div>
              <small>SUBMITTED BY</small>
              <strong>{complaint.studentName}</strong>
              <span>{complaint.studentLoginId}</span>
            </div>
            <div>
              <small>SUBMITTED</small>
              <strong>{shortDate(complaint.createdAt)}</strong>
              <span>Last updated {timeAgo(complaint.updatedAt)}</span>
            </div>
            <div>
              <small>ASSIGNED TO</small>
              <strong>{complaint.assignedStaff || 'Not assigned'}</strong>
              <span>{complaint.department}</span>
            </div>
          </div>

          {(user.role === 'admin' || user.role === 'staff') && (
            <div className="dialog-actions">
              {user.role === 'admin' && (
                <label>Assign to
                  <select value={complaint.assignedStaffId || ''} onChange={(event) => event.target.value && onAssign(complaint.complaintId, event.target.value)}>
                    <option value="" disabled>Choose staff member</option>
                    {staff.map((person) => <option key={person.id} value={person.id}>{person.fullName} · {person.department}</option>)}
                  </select>
                </label>
              )}
              <label>Update status
                <select value={complaint.status} onChange={(event) => onStatus(complaint.complaintId, event.target.value, remarks)}>
                  {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label className="remarks-input">Add a remark
                <textarea rows="2" placeholder="Add context for the student…" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
              </label>
            </div>
          )}

          {isStudent && complaint.status === 'Resolved' && (
            <div className="dialog-actions">
              <label className="remarks-input">Provide Feedback & Close Case
                <textarea rows="2" placeholder="Share your feedback on how this concern was resolved…" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
              </label>
              <button className="button-primary" onClick={() => onStatus(complaint.complaintId, 'Closed', remarks ? `Feedback: ${remarks}` : 'Resolved satisfactorily.')}>
                <Check size={16} /> Accept Resolution & Close
              </button>
            </div>
          )}

          {/* Student Delete & Restore actions inside dialog */}
          {isStudent && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={14} /> Personal Control
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!complaint.isDeleted ? (
                  <button
                    type="button"
                    className="button-quiet"
                    style={{ color: '#e11d48', borderColor: '#fecdd3', background: '#fff1f2', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => { onRetract?.(complaint); onClose(); }}
                  >
                    <Trash2 size={14} /> Delete from Desk (Temporary)
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="button-restore"
                      onClick={() => { onRestore?.(complaint); onClose(); }}
                    >
                      <RotateCcw size={14} /> Restore to Active Desk
                    </button>
                    <button
                      type="button"
                      className="button-danger"
                      onClick={() => { onPermanentDelete?.(complaint); onClose(); }}
                    >
                      <Trash2 size={14} /> Permanently Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="timeline-heading">
            <div><div className="eyebrow">AUDIT TRAIL</div><h3>Case history</h3></div>
            <span>{history.length} {history.length === 1 ? 'event' : 'events'}</span>
          </div>
          <div className="history-timeline">
            {history.map((entry, index) => (
              <div className="history-event" key={`${entry.action}-${entry.createdAt}-${index}`}>
                <span className={`history-dot ${index === 0 ? 'history-dot-first' : ''}`} />
                <div className="history-event-main">
                  <div>
                    <strong>{entry.newStatus || entry.action}</strong>
                    <small>{entry.actorName}</small>
                  </div>
                  <time>{shortDate(entry.createdAt)}</time>
                </div>
                {entry.remarks && <p>{entry.remarks}</p>}
              </div>
            ))}
          </div>
        </div>
        <footer className="dialog-footer">
          <span><ShieldCheck size={14} /> Changes are recorded in this case’s history.</span>
          <button className="button-quiet" onClick={onClose}>Done</button>
        </footer>
      </section>
    </div>
  );
}

function SignOutConfirmModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="confirm-modal-backdrop" onClick={onCancel}>
      <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="confirm-modal-top">
          <div className="confirm-icon-wrap" style={{ background: '#fff1f2', color: '#e11d48', borderColor: '#fecdd3' }}>
            <LogOut size={22} />
          </div>
          <div className="confirm-modal-copy">
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 19, fontWeight: 800, color: '#0f172a' }}>
              Sign Out Confirmation
            </h3>
            <p style={{ marginTop: 6, fontSize: 13.5, color: '#475569', lineHeight: 1.5 }}>
              Are you sure you want to sign out?
            </p>
            <p style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
              Your current session will end and you will be returned directly to the sign-in page.
            </p>
          </div>
        </div>
        <div className="confirm-modal-actions" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="button-quiet"
            onClick={onCancel}
            style={{ fontWeight: 600, padding: '9px 18px' }}
          >
            No
          </button>
          <button
            type="button"
            className="button-danger"
            style={{ background: '#e11d48', borderColor: '#be123c', fontWeight: 700, padding: '9px 20px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={onConfirm}
          >
            <LogOut size={14} /> Yes
          </button>
        </div>
      </div>
    </div>
  );
}

function CredentialsModal({
  isOpen,
  user,
  initialTab = 'username',
  onClose,
  onSaveUsername,
  onSavePassword,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Username tab states
  const [currentUsernameInput, setCurrentUsernameInput] = useState('');
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');

  // Password tab states
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    setUsernameError('');
    setUsernameSuccess('');
    setPasswordError('');
    setPasswordSuccess('');
  }, [activeTab, isOpen]);

  if (!isOpen || !user) return null;

  const activeUserIdentifier = String(user.loginId || user.studentId || user.identifier || '').trim();
  const isCurrentUsernameEntered = currentUsernameInput.trim().length > 0;
  const isUsernameMatched = isCurrentUsernameEntered && (currentUsernameInput.trim().toLowerCase() === activeUserIdentifier.toLowerCase());

  async function handleUsernameSubmit(e) {
    e.preventDefault();
    setUsernameError('');
    setUsernameSuccess('');

    if (!isUsernameMatched) {
      setUsernameError(`Current username entered does not match your active account username (${activeUserIdentifier}). Please verify and retry.`);
      return;
    }
    if (!newUsernameInput.trim() || newUsernameInput.trim().length < 3) {
      setUsernameError('New username must be at least 3 characters long.');
      return;
    }
    if (newUsernameInput.trim().toLowerCase() === activeUserIdentifier.toLowerCase()) {
      setUsernameError('New username cannot be the same as your current username.');
      return;
    }

    setUsernameSaving(true);
    try {
      await onSaveUsername({
        currentUsername: currentUsernameInput.trim(),
        newUsername: newUsernameInput.trim(),
      });
      setUsernameSuccess(`Username successfully updated to "${newUsernameInput.trim()}" in the database! Please use this new username for future sign-ins.`);
      setCurrentUsernameInput('');
      setNewUsernameInput('');
    } catch (err) {
      setUsernameError(err.message || 'Failed to update username in database.');
    } finally {
      setUsernameSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPasswordInput) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPasswordInput.length < 10) {
      setPasswordError('New password must be at least 10 characters long.');
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(newPasswordInput)) {
      setPasswordError('New password must contain uppercase, lowercase letters and at least one number.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError('The new passwords do not match. Please verify both fields.');
      return;
    }

    setPasswordSaving(true);
    try {
      await onSavePassword({
        currentPassword: currentPasswordInput,
        newPassword: newPasswordInput,
      });
      setPasswordSuccess('Password successfully updated and securely hashed in the database! Please use your new password for all future sign-ins.');
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password in database.');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="confirm-modal-backdrop" onClick={onClose}>
      <div className="credentials-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyRound size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  Edit Sign-in Credentials
                </h3>
                <small style={{ color: '#64748b', fontSize: 11.5, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Active User ID: {activeUserIdentifier}
                </small>
              </div>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close credentials modal">
            <X size={16} />
          </button>
        </div>

        {/* Two Options / Tabs */}
        <div className="credentials-tabs">
          <button
            type="button"
            className={`credentials-tab-btn ${activeTab === 'username' ? 'active' : ''}`}
            onClick={() => setActiveTab('username')}
          >
            <UserRound size={15} />
            <span>Edit Username</span>
          </button>
          <button
            type="button"
            className={`credentials-tab-btn ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <Lock size={15} />
            <span>Edit Password</span>
          </button>
        </div>

        {/* Option 1: Edit Username */}
        {activeTab === 'username' && (
          <form onSubmit={handleUsernameSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12.5, color: '#475569', lineHeight: 1.45 }}>
              For editing the username, please enter your current username. If it matches your registered account, update your new username and save the change to the database.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4, fontFamily: "'Outfit', sans-serif" }}>
                Current Username
              </label>
              <input
                type="text"
                value={currentUsernameInput}
                onChange={(e) => {
                  setCurrentUsernameInput(e.target.value);
                  setUsernameError('');
                  setUsernameSuccess('');
                }}
                placeholder="Enter current username (e.g. STU-2026-001)"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: `1.5px solid ${isUsernameMatched ? '#10b981' : isCurrentUsernameEntered ? '#f59e0b' : '#cbd5e1'}`,
                  fontFamily: "'Space Grotesk', monospace",
                  fontSize: 13,
                  outline: 'none',
                }}
                required
              />
              <div style={{ marginTop: 4, fontSize: 11 }}>
                {isUsernameMatched ? (
                  <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Check size={12} strokeWidth={3} /> Current username matches! Please update your new username below.
                  </span>
                ) : isCurrentUsernameEntered ? (
                  <span style={{ color: '#d97706', fontWeight: 600 }}>
                    Enter your exact active username to enable new username field.
                  </span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>
                    Please enter your current username.
                  </span>
                )}
              </div>
            </div>

            {/* Display new username field once current username matches */}
            <div style={{ opacity: isUsernameMatched ? 1 : 0.5, transition: 'opacity 0.2s ease', pointerEvents: isUsernameMatched ? 'auto' : 'none' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4, fontFamily: "'Outfit', sans-serif" }}>
                Update New Username Here
              </label>
              <input
                type="text"
                value={newUsernameInput}
                onChange={(e) => {
                  setNewUsernameInput(e.target.value);
                  setUsernameError('');
                }}
                disabled={!isUsernameMatched}
                placeholder={isUsernameMatched ? "Please enter your new username" : "Unlock by verifying current username"}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontFamily: "'Space Grotesk', monospace",
                  fontSize: 13,
                  outline: 'none',
                }}
                pattern="[A-Za-z0-9_-]+"
                title="Letters, numbers, hyphens, and underscores."
                required={isUsernameMatched}
              />
              <small style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#64748b' }}>
                When saved, the database will store this present username for sign-in access.
              </small>
            </div>

            {usernameError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
                {usernameError}
              </div>
            )}
            {usernameSuccess && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
                {usernameSuccess}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
              <button type="button" className="button-quiet" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="button-primary"
                disabled={!isUsernameMatched || !newUsernameInput.trim() || usernameSaving}
                style={{ fontWeight: 700 }}
              >
                {usernameSaving ? 'Saving to Database…' : 'Save Username'}
              </button>
            </div>
          </form>
        )}

        {/* Option 2: Edit Password */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12.5, color: '#475569', lineHeight: 1.45 }}>
              For editing the password, please enter your current password. Once verified, update your new password and save the change to the database.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4, fontFamily: "'Outfit', sans-serif" }}>
                Current Password
              </label>
              <input
                type="password"
                value={currentPasswordInput}
                onChange={(e) => {
                  setCurrentPasswordInput(e.target.value);
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
                placeholder="Enter current password"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4, fontFamily: "'Outfit', sans-serif" }}>
                Update New Password Here
              </label>
              <input
                type="password"
                value={newPasswordInput}
                onChange={(e) => {
                  setNewPasswordInput(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Min 10 chars with uppercase, lowercase & numbers"
                minLength={10}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                }}
                required
              />
              <small style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#64748b' }}>
                Use at least 10 characters, with uppercase and lowercase letters plus a number.
              </small>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4, fontFamily: "'Outfit', sans-serif" }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPasswordInput}
                onChange={(e) => {
                  setConfirmPasswordInput(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Re-enter new password"
                minLength={10}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                }}
                required
              />
            </div>

            {passwordError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
                {passwordSuccess}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
              <button type="button" className="button-quiet" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="button-primary"
                disabled={!currentPasswordInput || !newPasswordInput || !confirmPasswordInput || passwordSaving}
                style={{ fontWeight: 700 }}
              >
                {passwordSaving ? 'Saving to Database…' : 'Save Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function EditPersonalDetailsPage({
  user,
  onBack,
  onSave,
  onSignOut,
}) {
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [fullName, setFullName] = useState(user.fullName || '');
  const [email, setEmail] = useState(user.email || '');
  const [selectedDeptId, setSelectedDeptId] = useState(user.departmentId ? String(user.departmentId) : '');
  const [selectedYear, setSelectedYear] = useState(user.year ? String(user.year) : '');
  const [selectedSemester, setSelectedSemester] = useState(user.semester || 1);
  const [section, setSection] = useState(user.section || 'A');
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    async function loadDepts() {
      setDepartmentsLoading(true);
      try {
        const res = await request('/departments', null);
        setDepartments(res.departments || []);
      } catch (e) {
        console.error('Failed to load departments', e);
      } finally {
        setDepartmentsLoading(false);
      }
    }
    loadDepts();
  }, []);

  const selectedDept = useMemo(() => {
    return departments.find((d) => String(d.id) === String(selectedDeptId));
  }, [departments, selectedDeptId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (!fullName.trim()) {
      setStatusMsg({ type: 'error', text: 'Full name is required.' });
      return;
    }
    if (!email.trim()) {
      setStatusMsg({ type: 'error', text: 'College email is required.' });
      return;
    }
    if (!selectedDeptId) {
      setStatusMsg({ type: 'error', text: 'Please choose your department.' });
      return;
    }
    if (!selectedYear) {
      setStatusMsg({ type: 'error', text: 'Please choose your academic year.' });
      return;
    }

    setSaving(true);
    try {
      await onSave({
        fullName: fullName.trim(),
        email: email.trim(),
        departmentId: Number(selectedDeptId),
        year: Number(selectedYear),
        semester: Number(selectedSemester),
        section: section.trim(),
        phone: phone.trim(),
      });
      setStatusMsg({ type: 'success', text: 'All personal details updated and saved in the database successfully!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update personal details.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="edit-profile-shell">
      {/* Left Art Column - Distinct Midnight/Navy Theme */}
      <section className="edit-profile-art">
        <div>
          <div className="brand-lockup brand-lockup-light">
            <div className="brand-mark"><span>c</span></div>
            <div><strong>campus<span>care</span></strong><small>STUDENT SERVICES</small></div>
          </div>
          <span className="art-index" style={{ display: 'inline-block', marginTop: 14, color: '#93c5fd', fontSize: 11, fontFamily: "'Space Grotesk', monospace" }}>
            ACADEMIC PROFILE MANAGEMENT <span>•</span> LIVE RECORD
          </span>
          <h1 style={{ marginTop: 24, fontSize: 32, lineHeight: 1.15, fontWeight: 800 }}>
            Keep your records<br />
            <em>always updated.</em>
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.6, maxWidth: 320, marginTop: 12 }}>
            College progression moves fast every semester. Keep your branch, semester, section and contact details up-to-date so academic queries are always accurate.
          </p>

          <div className="edit-profile-card">
            <div className="edit-profile-card-top">
              <div className="avatar" style={{ width: 38, height: 38, background: '#1d4ed8', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>
                {fullName.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </div>
              <div>
                <strong>{fullName || 'Student'}</strong>
                <small>{user.studentId || user.loginId || 'STU-ID'}</small>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 4, fontFamily: "'Outfit', sans-serif" }}>
              <div>Branch: <strong style={{ color: '#ffffff', display: 'inline' }}>{selectedDept?.name || user.department || 'Not selected'}</strong></div>
              <div>Progress: <strong style={{ color: '#93c5fd', display: 'inline' }}>Year {selectedYear || user.year || '1'} • Sem {selectedSemester || user.semester || '1'} (Sec {section || user.section || 'A'})</strong></div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            className="button-quiet"
            style={{ color: '#ffffff', background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', width: '100%', justifyContent: 'center' }}
            onClick={onBack}
          >
            <ArrowLeft size={16} /> Back to Workspace
          </button>
          <button
            type="button"
            className="button-quiet"
            style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.25)', width: '100%', justifyContent: 'center' }}
            onClick={onSignOut}
          >
            <LogOut size={16} /> Sign Out & Test Sign-in
          </button>
        </div>
      </section>

      {/* Right Form Area - Pre-filled Editable A-Z Details (NO Username/Password) */}
      <section className="edit-profile-form-wrap">
        <div>
          <div className="edit-profile-header">
            <div className="eyebrow" style={{ color: '#2563eb' }}>UPDATE STUDENT RECORD</div>
            <h2>Edit your personal details</h2>
            <p>Update your semester progression, academic branch, section and personal phone number.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form registration-form" style={{ marginTop: 10 }}>
            {/* Student ID (Permanent reference) and Full Name */}
            <div className="registration-fields">
              <label>
                Student ID <span className="optional-label" style={{ background: '#f1f5f9', color: '#64748b' }}>PERMANENT</span>
                <input
                  value={user.studentId || user.loginId || ''}
                  disabled
                  readOnly
                  style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed', fontFamily: "'Space Grotesk', monospace" }}
                  title="Permanent student identifier assigned by college administration."
                />
              </label>
              <label>
                Full name
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  minLength={2}
                  maxLength={160}
                  placeholder="As recorded by your college"
                  required
                />
              </label>
            </div>

            {/* College Email */}
            <label>
              College email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                placeholder="you@college.edu"
                required
              />
            </label>

            {/* Department (All 169 departments searchable) & Year & Semester */}
            <div className="registration-fields">
              <label style={{ position: 'relative' }}>
                Department (Branch)
                <DepartmentSearchSelect
                  departments={departments}
                  value={selectedDeptId}
                  onChange={setSelectedDeptId}
                  disabled={departments.length === 0}
                  loading={departmentsLoading}
                />
              </label>

              <label style={{ position: 'relative' }}>
                Year & Semester
                <YearSelect
                  value={selectedYear}
                  semester={selectedSemester}
                  onChangeYear={setSelectedYear}
                  onChangeSemester={setSelectedSemester}
                  department={selectedDept}
                  disabled={!selectedDept}
                />
                {selectedYear && (
                  <div className="sem-switcher-row">
                    <span className="sem-switcher-label" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>SEMESTER:</span>
                    <button
                      type="button"
                      className={`sem-toggle-btn ${selectedSemester === 1 ? 'active' : ''}`}
                      onClick={() => setSelectedSemester(1)}
                      title="Switch to 1st Semester"
                      style={{ fontFamily: (YEAR_DETAILS[Number(selectedYear)]?.fontFamily) || "'Plus Jakarta Sans', sans-serif" }}
                    >
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>✦</span> {getYearSuffix(Number(selectedYear))} Year 1st Sem
                    </button>
                    <button
                      type="button"
                      className={`sem-toggle-btn ${selectedSemester === 2 ? 'active' : ''}`}
                      onClick={() => setSelectedSemester(2)}
                      title="Switch to 2nd Semester"
                      style={{ fontFamily: (YEAR_DETAILS[Number(selectedYear)]?.fontFamily) || "'Plus Jakarta Sans', sans-serif" }}
                    >
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>✦</span> {getYearSuffix(Number(selectedYear))} Year 2nd Sem
                    </button>
                  </div>
                )}
              </label>
            </div>

            {/* Section & Phone */}
            <div className="registration-fields">
              <label>
                Section
                <input
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  maxLength={20}
                  placeholder="e.g. A"
                  required
                />
              </label>
              <label>
                Phone <span className="optional-label">OPTIONAL</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={30}
                  placeholder="Phone number"
                />
              </label>
            </div>

            {statusMsg.text && (
              <div
                className={statusMsg.type === 'error' ? 'login-error' : 'toast'}
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  background: statusMsg.type === 'error' ? '#fef2f2' : '#ecfdf5',
                  color: statusMsg.type === 'error' ? '#b91c1c' : '#047857',
                  border: `1px solid ${statusMsg.type === 'error' ? '#fecdd3' : '#a7f3d0'}`,
                }}
                role="status"
              >
                {statusMsg.text}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="edit-profile-actions">
              <button
                type="button"
                className="button-quiet"
                onClick={onBack}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ArrowLeft size={16} /> Back to Workspace
              </button>

              <button
                type="submit"
                className="button-primary"
                disabled={saving || departments.length === 0}
                style={{ padding: '12px 28px', fontSize: 14, fontWeight: 700 }}
              >
                <Check size={16} /> {saving ? 'Saving changes…' : 'Save personal details'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export default App;