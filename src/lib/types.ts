export type UserRole = 'Broker / Owner' | 'Admin Assistant' | 'Manager / Compliance'
export type ClientStatus = 'Active' | 'Pending' | 'Closed' | 'Archived'
export type MaritalStatus =
  | 'Single'
  | 'Married'
  | 'Common-law'
  | 'Divorced'
  | 'Separated'
  | 'Widowed'
export type MortgageType =
  | 'Purchase'
  | 'Refinance'
  | 'Renewal'
  | 'HELOC'
  | 'Bridge'
  | 'Construction'
  | 'Other'

export interface Profile {
  id: string
  name: string
  role: UserRole
  email: string | null
  is_active: boolean
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
  status: ClientStatus
  // Mortgage fields
  mortgage_type: MortgageType | null
  lender: string | null
  property_address: string | null
  loan_amount: number | null
  rate_expiry_date: string | null
  referral_source: string | null
  // Metadata
  created_by: string | null
  created_by_name: string | null
  last_modified_by: string | null
  last_modified_by_name: string | null
  created_at: string
  updated_at: string
  sin_full?: string | null
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

export interface AuditEntry {
  id: string
  action: string
  actor_id: string | null
  actor_name: string
  target_name: string
  detail: string | null
  created_at: string
}

export interface DbStats {
  db_size_bytes: number
  db_size_pretty: string
  client_count: number
  note_count: number
  audit_count: number
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
  status: ClientStatus
  mortgage_type: MortgageType | ''
  lender: string
  property_address: string
  loan_amount: string
  rate_expiry_date: string
  referral_source: string
}
