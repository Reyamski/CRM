export type UserRole = 'Broker / Owner' | 'Admin Assistant' | 'Manager / Compliance'
export type ClientStatus = 'Active' | 'Pending' | 'Closed' | 'Archived'
export type MaritalStatus =
  | 'Single'
  | 'Married'
  | 'Common-law'
  | 'Divorced'
  | 'Separated'
  | 'Widowed'

export interface Profile {
  id: string
  name: string
  role: UserRole
  created_at: string
}

export interface Client {
  id: string
  full_name: string
  date_of_birth: string | null
  sin_masked: string
  address: string | null
  email: string | null
  phone: string | null
  marital_status: MaritalStatus | null
  spouse_name: string | null
  file_location: string | null
  client_year: string | null
  status: ClientStatus
  created_by: string | null
  created_by_name: string | null
  last_modified_by: string | null
  last_modified_by_name: string | null
  created_at: string
  updated_at: string
  // joined from client_sensitive (only for authorized roles)
  sin_full?: string | null
  // joined from client_notes
  notes?: ClientNote[]
}

export interface ClientNote {
  id: string
  client_id: string
  text: string
  created_by: string | null
  created_by_name: string | null
  created_at: string
}

export interface ClientDocument {
  id: string
  client_id: string
  file_name: string
  file_path: string
  file_size: number
  uploaded_by: string | null
  uploaded_by_name: string | null
  created_at: string
}

export interface AuditEntry {
  id: string
  action: string
  actor_id: string | null
  actor_name: string
  target_name: string
  detail: string | null
  created_at: string
}

export type ClientDraft = {
  full_name: string
  date_of_birth: string
  sin_full: string
  address: string
  email: string
  phone: string
  marital_status: MaritalStatus
  spouse_name: string
  file_location: string
  client_year: string
  status: ClientStatus
}
