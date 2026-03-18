import { useMemo, useState, type ReactNode } from 'react'
import './App.css'

type UserRole = 'Broker / Owner' | 'Admin Assistant' | 'Manager / Compliance'
type ClientStatus = 'Active' | 'Pending' | 'Closed' | 'Archived'
type MaritalStatus =
  | 'Single'
  | 'Married'
  | 'Common-law'
  | 'Divorced'
  | 'Separated'
  | 'Widowed'

interface DemoUser {
  id: string
  name: string
  email: string
  role: UserRole
}

interface ClientNote {
  id: string
  text: string
  createdAt: string
  createdBy: string
}

interface ClientRecord {
  id: string
  fullName: string
  dateOfBirth: string
  sinMasked: string
  sinFull?: string
  address: string
  email: string
  phone: string
  maritalStatus: MaritalStatus
  spouseName?: string
  fileLocation: string
  notes: ClientNote[]
  status: ClientStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  lastModifiedBy: string
}

interface AuditEntry {
  id: string
  action: string
  actor: string
  target: string
  timestamp: string
  detail: string
}

const demoUsers: DemoUser[] = [
  { id: 'u1', name: 'Rey Cruz', email: 'broker@demo.local', role: 'Broker / Owner' },
  { id: 'u2', name: 'Mia Santos', email: 'assistant@demo.local', role: 'Admin Assistant' },
  { id: 'u3', name: 'Lea Navarro', email: 'manager@demo.local', role: 'Manager / Compliance' },
]

const initialClients: ClientRecord[] = [
  {
    id: 'c1',
    fullName: 'Avery Collins',
    dateOfBirth: '1986-07-14',
    sinMasked: '***-***-284',
    sinFull: '512-443-284',
    address: '120 Front St W, Toronto, ON',
    email: 'avery.collins@example.test',
    phone: '(416) 555-0182',
    maritalStatus: 'Married',
    spouseName: 'Jordan Collins',
    fileLocation: 'Cabinet A / Drawer 3 / Condo Renewals',
    notes: [
      {
        id: 'n1',
        text: 'Requested mortgage renewal summary and updated income confirmation.',
        createdAt: '2026-03-17T14:10:00.000Z',
        createdBy: 'Rey Cruz',
      },
      {
        id: 'n2',
        text: 'Waiting on spouse signature package before submission.',
        createdAt: '2026-03-18T09:25:00.000Z',
        createdBy: 'Mia Santos',
      },
    ],
    status: 'Active',
    createdAt: '2026-02-10T15:20:00.000Z',
    updatedAt: '2026-03-18T09:25:00.000Z',
    createdBy: 'Rey Cruz',
    lastModifiedBy: 'Mia Santos',
  },
  {
    id: 'c2',
    fullName: 'Noah Mercer',
    dateOfBirth: '1991-11-03',
    sinMasked: '***-***-913',
    sinFull: '621-882-913',
    address: '51 River St, Ottawa, ON',
    email: 'noah.mercer@example.test',
    phone: '(613) 555-0144',
    maritalStatus: 'Single',
    fileLocation: 'Digital Vault / 2026 / Renewals / Mercer',
    notes: [
      {
        id: 'n3',
        text: 'Duplicate warning with prior intake resolved after confirming corrected DOB.',
        createdAt: '2026-03-16T10:05:00.000Z',
        createdBy: 'Lea Navarro',
      },
    ],
    status: 'Pending',
    createdAt: '2026-03-01T11:40:00.000Z',
    updatedAt: '2026-03-16T10:05:00.000Z',
    createdBy: 'Mia Santos',
    lastModifiedBy: 'Lea Navarro',
  },
  {
    id: 'c3',
    fullName: 'Priya Sandhu',
    dateOfBirth: '1979-02-28',
    sinMasked: 'Not collected',
    address: '88 Marine Dr, Vancouver, BC',
    email: 'priya.sandhu@example.test',
    phone: '(604) 555-0118',
    maritalStatus: 'Common-law',
    spouseName: 'Karan Singh',
    fileLocation: 'Cabinet C / Estate Files',
    notes: [
      {
        id: 'n4',
        text: 'Privacy notice acknowledged verbally. Written acknowledgment pending upload in final product.',
        createdAt: '2026-03-11T17:40:00.000Z',
        createdBy: 'Rey Cruz',
      },
    ],
    status: 'Closed',
    createdAt: '2025-12-20T12:15:00.000Z',
    updatedAt: '2026-03-11T17:40:00.000Z',
    createdBy: 'Rey Cruz',
    lastModifiedBy: 'Rey Cruz',
  },
]

