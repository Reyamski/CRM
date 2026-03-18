import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import './App.css'
import { supabase } from './lib/supabase'
import {
  getProfile,
  getClients,
  getNotes,
  getSinFull,
  getAuditLog,
  getTeamMembers,
  getDbStats,
  createClient as dbCreateClient,
  updateClient as dbUpdateClient,
  addNote as dbAddNote,
  addAuditEntry,
  updateDisplayName as dbUpdateDisplayName,
  setMemberActive as dbSetMemberActive,
} from './lib/queries'
import type {
  Profile,
  Client,
  ClientNote,
  AuditEntry,
  ClientDraft,
  ClientStatus,
  MaritalStatus,
  MortgageType,
  DbStats,
} from './lib/types'

// ── Constants ─────────────────────────────────────────────
const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const SIN_FORMAT = /^\d{3}-?\d{3}-?\d{3}$/

// ── Helpers ───────────────────────────────────────────────

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
  }).format(amount)
}

function emptyDraft(): ClientDraft {
  return {
    full_name: '', date_of_birth: '', sin_full: '',
    address: '', email: '', phone: '',
    marital_status: 'Single', spouse_name: '',
    file_location: '', status: 'Pending',
    mortgage_type: '', lender: '', property_address: '',
    loan_amount: '', rate_expiry_date: '', referral_source: '',
  }
}

// ── App ───────────────────────────────────────────────────

