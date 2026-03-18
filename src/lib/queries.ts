import { supabase } from './supabase'
import type { Client, ClientDraft, ClientNote, AuditEntry, Profile, DbStats } from './types'

// ── Profile ───────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .eq('is_active', true)
    .single()
  if (error) return null
  return data as Profile
}

export async function getTeamMembers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as Profile[]
}

export async function updateDisplayName(name: string): Promise<void> {
  const { error } = await supabase.rpc('update_display_name', { new_name: name })
  if (error) throw error
}

export async function getDbStats(): Promise<DbStats | null> {
  const { data, error } = await supabase.rpc('get_db_stats').single()
  if (error) return null
  return data as DbStats
}

export async function setMemberActive(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_member_active', {
    target_user_id: userId,
    active: isActive,
  })
  if (error) throw error
}

// ── Clients ───────────────────────────────────────────────

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Client[]
}

export async function getSinFull(clientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('client_sensitive')
    .select('sin_full')
    .eq('client_id', clientId)
    .single()
  if (error) return null
  return data?.sin_full ?? null
}

export async function createClient(
  draft: ClientDraft,
  userId: string,
  userName: string
): Promise<Client> {
  const sinMasked = draft.sin_full
    ? `***-***-${draft.sin_full.replace(/\D/g, '').slice(-3)}`
    : 'Not collected'

  const { data, error } = await supabase
    .from('clients')
    .insert({
      full_name: draft.full_name,
      date_of_birth: draft.date_of_birth || null,
      sin_masked: sinMasked,
      address: draft.address || null,
      email: draft.email || null,
      phone: draft.phone || null,
      marital_status: draft.marital_status,
      spouse_name:
        draft.marital_status === 'Married' || draft.marital_status === 'Common-law'
          ? draft.spouse_name || null
          : null,
      file_location: draft.file_location || null,
      status: draft.status,
      mortgage_type: draft.mortgage_type || null,
      lender: draft.lender || null,
      property_address: draft.property_address || null,
      loan_amount: draft.loan_amount ? parseFloat(draft.loan_amount) : null,
      rate_expiry_date: draft.rate_expiry_date || null,
      referral_source: draft.referral_source || null,
      created_by: userId,
      created_by_name: userName,
      last_modified_by: userId,
      last_modified_by_name: userName,
    })
    .select()
    .single()

  if (error) throw error

  if (draft.sin_full) {
    await supabase.from('client_sensitive').insert({
      client_id: data.id,
      sin_full: draft.sin_full,
    })
  }

  return data as Client
}

export async function updateClient(
  clientId: string,
  draft: ClientDraft,
  userId: string,
  userName: string
): Promise<Client> {
  const updatePayload: Record<string, unknown> = {
    full_name: draft.full_name,
    date_of_birth: draft.date_of_birth || null,
    address: draft.address || null,
    email: draft.email || null,
    phone: draft.phone || null,
    marital_status: draft.marital_status,
    spouse_name:
      draft.marital_status === 'Married' || draft.marital_status === 'Common-law'
        ? draft.spouse_name || null
        : null,
    file_location: draft.file_location || null,
    status: draft.status,
    mortgage_type: draft.mortgage_type || null,
    lender: draft.lender || null,
    property_address: draft.property_address || null,
    loan_amount: draft.loan_amount ? parseFloat(draft.loan_amount) : null,
    rate_expiry_date: draft.rate_expiry_date || null,
    referral_source: draft.referral_source || null,
    last_modified_by: userId,
    last_modified_by_name: userName,
  }

  // Only update sin_masked if a new SIN was provided (don't overwrite with 'Not collected')
  if (draft.sin_full) {
    updatePayload.sin_masked = `***-***-${draft.sin_full.replace(/\D/g, '').slice(-3)}`
  }

  const { data, error } = await supabase
    .from('clients')
    .update(updatePayload)
    .eq('id', clientId)
    .select()
    .single()

  if (error) throw error

  if (draft.sin_full) {
    await supabase.from('client_sensitive').upsert({
      client_id: clientId,
      sin_full: draft.sin_full,
    })
  }

  return data as Client
}

// ── Notes ─────────────────────────────────────────────────

export async function getNotes(clientId: string): Promise<ClientNote[]> {
  const { data, error } = await supabase
    .from('client_notes')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ClientNote[]
}

export async function addNote(
  clientId: string,
  text: string,
  userId: string,
  userName: string
): Promise<ClientNote> {
  const { data, error } = await supabase
    .from('client_notes')
    .insert({ client_id: clientId, text, created_by: userId, created_by_name: userName })
    .select()
    .single()
  if (error) throw error
  return data as ClientNote
}

// ── Audit Log ─────────────────────────────────────────────

export async function getAuditLog(): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? []) as AuditEntry[]
}

export async function addAuditEntry(
  action: string,
  actorId: string,
  actorName: string,
  targetName: string,
  detail: string
): Promise<void> {
  await supabase.from('audit_log').insert({
    action,
    actor_id: actorId,
    actor_name: actorName,
    target_name: targetName,
    detail,
  })
}
