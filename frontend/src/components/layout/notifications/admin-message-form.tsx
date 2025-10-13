"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { IconSend, IconLoader2 } from "@tabler/icons-react"
import {
  adminSendToAll,
  adminSendToUsers,
  adminSendToRole,
  getAllUsers,
} from "@/lib/api/notifications"
import { useEffect } from "react"

interface User {
  id: string
  name: string | null
  role: string
}

export function AdminMessageForm({ onSuccess }: { onSuccess?: () => void }) {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [type, setType] = useState<"info" | "success" | "warning" | "error">("info")
  const [link, setLink] = useState("")
  const [sendTo, setSendTo] = useState<"all" | "role" | "specific">("all")
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    if (sendTo === "specific") {
      setLoadingUsers(true)
      getAllUsers()
        .then(setUsers)
        .catch(console.error)
        .finally(() => setLoadingUsers(false))
    }
  }, [sendTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let count = 0

      if (sendTo === "all") {
        count = await adminSendToAll(title, message, type, link || undefined)
      } else if (sendTo === "role" && selectedRole) {
        count = await adminSendToRole(selectedRole, title, message, type, link || undefined)
      } else if (sendTo === "specific" && selectedUsers.length > 0) {
        count = await adminSendToUsers(selectedUsers, title, message, type, link || undefined)
      }

      alert(`Successfully sent notification to ${count} user(s)`)

      // Reset form
      setTitle("")
      setMessage("")
      setType("info")
      setLink("")
      setSendTo("all")
      setSelectedRole("")
      setSelectedUsers([])

      onSuccess?.()
    } catch (error) {
      console.error("Error sending notification:", error)
      alert("Failed to send notification. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Send Notification</h3>
          <p className="text-sm text-muted-foreground">
            Send a notification to users as an admin
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="send-to">Send To</Label>
          <Select value={sendTo} onValueChange={(v) => setSendTo(v as "all" | "role" | "specific")}>
            <SelectTrigger id="send-to">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="role">By Role</SelectItem>
              <SelectItem value="specific">Specific Users</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sendTo === "role" && (
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waitlist">Waitlist</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {sendTo === "specific" && (
          <div className="space-y-2">
            <Label htmlFor="users">Users</Label>
            {loadingUsers ? (
              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading users...
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-md border p-4 space-y-2">
                {users.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id])
                        } else {
                          setSelectedUsers(selectedUsers.filter((id) => id !== user.id))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">
                      {user.name || "No name"}{" "}
                      <span className="text-muted-foreground">({user.role})</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as "info" | "success" | "warning" | "error")}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Notification message"
            rows={4}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="link">Link (optional)</Label>
          <Input
            id="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/lab or https://..."
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <IconSend className="mr-2 h-4 w-4" />
              Send Notification
            </>
          )}
        </Button>
      </form>
    </Card>
  )
}