export default function App() {
  // Auth
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [passwordResetMode, setPasswordResetMode] = useState(false)

  // Login form
  const [loginView, setLoginView] = useState<'login' | 'forgot'>('login')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  // Password reset (from email link)
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [resetSaving, setResetSaving] = useState(false)
  const [resetError, setResetError] = useState('')

  // Data
  const [clients, setClients] = useState<Client[]>([])
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [dbStats, setDbStats] = useState<DbStats | null>(null)

  // Team management
  const [teamMembers, setTeamMembers] = useState<Profile[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [resetEmailTarget, setResetEmailTarget] = useState('')
  const [resetEmailSending, setResetEmailSending] = useState(false)
  const [teamMessage, setTeamMessage] = useState<string | null>(null)

  // Profile settings
  const [profileNameEdit, setProfileNameEdit] = useState('')
  const [profileNameSaving, setProfileNameSaving] = useState(false)
  const [profileNewPassword, setProfileNewPassword] = useState('')
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('')
  const [profilePasswordSaving, setProfilePasswordSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // UI
  const [activeView, setActiveView] = useState<'dashboard' | 'clients' | 'audit' | 'profile' | 'team'>('dashboard')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'All'>('All')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [revealedSins, setRevealedSins] = useState<Record<string, string>>({})
  const [showClientForm, setShowClientForm] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ClientDraft>(emptyDraft())
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derived
  const canRevealSin = profile?.role === 'Broker / Owner' || profile?.role === 'Manager / Compliance'
  const canViewAudit = profile?.role === 'Broker / Owner' || profile?.role === 'Manager / Compliance'
  const canManageTeam = profile?.role === 'Broker / Owner'
  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null

  // ── Idle timeout ─────────────────────────────────────────

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (!profile) return
    idleTimer.current = setTimeout(() => supabase.auth.signOut(), IDLE_TIMEOUT_MS)
  }, [profile])

  useEffect(() => {
    if (!profile) return
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, resetIdleTimer))
    resetIdleTimer()
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer))
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [profile, resetIdleTimer])

  useEffect(() => { setRevealedSins({}) }, [selectedClientId])

  // ── Auth bootstrap ────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          try {
            const p = await getProfile(session.user.id)
            if (p) setProfile(p)
            else await supabase.auth.signOut()
          } catch { /* ignore */ }
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setPasswordResetMode(true)
        setAuthLoading(false)
        return
      }
      if (session?.user) {
        try {
          const p = await getProfile(session.user.id)
          if (p) setProfile(p)
          else await supabase.auth.signOut()
        } catch { setProfile(null) }
      } else {
        setProfile(null)
        setPasswordResetMode(false)
        setClients([])
        setNotes([])
        setAuditLog([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Data loading ──────────────────────────────────────────

  useEffect(() => {
    if (!profile) return
    setDataLoading(true)
    getClients()
      .then((data) => {
        setClients(data)
        if (data.length > 0) setSelectedClientId(data[0].id)
      })
      .finally(() => setDataLoading(false))
  }, [profile])

  useEffect(() => {
    if (!selectedClientId) return
    getNotes(selectedClientId).then(setNotes)
  }, [selectedClientId])

  useEffect(() => {
    if (activeView === 'audit' && canViewAudit) getAuditLog().then(setAuditLog)
    if (activeView === 'dashboard') getDbStats().then(setDbStats)
  }, [activeView, canViewAudit])

  useEffect(() => {
    if (activeView === 'profile' && profile) {
      setProfileNameEdit(profile.name)
      setProfileMessage(null)
      setProfileNewPassword('')
      setProfileConfirmPassword('')
    }
    if (activeView === 'team' && canManageTeam) {
      setTeamLoading(true)
      getTeamMembers().then(setTeamMembers).finally(() => setTeamLoading(false))
    }
  }, [activeView, canManageTeam, profile])

  // ── Filtered / derived data ───────────────────────────────

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter
      const haystack = [c.full_name, c.email, c.phone, c.address, c.lender, c.referral_source]
        .join(' ').toLowerCase()
      return matchesStatus && haystack.includes(search.toLowerCase())
    })
  }, [clients, search, statusFilter])

  const dashboardStats = useMemo(() => {
    const activeCount = clients.filter((c) => c.status === 'Active').length
    const pendingCount = clients.filter((c) => c.status === 'Pending').length
    const archivedCount = clients.filter((c) => c.status === 'Archived').length
    const totalLoan = clients.reduce((sum, c) => sum + (c.loan_amount ?? 0), 0)
    const recentUpdates = [...clients]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 3)
    return { activeCount, pendingCount, archivedCount, totalLoan, recentUpdates }
  }, [clients])

  const duplicateCandidates = useMemo(() => {
    if (!selectedClient) return []
    return clients.filter(
      (c) =>
        c.id !== selectedClient.id &&
        (c.full_name === selectedClient.full_name ||
          c.email === selectedClient.email ||
          c.phone === selectedClient.phone),
    )
  }, [clients, selectedClient])

  // ── Handlers ─────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    if (error) setLoginError(error.message)
    setLoginLoading(false)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: window.location.origin })
    } catch { /* don't leak existence */ }
    setForgotSent(true)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (resetNewPassword !== resetConfirmPassword) { setResetError('Passwords do not match.'); return }
    if (resetNewPassword.length < 8) { setResetError('Password must be at least 8 characters.'); return }
    setResetSaving(true)
    setResetError('')
    try {
      const { error } = await supabase.auth.updateUser({ password: resetNewPassword })
      if (error) throw error
      setPasswordResetMode(false)
      setResetNewPassword('')
      setResetConfirmPassword('')
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'Failed to update password.')
    } finally { setResetSaving(false) }
  }

  const handleSignOut = async () => { await supabase.auth.signOut() }

  const handleSaveClient = async () => {
    if (!profile) return
    if (draft.sin_full && !SIN_FORMAT.test(draft.sin_full.trim())) {
      alert('Invalid SIN format. Must be 9 digits (e.g. 123-456-789).')
      return
    }
    setSaving(true)
    try {
      if (editingClientId) {
        const updated = await dbUpdateClient(editingClientId, draft, profile.id, profile.name)
        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        setSelectedClientId(updated.id)
        await addAuditEntry('CLIENT_UPDATED', profile.id, profile.name, draft.full_name, 'Updated client profile details.')
      } else {
        const created = await dbCreateClient(draft, profile.id, profile.name)
        setClients((prev) => [created, ...prev])
        setSelectedClientId(created.id)
        await addAuditEntry('CLIENT_CREATED', profile.id, profile.name, draft.full_name, 'Created a new client record.')
      }
      setShowClientForm(false)
      setEditingClientId(null)
      setDraft(emptyDraft())
    } catch { alert('Failed to save client. Please try again.') }
    finally { setSaving(false) }
  }

  const handleAddNote = async () => {
    if (!profile || !selectedClientId || !newNote.trim()) return
    const note = await dbAddNote(selectedClientId, newNote.trim(), profile.id, profile.name)
    setNotes((prev) => [note, ...prev])
    setNewNote('')
    await addAuditEntry('NOTE_ADDED', profile.id, profile.name, selectedClient?.full_name ?? '', 'Added a timestamped client note.')
  }

  const handleRevealSin = async (client: Client) => {
    if (!profile || !canRevealSin || revealedSins[client.id]) return
    const sinFull = await getSinFull(client.id)
    if (sinFull) {
      setRevealedSins((prev) => ({ ...prev, [client.id]: sinFull }))
      await addAuditEntry('SENSITIVE_FIELD_VIEW', profile.id, profile.name, client.full_name, 'Revealed full SIN from secure storage.')
      if (activeView === 'audit') getAuditLog().then(setAuditLog)
    }
  }

  const handleOpenEdit = (client: Client) => {
    setEditingClientId(client.id)
    setDraft({
      full_name: client.full_name,
      date_of_birth: client.date_of_birth ?? '',
      sin_full: '',
      address: client.address ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      marital_status: client.marital_status ?? 'Single',
      spouse_name: client.spouse_name ?? '',
      file_location: client.file_location ?? '',
      status: client.status,
      mortgage_type: client.mortgage_type ?? '',
      lender: client.lender ?? '',
      property_address: client.property_address ?? '',
      loan_amount: client.loan_amount != null ? String(client.loan_amount) : '',
      rate_expiry_date: client.rate_expiry_date ?? '',
      referral_source: client.referral_source ?? '',
    })
    setShowClientForm(true)
  }

  const handleOpenAdd = () => {
    setEditingClientId(null)
    setDraft(emptyDraft())
    setShowClientForm(true)
  }

  const handleUpdateDisplayName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !profileNameEdit.trim()) return
    setProfileNameSaving(true)
    try {
      await dbUpdateDisplayName(profileNameEdit.trim())
      setProfile((prev) => prev ? { ...prev, name: profileNameEdit.trim() } : null)
      setProfileMessage({ type: 'success', text: 'Display name updated.' })
    } catch {
      setProfileMessage({ type: 'error', text: 'Failed to update name. Please try again.' })
    } finally { setProfileNameSaving(false) }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (profileNewPassword !== profileConfirmPassword) {
      setProfileMessage({ type: 'error', text: 'Passwords do not match.' }); return
    }
    if (profileNewPassword.length < 8) {
      setProfileMessage({ type: 'error', text: 'Password must be at least 8 characters.' }); return
    }
    setProfilePasswordSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: profileNewPassword })
      if (error) throw error
      setProfileNewPassword('')
      setProfileConfirmPassword('')
      setProfileMessage({ type: 'success', text: 'Password updated successfully.' })
    } catch (err: unknown) {
      setProfileMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update password.' })
    } finally { setProfilePasswordSaving(false) }
  }

  const handleToggleMemberActive = async (memberId: string, currentActive: boolean) => {
    try {
      await dbSetMemberActive(memberId, !currentActive)
      setTeamMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, is_active: !currentActive } : m))
      setTeamMessage(!currentActive ? 'Member reactivated.' : 'Member deactivated.')
      setTimeout(() => setTeamMessage(null), 4000)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update member status.')
    }
  }

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmailTarget.trim()) return
    setResetEmailSending(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmailTarget.trim(), {
        redirectTo: window.location.origin,
      })
      if (error) throw error
      setTeamMessage(`Reset email sent to ${resetEmailTarget.trim()}.`)
      setResetEmailTarget('')
      setTimeout(() => setTeamMessage(null), 5000)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to send reset email.')
    } finally { setResetEmailSending(false) }
  }

  // ── Shared logo block ─────────────────────────────────────

  const LogoBlock = () => (
    <div className="login-logo">
      <div className="login-logo-mark">RF</div>
      <div>
        <div className="login-logo-name">R Fernandez Services</div>
        <div className="login-logo-sub">Client Management Portal</div>
      </div>
    </div>
  )

  // ── Early returns ─────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <LogoBlock />
          <p className="supporting-text">Loading...</p>
        </div>
      </div>
    )
  }

  if (passwordResetMode) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <LogoBlock />
          <h1>Set new password</h1>
          <p className="supporting-text">Enter a new password for your account.</p>
          <form onSubmit={handleResetPassword} className="login-form">
            <label>
              New password
              <input type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)}
                required minLength={8} placeholder="Min. 8 characters" autoComplete="new-password" />
            </label>
            <label>
              Confirm new password
              <input type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)}
                required placeholder="Repeat password" autoComplete="new-password" />
            </label>
            {resetError && <div className="form-error">{resetError}</div>}
            <button className="primary-button" type="submit" disabled={resetSaving}>
              {resetSaving ? 'Updating...' : 'Set new password'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!profile) {
    if (loginView === 'forgot') {
      return (
        <div className="login-shell">
          <div className="login-card">
            <LogoBlock />
            <h1>Reset password</h1>
            {!forgotSent ? (
              <>
                <p className="supporting-text">Enter your email and we'll send a reset link.</p>
                <form onSubmit={handleForgotPassword} className="login-form">
                  <label>
                    Email
                    <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                      required autoComplete="email" placeholder="you@brokerage.com" />
                  </label>
                  <button className="primary-button" type="submit">Send reset link</button>
                </form>
              </>
            ) : (
              <p className="supporting-text">
                If that email is registered, a reset link has been sent. Check your inbox.
              </p>
            )}
            <div className="login-footer-row">
              <button className="text-link" onClick={() => { setLoginView('login'); setForgotSent(false); setForgotEmail('') }}>
                Back to sign in
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="login-shell">
        <div className="login-card">
          <LogoBlock />
          <h1>Welcome back</h1>
          <p className="supporting-text">Sign in to access your client files.</p>
          <form onSubmit={handleLogin} className="login-form">
            <label>
              Email
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                required autoComplete="email" placeholder="you@brokerage.com" />
            </label>
            <label>
              Password
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                required autoComplete="current-password" placeholder="••••••••" />
            </label>
            {loginError && <div className="form-error">{loginError}</div>}
            <button className="primary-button" type="submit" disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <div className="login-footer-row">
            <button className="text-link" onClick={() => { setLoginView('forgot'); setForgotEmail(loginEmail) }}>
              Forgot password?
            </button>
          </div>
          <div className="prototype-note">
            Role and access level is determined by your account. Contact your administrator to create or reset accounts.
          </div>
        </div>
      </div>
    )
  }

  // ── Main App ──────────────────────────────────────────────

  const viewMeta: Record<typeof activeView, { eyebrow: string; title: string }> = {
    dashboard: { eyebrow: 'Overview', title: 'Dashboard' },
    clients: { eyebrow: 'Records', title: 'Client Management' },
    audit: { eyebrow: 'Compliance', title: 'Audit Log' },
    profile: { eyebrow: 'Account', title: 'My Profile' },
    team: { eyebrow: 'Administration', title: 'Team Management' },
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">RF</div>
          <div>
            <div className="brand-name">R Fernandez Services</div>
            <div className="brand-type">Client Portal</div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-name">{profile.name}</div>
          <div className="sidebar-user-role">{profile.role}</div>
        </div>

        <div className="sidebar-section-label">Navigation</div>
        <nav className="sidebar-nav">
          <button className={activeView === 'dashboard' ? 'nav-button active' : 'nav-button'} onClick={() => setActiveView('dashboard')}>Dashboard</button>
          <button className={activeView === 'clients' ? 'nav-button active' : 'nav-button'} onClick={() => setActiveView('clients')}>Clients</button>
          <button className={activeView === 'audit' ? 'nav-button active' : 'nav-button'} onClick={() => setActiveView('audit')} disabled={!canViewAudit}>Audit Log</button>
        </nav>

        <div className="sidebar-section-label" style={{ marginTop: '20px' }}>Account</div>
        <nav className="sidebar-nav">
          <button className={activeView === 'profile' ? 'nav-button active' : 'nav-button'} onClick={() => setActiveView('profile')}>My Profile</button>
          {canManageTeam && (
            <button className={activeView === 'team' ? 'nav-button active' : 'nav-button'} onClick={() => setActiveView('team')}>Team</button>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="ghost-button" onClick={handleSignOut}>Sign out</button>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">{viewMeta[activeView].eyebrow}</div>
            <h1>{viewMeta[activeView].title}</h1>
          </div>
          <div className="topbar-actions">
            {(activeView === 'clients' || activeView === 'dashboard') && (
              <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, email, lender..." />
            )}
            {activeView === 'clients' && (
              <button className="primary-button" onClick={handleOpenAdd}>Add client</button>
            )}
          </div>
        </header>

        <div className="content-area">
          {dataLoading && <div className="empty-panel">Loading...</div>}

          {/* ── Dashboard ── */}
          {!dataLoading && activeView === 'dashboard' && (
            <section className="dashboard-grid">
              <StatCard label="Active clients" value={String(dashboardStats.activeCount)} detail="Files currently in progress" />
              <StatCard label="Pending files" value={String(dashboardStats.pendingCount)} detail="Waiting on signatures or follow-up" />
              <StatCard label="Archived" value={String(dashboardStats.archivedCount)} detail="Soft-deleted or archived records" />
              <StatCard label="Mortgage book" value={formatCurrency(dashboardStats.totalLoan)} detail="Sum of all loan amounts on file" />
              <DbUsageCard stats={dbStats} />

              <section className="panel panel-span-2">
                <div className="panel-header">
                  <div><div className="eyebrow">Recently updated</div><h3>Latest client activity</h3></div>
                </div>
                <div className="list-stack">
                  {dashboardStats.recentUpdates.map((c) => (
                    <button key={c.id} className="list-row" onClick={() => { setSelectedClientId(c.id); setActiveView('clients') }}>
                      <div>
                        <strong>{c.full_name}</strong>
                        <div className="muted-text">{c.status} · {c.lender ?? c.file_location ?? '—'}</div>
                      </div>
                      <span className="muted-text">{formatDateTime(c.updated_at)}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div><div className="eyebrow">Access level</div><h3>Your permissions</h3></div>
                </div>
                <ul className="task-list">
                  <li>Role: <strong>{profile.role}</strong></li>
                  <li>{canRevealSin ? 'Can reveal full SIN (audited)' : 'SIN reveal: not permitted for your role'}</li>
                  <li>{canViewAudit ? 'Can view audit trail' : 'Audit log: restricted for your role'}</li>
                </ul>
              </section>
            </section>
          )}

          {/* ── Clients ── */}
          {!dataLoading && activeView === 'clients' && (
            <section className="clients-layout">
              <section className="panel client-table-panel">
                <div className="panel-header panel-header-wrap">
                  <div><div className="eyebrow">Client table</div><h3>Broker records</h3></div>
                  <select className="status-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ClientStatus | 'All')}>
                    <option value="All">All statuses</option>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Closed">Closed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                <div className="table-wrap">
                  <table className="client-table">
                    <thead>
                      <tr>
                        <th>Name</th><th>Status</th><th>Type</th><th>Lender</th>
                        <th>Loan</th><th>Rate expiry</th><th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((c) => (
                        <tr key={c.id} className={c.id === selectedClientId ? 'selected-row' : ''} onClick={() => setSelectedClientId(c.id)}>
                          <td>{c.full_name}</td>
                          <td><StatusBadge status={c.status} /></td>
                          <td>{c.mortgage_type ?? '—'}</td>
                          <td>{c.lender ?? '—'}</td>
                          <td>{formatCurrency(c.loan_amount)}</td>
                          <td>{c.rate_expiry_date ?? '—'}</td>
                          <td>{formatDateTime(c.updated_at)}</td>
                        </tr>
                      ))}
                      {filteredClients.length === 0 && (
                        <tr><td colSpan={7} className="empty-panel">No clients match your search.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel detail-panel">
                {selectedClient ? (
                  <>
                    <div className="panel-header">
                      <div><div className="eyebrow">Client detail</div><h3>{selectedClient.full_name}</h3></div>
                      <button className="ghost-button" onClick={() => handleOpenEdit(selectedClient)}>Edit client</button>
                    </div>

                    <div className="detail-section-title">Personal</div>
                    <div className="detail-grid">
                      <DetailItem label="Status" value={selectedClient.status} />
                      <DetailItem label="Date of birth" value={selectedClient.date_of_birth ?? '—'} />
                      <DetailItem label="Email" value={selectedClient.email ?? '—'} />
                      <DetailItem label="Phone" value={selectedClient.phone ?? '—'} />
                      <DetailItem label="Address" value={selectedClient.address ?? '—'} />
                      <DetailItem label="Marital status" value={selectedClient.marital_status ?? '—'} />
                      {(selectedClient.marital_status === 'Married' || selectedClient.marital_status === 'Common-law') && (
                        <DetailItem label="Spouse" value={selectedClient.spouse_name ?? 'Not entered'} />
                      )}
                      <DetailItem label="File location" value={selectedClient.file_location ?? '—'} />
                      <DetailItem
                        label="SIN"
                        value={revealedSins[selectedClient.id] ?? selectedClient.sin_masked}
                        action={
                          canRevealSin && !revealedSins[selectedClient.id] && selectedClient.sin_masked !== 'Not collected'
                            ? <button className="inline-action" onClick={() => handleRevealSin(selectedClient)}>Reveal SIN</button>
                            : undefined
                        }
                      />
                    </div>

                    {(selectedClient.mortgage_type || selectedClient.lender || selectedClient.loan_amount != null || selectedClient.property_address) && (
                      <>
                        <div className="detail-section-title">Mortgage & Lending</div>
                        <div className="detail-grid">
                          {selectedClient.mortgage_type && <DetailItem label="Mortgage type" value={selectedClient.mortgage_type} />}
                          {selectedClient.lender && <DetailItem label="Lender" value={selectedClient.lender} />}
                          {selectedClient.loan_amount != null && <DetailItem label="Loan amount" value={formatCurrency(selectedClient.loan_amount)} />}
                          {selectedClient.rate_expiry_date && <DetailItem label="Rate expiry" value={selectedClient.rate_expiry_date} />}
                          {selectedClient.property_address && <DetailItem label="Property address" value={selectedClient.property_address} />}
                          {selectedClient.referral_source && <DetailItem label="Referral source" value={selectedClient.referral_source} />}
                        </div>
                      </>
                    )}

                    {duplicateCandidates.length > 0 && (
                      <div className="warning-card">
                        <strong>Potential duplicate detected</strong>
                        <span>Matching fields found in {duplicateCandidates.map((c) => c.full_name).join(', ')}.</span>
                      </div>
                    )}

                    <section className="notes-section">
                      <div className="notes-header"><h4>Timestamped notes</h4></div>
                      <textarea className="note-box" rows={4} value={newNote} onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a follow-up, compliance reminder, or file note..." maxLength={2000} />
                      <div className="notes-actions">
                        <button className="primary-button" onClick={handleAddNote} disabled={!newNote.trim()}>Add note</button>
                      </div>
                      <div className="note-list">
                        {notes.map((note) => (
                          <article key={note.id} className="note-card">
                            <div className="note-meta">
                              <strong>{note.created_by_name}</strong>
                              <span>{formatDateTime(note.created_at)}</span>
                            </div>
                            <p>{note.text}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                  </>
                ) : (
                  <div className="empty-panel">Select a client to view details.</div>
                )}
              </section>
            </section>
          )}

          {/* ── Audit Log ── */}
          {!dataLoading && activeView === 'audit' && (
            <section className="panel">
              <div className="panel-header">
                <div><div className="eyebrow">Compliance review</div><h3>Audit trail</h3></div>
              </div>
              {canViewAudit ? (
                <div className="audit-list">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="audit-row">
                      <div>
                        <div className="audit-action">{entry.action}</div>
                        <div className="muted-text">{entry.actor_name} · {entry.target_name}</div>
                      </div>
                      <div className="audit-detail">
                        <div>{entry.detail}</div>
                        <div className="muted-text">{formatDateTime(entry.created_at)}</div>
                      </div>
                    </div>
                  ))}
                  {auditLog.length === 0 && <div className="empty-panel">No audit entries yet.</div>}
                </div>
              ) : (
                <div className="empty-panel">Audit log is restricted for your role.</div>
              )}
            </section>
          )}

          {/* ── My Profile ── */}
          {activeView === 'profile' && (
            <div className="settings-layout">
              <section className="panel settings-panel">
                <div className="panel-header">
                  <div><div className="eyebrow">Identity</div><h3>Display name</h3></div>
                </div>
                <form onSubmit={handleUpdateDisplayName} className="settings-form">
                  <label>
                    Your name
                    <input value={profileNameEdit} onChange={(e) => setProfileNameEdit(e.target.value)} maxLength={80} required />
                  </label>
                  <div className="settings-form-footer">
                    <div className="settings-meta">Role: <strong>{profile.role}</strong> — contact Broker/Owner to change</div>
                    <button className="primary-button" type="submit" disabled={profileNameSaving || profileNameEdit.trim() === profile.name}>
                      {profileNameSaving ? 'Saving...' : 'Update name'}
                    </button>
                  </div>
                </form>
              </section>

              <section className="panel settings-panel">
                <div className="panel-header">
                  <div><div className="eyebrow">Security</div><h3>Change password</h3></div>
                </div>
                <form onSubmit={handleChangePassword} className="settings-form">
                  <label>
                    New password
                    <input type="password" value={profileNewPassword} onChange={(e) => setProfileNewPassword(e.target.value)}
                      minLength={8} required placeholder="Min. 8 characters" autoComplete="new-password" />
                  </label>
                  <label>
                    Confirm new password
                    <input type="password" value={profileConfirmPassword} onChange={(e) => setProfileConfirmPassword(e.target.value)}
                      required placeholder="Repeat password" autoComplete="new-password" />
                  </label>
                  <div className="settings-form-footer">
                    <div />
                    <button className="primary-button" type="submit" disabled={profilePasswordSaving || !profileNewPassword}>
                      {profilePasswordSaving ? 'Updating...' : 'Update password'}
                    </button>
                  </div>
                </form>
              </section>

              {profileMessage && (
                <div className={`settings-message settings-message-${profileMessage.type}`}>
                  {profileMessage.text}
                </div>
              )}
            </div>
          )}

          {/* ── Team Management ── */}
          {activeView === 'team' && (
            <div className="settings-layout">
              {!canManageTeam ? (
                <div className="empty-panel">Team management is restricted to Broker / Owner.</div>
              ) : teamLoading ? (
                <div className="empty-panel">Loading team...</div>
              ) : (
                <>
                  <section className="panel">
                    <div className="panel-header">
                      <div><div className="eyebrow">Staff</div><h3>Team members</h3></div>
                    </div>
                    {teamMessage && (
                      <div className="settings-message settings-message-success" style={{ marginBottom: 16 }}>
                        {teamMessage}
                      </div>
                    )}
                    <div className="team-list">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="team-member-row">
                          <div className="team-member-info">
                            <div className="team-member-name">{member.name}</div>
                            <div className="team-member-meta">
                              {member.role}{member.email ? ` · ${member.email}` : ''}
                            </div>
                          </div>
                          <div className="team-member-actions">
                            <span className={`member-badge ${member.is_active ? 'member-badge-active' : 'member-badge-inactive'}`}>
                              {member.is_active ? 'Active' : 'Inactive'}
                            </span>
                            {member.id !== profile.id && (
                              <button
                                className={member.is_active ? 'ghost-button danger-ghost' : 'ghost-button'}
                                onClick={() => handleToggleMemberActive(member.id, member.is_active)}
                              >
                                {member.is_active ? 'Deactivate' : 'Reactivate'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {teamMembers.length === 0 && <div className="empty-panel">No team members found.</div>}
                    </div>
                  </section>

                  <section className="panel settings-panel">
                    <div className="panel-header">
                      <div><div className="eyebrow">Password reset</div><h3>Send reset email</h3></div>
                    </div>
                    <form onSubmit={handleSendResetEmail} className="settings-form">
                      <label>
                        Team member email
                        <input type="email" value={resetEmailTarget} onChange={(e) => setResetEmailTarget(e.target.value)}
                          required placeholder="team@rfernandez.ca" />
                      </label>
                      <div className="settings-form-footer">
                        <div className="settings-meta">A reset link will be sent to their email.</div>
                        <button className="primary-button" type="submit" disabled={resetEmailSending || !resetEmailTarget.trim()}>
                          {resetEmailSending ? 'Sending...' : 'Send reset link'}
                        </button>
                      </div>
                    </form>
                  </section>

                  <section className="panel">
                    <div className="panel-header">
                      <div><div className="eyebrow">Add staff</div><h3>Create new account</h3></div>
                    </div>
                    <p className="settings-meta" style={{ marginTop: 0, lineHeight: 1.7 }}>
                      To add a new team member, create their account in the Supabase Auth dashboard.
                      Their profile will appear here automatically once their account is created.
                    </p>
                  </section>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Client Form Modal ── */}
      {showClientForm && (
        <div className="modal-backdrop" onClick={() => setShowClientForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <div>
                <div className="eyebrow">Client form</div>
                <h3>{editingClientId ? 'Edit client' : 'Add client'}</h3>
              </div>
              <button className="ghost-button" onClick={() => setShowClientForm(false)}>Close</button>
            </div>

            <div className="modal-body">
              <div className="form-section-label">Personal information</div>
              <div className="form-grid">
                <label>Full name<input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} maxLength={100} /></label>
                <label>Date of birth<input type="date" value={draft.date_of_birth} onChange={(e) => setDraft({ ...draft, date_of_birth: e.target.value })} /></label>
                <label>
                  SIN {editingClientId && <span className="form-hint">(leave blank to keep current)</span>}
                  <input value={draft.sin_full} onChange={(e) => setDraft({ ...draft, sin_full: e.target.value })}
                    placeholder="123-456-789 — stored securely" autoComplete="off" maxLength={11} inputMode="numeric" />
                </label>
                <label>Phone<input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} maxLength={20} /></label>
                <label>Email<input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} maxLength={100} /></label>
                <label>
                  Status
                  <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ClientStatus })}>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Closed">Closed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </label>
                <label>
                  Marital status
                  <select value={draft.marital_status} onChange={(e) => setDraft({ ...draft, marital_status: e.target.value as MaritalStatus })}>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Common-law">Common-law</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Separated">Separated</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </label>
                <label>Spouse name<input value={draft.spouse_name} onChange={(e) => setDraft({ ...draft, spouse_name: e.target.value })} /></label>
                <label className="form-span-2">Mailing address<input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} maxLength={200} /></label>
                <label className="form-span-2">File location<input value={draft.file_location} onChange={(e) => setDraft({ ...draft, file_location: e.target.value })} maxLength={200} /></label>
              </div>

              <div className="form-section-label">Mortgage & lending</div>
              <div className="form-grid">
                <label>
                  Mortgage type
                  <select value={draft.mortgage_type} onChange={(e) => setDraft({ ...draft, mortgage_type: e.target.value as MortgageType | '' })}>
                    <option value="">— Select —</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Refinance">Refinance</option>
                    <option value="Renewal">Renewal</option>
                    <option value="HELOC">HELOC</option>
                    <option value="Bridge">Bridge</option>
                    <option value="Construction">Construction</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label>Lender<input value={draft.lender} onChange={(e) => setDraft({ ...draft, lender: e.target.value })} maxLength={100} placeholder="TD, RBC, First National..." /></label>
                <label>
                  Loan amount (CAD)
                  <input type="number" value={draft.loan_amount} onChange={(e) => setDraft({ ...draft, loan_amount: e.target.value })}
                    min="0" step="1000" placeholder="500000" />
                </label>
                <label>Rate expiry date<input type="date" value={draft.rate_expiry_date} onChange={(e) => setDraft({ ...draft, rate_expiry_date: e.target.value })} /></label>
                <label className="form-span-2">Property address<input value={draft.property_address} onChange={(e) => setDraft({ ...draft, property_address: e.target.value })} maxLength={200} /></label>
                <label className="form-span-2">Referral source<input value={draft.referral_source} onChange={(e) => setDraft({ ...draft, referral_source: e.target.value })} maxLength={100} placeholder="Realtor, Web, Client referral..." /></label>
              </div>
            </div>

            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setShowClientForm(false)}>Cancel</button>
              <button className="primary-button" onClick={handleSaveClient} disabled={saving || !draft.full_name}>
                {saving ? 'Saving...' : 'Save client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <section className="panel stat-card">
      <div className="eyebrow">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="muted-text">{detail}</div>
    </section>
  )
}

function StatusBadge({ status }: { status: ClientStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>
}

const FREE_TIER_BYTES = 500 * 1024 * 1024 // 500 MB

function DbUsageCard({ stats }: { stats: DbStats | null }) {
  const used = stats?.db_size_bytes ?? 0
  const pct = Math.min((used / FREE_TIER_BYTES) * 100, 100)
  const color = pct >= 85 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981'

  return (
    <section className="panel stat-card db-usage-card">
      <div className="eyebrow">Database (Supabase free)</div>
      {stats ? (
        <>
          <div className="stat-value" style={{ fontSize: 22 }}>{stats.db_size_pretty}</div>
          <div className="db-usage-bar-track">
            <div className="db-usage-bar-fill" style={{ width: `${pct}%`, background: color }} />
          </div>
          <div className="db-usage-meta">
            <span style={{ color }}>{pct.toFixed(1)}% of 500 MB used</span>
            <span>{stats.client_count} clients · {stats.note_count} notes · {stats.audit_count} audit entries</span>
          </div>
        </>
      ) : (
        <div className="muted-text" style={{ fontSize: 13 }}>Loading...</div>
      )}
    </section>
  )
}

function DetailItem({ label, value, action }: { label: string; value: string; action?: ReactNode }) {
  return (
    <div className="detail-item">
      <div className="detail-label-row">
        <span className="detail-label">{label}</span>
        {action}
      </div>
      <div className="detail-value">{value}</div>
    </div>
  )
}
