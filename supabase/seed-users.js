// One-time script to create CRM users via Supabase Admin API
// Run: node supabase/seed-users.js
//
// Uses service_role key — never expose this in the frontend.
// Run from: c:\Users\Reyam\Downloads\AI\crm-app

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const users = [
  {
    email: 'broker@crm.local',
    password: 'Broker@2026!',
    name: 'Rey Cruz',
    role: 'Broker / Owner',
  },
  {
    email: 'assistant@crm.local',
    password: 'Assistant@2026!',
    name: 'Mia Santos',
    role: 'Admin Assistant',
  },
  {
    email: 'manager@crm.local',
    password: 'Manager@2026!',
    name: 'Lea Navarro',
    role: 'Manager / Compliance',
  },
]

async function seedUsers() {
  console.log('Creating CRM users...\n')

  for (const user of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        name: user.name,
        role: user.role,
      },
    })

    if (error) {
      // User may already exist
      if (error.message.includes('already been registered')) {
        console.log(`SKIP  ${user.email} — already exists`)
      } else {
        console.error(`FAIL  ${user.email} — ${error.message}`)
      }
    } else {
      console.log(`OK    ${user.email} | ${user.role} | id: ${data.user.id}`)
    }
  }

  console.log('\nDone. Login credentials:')
  users.forEach(u => console.log(`  ${u.role.padEnd(22)} ${u.email}  /  ${u.password}`))
}

seedUsers()
