'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEffect, useState } from "react"

export function ThemeSelector() {
  const [theme, setTheme] = useState<string>('system')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system'
    setTheme(savedTheme)
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)

    if (newTheme === 'system') {
      localStorage.removeItem('theme')
      document.documentElement.classList.remove('light', 'dark')
    } else {
      localStorage.setItem('theme', newTheme)
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(newTheme)
    }
  }

  return (
    <Select value={theme} onValueChange={handleThemeChange}>
      <SelectTrigger className="h-2 text-xs">
        <SelectValue placeholder="Select theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light" className="text-xs">Light</SelectItem>
        <SelectItem value="dark" className="text-xs">Dark</SelectItem>
        <SelectItem value="system" className="text-xs">System</SelectItem>
      </SelectContent>
    </Select>
  )
}
