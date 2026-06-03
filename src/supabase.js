import { createClient } from '@supabase/supabase-js'

// Läses från miljövariabler (Netlify) eller .env.local lokalt.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Är molnsynk påslaget? (Annars körs appen i lokalt läge med localStorage.)
export const supabaseEnabled = Boolean(url && anonKey)

export const supabase = supabaseEnabled ? createClient(url, anonKey) : null

// Vi lagrar hela turneringen i en enda rad med detta id.
export const ROW_ID = 1
export const TABLE = 'tournaments'