const initialAuditLog: AuditEntry[] = [
  {
    id: 'a1',
    action: 'CLIENT_UPDATED',
    actor: 'Mia Santos',
    target: 'Avery Collins',
    timestamp: '2026-03-18T09:25:00.000Z',
    detail: 'Updated file location and added a follow-up note.',
  },
  {
    id: 'a2',
    action: 'SENSITIVE_FIELD_VIEW',
    actor: 'Lea Navarro',
    target: 'Noah Mercer',
    timestamp: '2026-03-17T15:10:00.000Z',
    detail: 'Revealed masked SIN for compliance spot check.',
  },
  {
    id: 'a3',
    action: 'CLIENT_CREATED',
    actor: 'Mia Santos',
    target: 'Noah Mercer',
    timestamp: '2026-03-01T11:40:00.000Z',
    detail: 'Created a new pending client record.',
  },
]

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function emptyClient(): ClientRecord {
  const now = new Date().toISOString()
  return {
    id: `c-${Math.random().toString(36).slice(2, 9)}`,
    fullName: '',
    dateOfBirth: '',
    sinMasked: 'Not collected',
    address: '',
    email: '',
    phone: '',
    maritalStatus: 'Single',
    spouseName: '',
    fileLocation: '',
    notes: [],
    status: 'Pending',
    createdAt: now,
    updatedAt: now,
    createdBy: '',
    lastModifiedBy: '',
  }
}

