import { supabase } from './supabase'
import type { Client, ClientDraft, ClientNote, AuditEntry, Profile } from './types'

// ── Profile ───────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data as Profile
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

export async function getClientWithNotes(clientId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select(`*, notes:client_notes(*)`)
    .eq('id', clientId)
    .single()
  if (error) return null
  return data as Client
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
      created_by: userId,
      created_by_name: userName,
      last_modified_by: userId,
      last_modified_by_name: userName,
    })
    .select()
    .single()

  if (error) throw error

  // Store sensitive SIN separately
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
  const sinMasked = draft.sin_full
    ? `***-***-${draft.sin_full.replace(/\D/g, '').slice(-3)}`
    : 'Not collected'

  const { data, error } = await supabase
    .from('clients')
    .update({
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
      last_modified_by: userId,
      last_modified_by_name: userName,
    })
    .eq('id', clientId)
    .select()
    .single()

  if (error) throw error

  // Upsert sensitive SIN
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
    .insert({
      client_id: clientId,
      text,
      created_by: userId,
      created_by_name: userName,
    })
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
