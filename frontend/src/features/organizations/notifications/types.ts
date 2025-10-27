export interface Notification {
    id: string
    user_id: string
    type: 'invitation' | 'role_changed' | 'removed_from_org' | 'system'
    title: string
    message: string
    data: {
        invitation_id?: string
        organization_id?: string
        role?: string
        [key: string]: any
    }
    read: boolean
    action_url: string | null
    created_at: string
}