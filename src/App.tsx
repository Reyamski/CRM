import { useEffect, useMemo, useState, type ReactNode } from 'react'
import './App.css'
import { supabase } from './lib/supabase'
import {
  getProfile,
  getClients,
  getNotes,
  getSinFull,
  getAuditLog,
  createClient as dbCreateClient,
  updateClient as dbUpdateClient,
  addNote as dbAddNote,
  addAuditEntry,
} from './lib/queries'
import type {
  Profile,
  Client,
  ClientNote,
  AuditEntry,
  ClientDraft,
  ClientStatus,
  MaritalStatus,
} from './lib/types'

// ── Helpers ───────────────────────────────────────────────

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function emptyDraft(): ClientDraft {
  return {
    full_name: '',
    date_of_birth: '',
    sin_full: '',
    address: '',
    email: '',
    phone: '',
    marital_status: 'Single',
    spouse_name: '',
    file_location: '',
    status: 'Pending',
  }
}

// ── App ───────────────────────────────────────────────────

export default function App() {
  // Auth state
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Data state
  const [clients, setClients] = useState<Client[]>([])
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  // UI state
  const [activeView, setActiveView] = useState<'dashboard' | 'clients' | 'audit'>('dashboard')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'All'>('All')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [revealedSins, setRevealedSins] = useState<Record<string, string>>({})
  const [showClientForm, setShowClientForm] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ClientDraft>(emptyDraft())
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  const canRevealSin =
    profile?.role === 'Broker / Owner' || profile?.role === 'Manager / Compliance'
  const canViewAudit =
    profile?.role === 'Broker / Owner' || profile?.role === 'Manager / Compliance'

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null

  // ── Auth bootstrap ──────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const p = await getProfile(session.user.id)
        setProfile(p)
      }
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const p = await getProfile(session.user.id)
        setProfile(p)
      } else {
        setProfile(null)
        setClients([])
        setNotes([])
        setAuditLog([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Load data after login ────────────────────────────────

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

  // ── Load notes when selected client changes ───────────────

  useEffect(() => {
    if (!selectedClientId) return
    getNotes(selectedClientId).then(setNotes)
  }, [selectedClientId])

  // ── Load audit log when switching to audit view ───────────

  useEffect(() => {
    if (activeView === 'audit' && canViewAudit) {
      getAuditLog().then(setAuditLog)
    }
  }, [activeView, canViewAudit])

  // ── Filtered clients ─────────────────────────────────────

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter
      const haystack = [c.full_name, c.email, c.phone, c.address, c.file_location]
        .join(' ')
        .toLowerCase()
      return matchesStatus && haystack.includes(search.toLowerCase())
    })
  }, [clients, search, statusFilter])

  const dashboardStats = useMemo(() => {
    const activeCount = clients.filter((c) => c.status === 'Active').length
    const pendingCount = clients.filter((c) => c.status === 'Pending').length
    const archivedCount = clients.filter((c) => c.status === 'Archived').length
    const recentUpdates = [...clients]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 3)
    return { activeCount, pendingCount, archivedCount, recentUpdates }
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
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })
    if (error) setLoginError(error.message)
    setLoginLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleSaveClient = async () => {
    if (!profile) return
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
    } catch (err) {
      console.error('Save client error:', err)
    } finally {
      setSaving(false)
    }
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
      // Refresh audit log if currently viewing it
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
    })
    setShowClientForm(true)
  }

  const handleOpenAdd = () => {
    setEditingClientId(null)
    setDraft(emptyDraft())
    setShowClientForm(true)
  }

  // ── Loading / Auth screens ────────────────────────────────

  if (authLoading) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="eyebrow">R Fernandez Services</div>
          <p className="supporting-text">Loading...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="eyebrow">R Fernandez Services</div>
          <h1>Secure client records</h1>
          <p className="supporting-text">Sign in to access your broker files.</p>

          <form onSubmit={handleLogin} className="login-form">
            <label>
              Email
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@brokerage.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>
            {loginError && <div className="form-error">{loginError}</div>}
            <button className="primary-button" type="submit" disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="prototype-note">
            Role and access level is determined by your account. Contact your administrator to
            create or reset accounts.
          </div>
        </div>
      </div>
    )
  }

  // ── Main App ──────────────────────────────────────────────

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-mark">CRM</div>
          <h2>R Fernandez Services</h2>
          <p className="sidebar-caption">Secure client records</p>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-name">{profile.name}</div>
          <div className="sidebar-user-role">{profile.role}</div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={activeView === 'dashboard' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActiveView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={activeView === 'clients' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActiveView('clients')}
          >
            Clients
          </button>
          <button
            className={activeView === 'audit' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActiveView('audit')}
            disabled={!canViewAudit}
          >
            Audit Log
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="ghost-button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <h1>
              {activeView === 'dashboard'
                ? 'Operational dashboard'
                : activeView === 'clients'
                  ? 'Client management'
                  : 'Audit and activity'}
            </h1>
          </div>
          <div className="topbar-actions">
            <input
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email, address..."
            />
            {activeView === 'clients' && (
              <button className="primary-button" onClick={handleOpenAdd}>
                Add client
              </button>
            )}
          </div>
        </header>

        {dataLoading && (
          <div className="empty-panel">Loading...</div>
        )}

        {!dataLoading && activeView === 'dashboard' && (
          <section className="dashboard-grid">
            <StatCard label="Active clients" value={String(dashboardStats.activeCount)} detail="Files currently in progress" />
            <StatCard label="Pending files" value={String(dashboardStats.pendingCount)} detail="Waiting on signatures or follow-up" />
            <StatCard label="Archived" value={String(dashboardStats.archivedCount)} detail="Soft-deleted or archived records" />
            <StatCard label="SIN policy" value="Masked" detail="Full SIN reveal requires role permission and is audited" />

            <section className="panel panel-span-2">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Recently updated</div>
                  <h3>Latest client activity</h3>
                </div>
              </div>
              <div className="list-stack">
                {dashboardStats.recentUpdates.map((c) => (
                  <button
                    key={c.id}
                    className="list-row"
                    onClick={() => {
                      setSelectedClientId(c.id)
                      setActiveView('clients')
                    }}
                  >
                    <div>
                      <strong>{c.full_name}</strong>
                      <div className="muted-text">{c.status} · {c.file_location}</div>
                    </div>
                    <span className="muted-text">{formatDateTime(c.updated_at)}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Access level</div>
                  <h3>Your permissions</h3>
                </div>
              </div>
              <ul className="task-list">
                <li>Role: <strong>{profile.role}</strong></li>
                <li>{canRevealSin ? 'Can reveal full SIN (audited)' : 'SIN reveal: not permitted for your role'}</li>
                <li>{canViewAudit ? 'Can view audit trail' : 'Audit log: restricted for your role'}</li>
              </ul>
            </section>
          </section>
        )}

        {!dataLoading && activeView === 'clients' && (
          <section className="clients-layout">
            <section className="panel client-table-panel">
              <div className="panel-header panel-header-wrap">
                <div>
                  <div className="eyebrow">Client table</div>
                  <h3>Broker records</h3>
                </div>
                <select
                  className="status-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ClientStatus | 'All')}
                >
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
                      <th>Name</th>
                      <th>Status</th>
                      <th>DOB</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((c) => (
                      <tr
                        key={c.id}
                        className={c.id === selectedClientId ? 'selected-row' : ''}
                        onClick={() => setSelectedClientId(c.id)}
                      >
                        <td>{c.full_name}</td>
                        <td><StatusBadge status={c.status} /></td>
                        <td>{c.date_of_birth ?? '—'}</td>
                        <td>{c.email ?? '—'}</td>
                        <td>{c.phone ?? '—'}</td>
                        <td>{formatDateTime(c.updated_at)}</td>
                      </tr>
                    ))}
                    {filteredClients.length === 0 && (
                      <tr>
                        <td colSpan={6} className="empty-panel">No clients match your search.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel detail-panel">
              {selectedClient ? (
                <>
                  <div className="panel-header">
                    <div>
                      <div className="eyebrow">Client detail</div>
                      <h3>{selectedClient.full_name}</h3>
                    </div>
                    <button className="ghost-button" onClick={() => handleOpenEdit(selectedClient)}>
                      Edit client
                    </button>
                  </div>

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
                          ? (
                              <button className="inline-action" onClick={() => handleRevealSin(selectedClient)}>
                                Reveal SIN
                              </button>
                            )
                          : undefined
                      }
                    />
                  </div>

                  {duplicateCandidates.length > 0 && (
                    <div className="warning-card">
                      <strong>Potential duplicate detected</strong>
                      <span>
                        Matching fields found in{' '}
                        {duplicateCandidates.map((c) => c.full_name).join(', ')}.
                      </span>
                    </div>
                  )}

                  <section className="notes-section">
                    <div className="notes-header">
                      <h4>Timestamped notes</h4>
                    </div>
                    <textarea
                      className="note-box"
                      rows={4}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a follow-up, compliance reminder, or file note..."
                    />
                    <div className="notes-actions">
                      <button className="primary-button" onClick={handleAddNote} disabled={!newNote.trim()}>
                        Add note
                      </button>
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

        {!dataLoading && activeView === 'audit' && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Compliance review</div>
                <h3>Audit trail</h3>
              </div>
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
                {auditLog.length === 0 && (
                  <div className="empty-panel">No audit entries yet.</div>
                )}
              </div>
            ) : (
              <div className="empty-panel">Audit log is restricted for your role.</div>
            )}
          </section>
        )}
      </main>

      {showClientForm && (
        <div className="modal-backdrop" onClick={() => setShowClientForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <div>
                <div className="eyebrow">Client form</div>
                <h3>{editingClientId ? 'Edit client' : 'Add client'}</h3>
              </div>
              <button className="ghost-button" onClick={() => setShowClientForm(false)}>
                Close
              </button>
            </div>

            <div className="form-grid">
              <label>
                Full name
                <input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} />
              </label>
              <label>
                Date of birth
                <input type="date" value={draft.date_of_birth} onChange={(e) => setDraft({ ...draft, date_of_birth: e.target.value })} />
              </label>
              <label>
                SIN {editingClientId && <span className="form-hint">(leave blank to keep current)</span>}
                <input
                  value={draft.sin_full}
                  onChange={(e) => setDraft({ ...draft, sin_full: e.target.value })}
                  placeholder="Optional — stored securely"
                  autoComplete="off"
                />
              </label>
              <label>
                Phone
                <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </label>
              <label>
                Email
                <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </label>
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
              <label>
                Spouse name
                <input value={draft.spouse_name} onChange={(e) => setDraft({ ...draft, spouse_name: e.target.value })} />
              </label>
              <label className="form-span-2">
                Address
                <input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
              </label>
              <label className="form-span-2">
                File location
                <input value={draft.file_location} onChange={(e) => setDraft({ ...draft, file_location: e.target.value })} />
              </label>
            </div>

            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setShowClientForm(false)}>
                Cancel
              </button>
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

function DetailItem({
  label,
  value,
  action,
}: {
  label: string
  value: string
  action?: ReactNode
}) {
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
