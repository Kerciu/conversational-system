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

      const response = await fetch('http://localhost:8080/api/settings/profile', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
             localStorage.removeItem('token')
             router.push('/auth/login')
             return
        }
        throw new Error(`Failed to fetch profile: ${response.status}`)
      }

      const data = await response.json()
      const localProfile = getLocalProfile()

      const loadedProfile: UserProfile = {
        username: data.username,
        email: data.email,
        emailVerified: data.verified || data.isVerified || false, 
        createdAt: data.createdAt,
        avatarUrl: localProfile.avatarUrl || null
      }
      
      setProfile(loadedProfile)
      setOriginalProfile(loadedProfile)
    } catch (error) {
      console.error("Error loading profile:", error)
      toast({ 
        title: "Error loading profile", 
        description: "Could not fetch user data from server.", 
        variant: "destructive" 
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, router])


  useEffect(() => {
    loadProfile()
  }, [loadProfile])

      const updateProfile = async (newProfile: UserProfile) => {
    if (!originalProfile) return
    setIsSaving(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error("No authentication token found")
      
      if (newProfile.username !== originalProfile.username) {
        const res = await fetch('http://localhost:8080/api/settings/change-username', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newProfile.username) 
        })

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(errorText || `Failed to change username (${res.status})`)
        }

        const newToken = await res.text()
        if (newToken) localStorage.setItem('token', newToken)
      }

      if (newProfile.email !== originalProfile.email) {
        const res = await fetch('http://localhost:8080/api/settings/change-email', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json', 
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