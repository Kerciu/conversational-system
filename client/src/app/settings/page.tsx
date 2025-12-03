"use client"

import Link from "next/link"
import { AmbientOrbs } from "@/components/ui/ambient-orbs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"

import { useSettings } from "@/hooks/use-settings"
import { ProfileSection } from "@/components/settings/profile-section"
import { SecuritySection } from "@/components/settings/security-section"
import { DangerZone } from "@/components/settings/danger-zone"

export default function SettingsPage() {
  const { 
    profile, 
    setProfile, 
    isLoading, 
    isSaving, 
    hasChanges, 
    updateProfile, 
    deleteAccount,
    isDeleting
  } = useSettings()

  if (isLoading || !profile) {
    return <SettingsSkeleton /> 
  }

  return (
    <ProtectedRoute>
      <div className="relative min-h-screen bg-background">
        <AmbientOrbs variant="subtle" />

        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
             <div className="flex items-center gap-4">
              <Link href="/chat">
                <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
              </Link>
              <h1 className="text-lg font-semibold">Settings</h1>
            </div>
            {hasChanges && (
               <div className="text-xs text-amber-500">Unsaved changes</div>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
          
          <ProfileSection 
            profile={profile} 
            onUpdate={setProfile} 
            onSave={() => updateProfile(profile)}
            isSaving={isSaving}
            hasChanges={hasChanges}
          />

          <SecuritySection /> 
          <DangerZone 
            onDelete={deleteAccount} 
            isDeleting={isDeleting} 
          />

        </main>
      </div>
    </ProtectedRoute>
  )
}

function SettingsSkeleton() {
    return (
      <ProtectedRoute>
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
    </ProtectedRoute>
    )
}
