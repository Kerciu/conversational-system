"use client"

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { getProfile as getLocalProfile, saveProfile as saveLocalProfile } from "@/lib/settings-storage"
import type { UserProfile } from "@/types/settings" 

export function useSettings() {
  const { toast } = useToast()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null)

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error("No token found")

      const fetchText = async (endpoint: string) => {
        const res = await fetch(`http://localhost:8080/api/${endpoint}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        return res.text()
      }

      const [username, email, createdAt, verificationState] = await Promise.all([
        fetchText('dashboard/get-username'),
        fetchText('dashboard/get-email'),
        fetchText('settings/get-creation-date'),
        fetchText('settings/get-is-verified')
      ])

      const localProfile = getLocalProfile()
      
      const loadedProfile: UserProfile = {
        username,
        email,
        emailVerified: verificationState === "verified",
        createdAt,
        avatarUrl: localProfile.avatarUrl || null 
      }
      
      setProfile(loadedProfile)
      setOriginalProfile(loadedProfile)
    } catch (error) {
      console.error(error)
      toast({ title: "Error loading profile", description: "Could not fetch user data.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

      const updateProfile = async (newProfile: UserProfile) => {
    if (!originalProfile) return
    setIsSaving(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error("No authentication token found")
      
      // 1. Zmiana Username
      if (newProfile.username !== originalProfile.username) {
        const res = await fetch('http://localhost:8080/api/settings/change-username', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json', // Zmieniamy na JSON
            'Authorization': `Bearer ${token}`
          },
          // Próbujemy wysłać jako prosty string w JSON, bo endpoint prawdopodobnie bierze @RequestBody String
          body: JSON.stringify(newProfile.username) 
          // Jeśli to nie zadziała, spróbuj: JSON.stringify({ username: newProfile.username })
        })

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(errorText || `Failed to change username (${res.status})`)
        }

        const newToken = await res.text()
        if (newToken) localStorage.setItem('token', newToken)
      }

      // 2. Zmiana Email
      if (newProfile.email !== originalProfile.email) {
        const res = await fetch('http://localhost:8080/api/settings/change-email', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json', // Tu też JSON
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newProfile.email)
        })

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(errorText || `Failed to change email (${res.status})`)
        }
      }

      saveLocalProfile({ ...newProfile, avatarUrl: newProfile.avatarUrl ?? undefined })
      setOriginalProfile(newProfile)
      setProfile(newProfile)
      toast({ title: "Profile updated", description: "Changes saved successfully." })
    } catch (error) {
      console.error("Profile update error:", error)
      toast({ 
        title: "Error saving profile", 
        description: error instanceof Error ? error.message : "Unknown error", 
        variant: "destructive" 
      })
    } finally {
      setIsSaving(false)
    }
  }



  const deleteAccount = async () => {
    setIsDeleting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:8080/api/settings/delete', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error(await res.text())

      localStorage.clear()
      toast({ title: "Account deleted", description: "Goodbye." })
      router.push("/")
    } catch (error) {
        console.log(error)
      toast({ title: "Error", description: "Could not delete account.", variant: "destructive" })
      setIsDeleting(false)
    }
  }

  return {
    profile,
    setProfile,
    originalProfile,
    isLoading,
    isSaving,
    isDeleting,
    updateProfile,
    deleteAccount,
    hasChanges: JSON.stringify(profile) !== JSON.stringify(originalProfile)
  }
}