function App() {
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null)
  const [clients, setClients] = useState<ClientRecord[]>(initialClients)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(initialAuditLog)
  const [activeView, setActiveView] = useState<'dashboard' | 'clients' | 'audit'>('dashboard')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'All'>('All')
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClients[0].id)
  const [revealedSinIds, setRevealedSinIds] = useState<string[]>([])
  const [showClientForm, setShowClientForm] = useState(false)
  const [draftClient, setDraftClient] = useState<ClientRecord>(emptyClient())
  const [newNote, setNewNote] = useState('')

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null
  const canRevealSin =
    currentUser?.role === 'Broker / Owner' || currentUser?.role === 'Manager / Compliance'
  const canViewAudit =
    currentUser?.role === 'Broker / Owner' || currentUser?.role === 'Manager / Compliance'

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesStatus = statusFilter === 'All' || client.status === statusFilter
      const haystack = [
        client.fullName,
        client.email,
        client.phone,
        client.address,
        client.fileLocation,
      ]
        .join(' ')
        .toLowerCase()
      return matchesStatus && haystack.includes(search.toLowerCase())
    })
  }, [clients, search, statusFilter])

  const dashboardStats = useMemo(() => {
    const activeCount = clients.filter((client) => client.status === 'Active').length
    const pendingCount = clients.filter((client) => client.status === 'Pending').length
    const archivedCount = clients.filter((client) => client.status === 'Archived').length
    const recentUpdates = [...clients]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3)
    return { activeCount, pendingCount, archivedCount, recentUpdates }
  }, [clients])

  const addAuditEntry = (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditEntry = {
      id: `a-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    }
    setAuditLog((current) => [newEntry, ...current])
  }

  const handleSaveClient = () => {
    if (!currentUser) return

    const isNew = !clients.some((client) => client.id === draftClient.id)
    const now = new Date().toISOString()
    const normalized = {
      ...draftClient,
      spouseName: draftClient.maritalStatus === 'Married' || draftClient.maritalStatus === 'Common-law'
        ? draftClient.spouseName
        : '',
      updatedAt: now,
      lastModifiedBy: currentUser.name,
      createdAt: isNew ? now : draftClient.createdAt,
      createdBy: isNew ? currentUser.name : draftClient.createdBy,
      sinMasked: draftClient.sinFull
        ? `***-***-${draftClient.sinFull.slice(-3)}`
        : 'Not collected',
    }

    setClients((current) =>
      isNew
        ? [normalized, ...current]
        : current.map((client) => (client.id === normalized.id ? normalized : client)),
    )
    setSelectedClientId(normalized.id)
    setShowClientForm(false)
    addAuditEntry({
      action: isNew ? 'CLIENT_CREATED' : 'CLIENT_UPDATED',
      actor: currentUser.name,
      target: normalized.fullName || 'Draft client',
      detail: isNew
        ? 'Created a new prototype client record.'
        : 'Updated client profile details.',
    })
  }

  const handleAddNote = () => {
    if (!currentUser || !selectedClient || !newNote.trim()) return
    const createdAt = new Date().toISOString()
    const note: ClientNote = {
      id: `n-${Math.random().toString(36).slice(2, 9)}`,
      text: newNote.trim(),
      createdAt,
      createdBy: currentUser.name,
    }

    setClients((current) =>
      current.map((client) =>
        client.id === selectedClient.id
          ? {
              ...client,
              notes: [note, ...client.notes],
              updatedAt: createdAt,
              lastModifiedBy: currentUser.name,
            }
          : client,
      ),
    )
    setNewNote('')
    addAuditEntry({
      action: 'NOTE_ADDED',
      actor: currentUser.name,
      target: selectedClient.fullName,
      detail: 'Added a timestamped client note.',
    })
  }

  const handleRevealSin = (client: ClientRecord) => {
    if (!currentUser || !canRevealSin) return
    if (!revealedSinIds.includes(client.id)) {
      setRevealedSinIds((current) => [...current, client.id])
      addAuditEntry({
        action: 'SENSITIVE_FIELD_VIEW',
        actor: currentUser.name,
        target: client.fullName,
        detail: 'Revealed masked SIN in prototype client detail view.',
      })
    }
  }

  const duplicateCandidates = useMemo(() => {
    if (!selectedClient) return []
    return clients.filter((client) => {
      if (client.id === selectedClient.id) return false
      return (
        client.fullName === selectedClient.fullName ||
        client.email === selectedClient.email ||
        client.phone === selectedClient.phone
      )
    })
  }, [clients, selectedClient])

  if (!currentUser) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="eyebrow">Broker CRM Prototype</div>
          <h1>Secure client records, mocked for testing</h1>
          <p className="supporting-text">
            Frontend-only demo with fake data, masked SIN behavior, role-aware views, audit history,
            and a production-style layout.
          </p>

          <div className="demo-user-grid">
            {demoUsers.map((user) => (
              <button
                key={user.id}
                className="demo-user-card"
                onClick={() => setCurrentUser(user)}
              >
                <div className="demo-user-role">{user.role}</div>
                <div className="demo-user-name">{user.name}</div>
                <div className="demo-user-email">{user.email}</div>
              </button>
            ))}
          </div>

          <div className="prototype-note">
            Demo login only. In the real app this becomes secure auth, CSRF protection, session timeout,
            password reset, and audited sensitive access.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-mark">CRM</div>
          <h2>Broker Client Vault</h2>
          <p className="sidebar-caption">High-sensitivity broker records prototype</p>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-name">{currentUser.name}</div>
          <div className="sidebar-user-role">{currentUser.role}</div>
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
          <div>Fake demo data only</div>
          <button className="ghost-button" onClick={() => setCurrentUser(null)}>
            Switch user
          </button>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">Prototype Mode</div>
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Quick search name, phone, email, address..."
            />
            {activeView === 'clients' && (
              <button
                className="primary-button"
                onClick={() => {
                  setDraftClient(emptyClient())
                  setShowClientForm(true)
                }}
              >
                Add client
              </button>
            )}
          </div>
        </header>

        {activeView === 'dashboard' && (
          <section className="dashboard-grid">
            <StatCard label="Active clients" value={String(dashboardStats.activeCount)} detail="Broker-owned files currently in progress" />
            <StatCard label="Pending files" value={String(dashboardStats.pendingCount)} detail="Records waiting on signatures or follow-up" />
            <StatCard label="Archived" value={String(dashboardStats.archivedCount)} detail="Soft-deleted or archived records retained for review" />
            <StatCard label="Masked SIN policy" value="On" detail="Full SIN reveal requires role permission and audit logging" />

            <section className="panel panel-span-2">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Recently updated</div>
                  <h3>Latest client activity</h3>
                </div>
              </div>
              <div className="list-stack">
                {dashboardStats.recentUpdates.map((client) => (
                  <button
                    key={client.id}
                    className="list-row"
                    onClick={() => {
                      setSelectedClientId(client.id)
                      setActiveView('clients')
                    }}
                  >
                    <div>
                      <strong>{client.fullName}</strong>
                      <div className="muted-text">{client.status} · {client.fileLocation}</div>
                    </div>
                    <span className="muted-text">{formatDateTime(client.updatedAt)}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Tasks placeholder</div>
                  <h3>What comes next</h3>
                </div>
              </div>
              <ul className="task-list">
                <li>Follow up on pending signature package for Avery Collins</li>
                <li>Review duplicate detection warning for new intake submissions</li>
                <li>Prepare redacted export flow for compliance review</li>
              </ul>
            </section>
          </section>
        )}

        {activeView === 'clients' && (
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
                  onChange={(event) => setStatusFilter(event.target.value as ClientStatus | 'All')}
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
                    {filteredClients.map((client) => (
                      <tr
                        key={client.id}
                        className={client.id === selectedClientId ? 'selected-row' : ''}
                        onClick={() => setSelectedClientId(client.id)}
                      >
                        <td>{client.fullName}</td>
                        <td><StatusBadge status={client.status} /></td>
                        <td>{client.dateOfBirth}</td>
                        <td>{client.email}</td>
                        <td>{client.phone}</td>
                        <td>{formatDateTime(client.updatedAt)}</td>
                      </tr>
                    ))}
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
                      <h3>{selectedClient.fullName}</h3>
                    </div>
                    <button
                      className="ghost-button"
                      onClick={() => {
                        setDraftClient(selectedClient)
                        setShowClientForm(true)
                      }}
                    >
                      Edit client
                    </button>
                  </div>

                  <div className="detail-grid">
                    <DetailItem label="Status" value={selectedClient.status} />
                    <DetailItem label="Date of birth" value={selectedClient.dateOfBirth} />
                    <DetailItem label="Email" value={selectedClient.email} />
                    <DetailItem label="Phone" value={selectedClient.phone} />
                    <DetailItem label="Address" value={selectedClient.address} />
                    <DetailItem label="Marital status" value={selectedClient.maritalStatus} />
                    {(selectedClient.maritalStatus === 'Married' || selectedClient.maritalStatus === 'Common-law') && (
                      <DetailItem label="Spouse" value={selectedClient.spouseName || 'Not entered'} />
                    )}
                    <DetailItem label="File location" value={selectedClient.fileLocation} />
                    <DetailItem
                      label="SIN"
                      value={
                        revealedSinIds.includes(selectedClient.id) && selectedClient.sinFull
                          ? selectedClient.sinFull
                          : selectedClient.sinMasked
                      }
                      action={
                        canRevealSin && selectedClient.sinFull && !revealedSinIds.includes(selectedClient.id)
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
                        Matching fields found in {duplicateCandidates.map((client) => client.fullName).join(', ')}.
                      </span>
                    </div>
                  )}

                  <section className="notes-section">
                    <div className="notes-header">
                      <h4>Timestamped notes</h4>
                      <span className="muted-text">All note activity is mock-audited in this prototype</span>
                    </div>
                    <textarea
                      className="note-box"
                      rows={4}
                      value={newNote}
                      onChange={(event) => setNewNote(event.target.value)}
                      placeholder="Add a follow-up, compliance reminder, or file handling note..."
                    />
                    <div className="notes-actions">
                      <button className="primary-button" onClick={handleAddNote}>
                        Add note
                      </button>
                    </div>
                    <div className="note-list">
                      {selectedClient.notes.map((note) => (
                        <article key={note.id} className="note-card">
                          <div className="note-meta">
                            <strong>{note.createdBy}</strong>
                            <span>{formatDateTime(note.createdAt)}</span>
                          </div>
                          <p>{note.text}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                </>
              ) : (
                <div className="empty-panel">Select a client to open the detail drawer content.</div>
              )}
            </section>
          </section>
        )}

        {activeView === 'audit' && (
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
                      <div className="muted-text">{entry.actor} · {entry.target}</div>
                    </div>
                    <div className="audit-detail">
                      <div>{entry.detail}</div>
                      <div className="muted-text">{formatDateTime(entry.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-panel">
                Audit log view is hidden for the Admin Assistant role in this prototype.
              </div>
            )}
          </section>
        )}
      </main>

      {showClientForm && (
        <div className="modal-backdrop" onClick={() => setShowClientForm(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <div className="eyebrow">Client form</div>
                <h3>{clients.some((client) => client.id === draftClient.id) ? 'Edit client' : 'Add client'}</h3>
              </div>
              <button className="ghost-button" onClick={() => setShowClientForm(false)}>
                Close
              </button>
            </div>

            <div className="form-grid">
              <label>
                Full name
                <input value={draftClient.fullName} onChange={(event) => setDraftClient({ ...draftClient, fullName: event.target.value })} />
              </label>
              <label>
                Date of birth
                <input type="date" value={draftClient.dateOfBirth} onChange={(event) => setDraftClient({ ...draftClient, dateOfBirth: event.target.value })} />
              </label>
              <label>
                SIN
                <input value={draftClient.sinFull || ''} onChange={(event) => setDraftClient({ ...draftClient, sinFull: event.target.value })} placeholder="Optional, masked by default" />
              </label>
              <label>
                Phone
                <input value={draftClient.phone} onChange={(event) => setDraftClient({ ...draftClient, phone: event.target.value })} />
              </label>
              <label>
                Email
                <input value={draftClient.email} onChange={(event) => setDraftClient({ ...draftClient, email: event.target.value })} />
              </label>
              <label>
                Status
                <select value={draftClient.status} onChange={(event) => setDraftClient({ ...draftClient, status: event.target.value as ClientStatus })}>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Closed">Closed</option>
                  <option value="Archived">Archived</option>
                </select>
              </label>
              <label>
                Marital status
                <select value={draftClient.maritalStatus} onChange={(event) => setDraftClient({ ...draftClient, maritalStatus: event.target.value as MaritalStatus })}>
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
                <input value={draftClient.spouseName || ''} onChange={(event) => setDraftClient({ ...draftClient, spouseName: event.target.value })} />
              </label>
              <label className="form-span-2">
                Address
                <input value={draftClient.address} onChange={(event) => setDraftClient({ ...draftClient, address: event.target.value })} />
              </label>
              <label className="form-span-2">
                File location
                <input value={draftClient.fileLocation} onChange={(event) => setDraftClient({ ...draftClient, fileLocation: event.target.value })} />
              </label>
            </div>

            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setShowClientForm(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleSaveClient}>
                Save client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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

export default App
