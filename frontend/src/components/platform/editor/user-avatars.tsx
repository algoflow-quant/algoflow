import { User } from 'lucide-react'

interface UserAvatarsProps {
  users: Array<{
    userId: string
    userName: string
    avatarUrl?: string
    color: string
  }>
  size?: 'sm' | 'md' | 'lg'
  max?: number
}

const sizeClasses = {
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-6 h-6 text-xs',
  lg: 'w-8 h-8 text-sm'
}

export function UserAvatars({ users, size = 'sm', max = 3 }: UserAvatarsProps) {
  const displayUsers = users.slice(0, max)
  const remaining = users.length - max

  return (
    <div className="flex items-center -space-x-2">
      {displayUsers.map((user, index) => (
        <div
          key={`${user.userId}-${index}`}
          className={`${sizeClasses[size]} rounded-full border-2 border-background flex items-center justify-center font-medium text-white`}
          style={{ backgroundColor: user.color }}
          title={user.userName}
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.userName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-3 h-3" />
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`${sizeClasses[size]} rounded-full border-2 border-background bg-muted flex items-center justify-center font-medium text-muted-foreground`}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}
