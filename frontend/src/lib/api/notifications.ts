import { createClient } from "@/lib/supabase/client"

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  link?: string
  created_at: string
}

export async function getNotifications(limit = 20) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as Notification[]
}

export async function getUnreadCount() {
  const supabase = createClient()

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false)

  if (error) throw error
  return count || 0
}

export async function markAsRead(notificationId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) throw error
}

export async function markAllAsRead() {
  const supabase = createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false)

  if (error) throw error
}

export async function deleteNotification(notificationId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) throw error
}

export async function deleteAllRead() {
  const supabase = createClient()

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('read', true)

  if (error) throw error
}

// =============================================
// ADMIN FUNCTIONS
// =============================================

export async function isAdmin() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase.rpc('is_admin', { user_id: user.id })

  if (error) throw error
  return data as boolean
}

export async function adminSendToAll(
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  link?: string
) {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('admin_send_to_all', {
    p_title: title,
    p_message: message,
    p_type: type,
    p_link: link || null
  })

  if (error) throw error
  return data as number
}

export async function adminSendToUsers(
  userIds: string[],
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  link?: string
) {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('admin_send_to_users', {
    p_user_ids: userIds,
    p_title: title,
    p_message: message,
    p_type: type,
    p_link: link || null
  })

  if (error) throw error
  return data as number
}

export async function adminSendToRole(
  role: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  link?: string
) {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('admin_send_to_role', {
    p_role: role,
    p_title: title,
    p_message: message,
    p_type: type,
    p_link: link || null
  })

  if (error) throw error
  return data as number
}

export async function getAllUsers() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role')
    .order('name')

  if (error) throw error
  return data as { id: string; name: string | null; role: string }[]
}
