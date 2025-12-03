"use client"

import { useRef } from "react"
import { Camera, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
// IMPORT TWOJEGO TYPU
import type { UserProfile } from "@/types/settings"

interface ProfileSectionProps {
  profile: UserProfile
  onUpdate: (p: UserProfile) => void
  onSave: () => void
  isSaving: boolean
  hasChanges: boolean
}

export function ProfileSection({ profile, onUpdate, onSave, isSaving, hasChanges }: ProfileSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
        // Aktualizacja avatara w stanie
        onUpdate({ ...profile, avatarUrl: event.target?.result as string })
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
      onUpdate({ ...profile, avatarUrl: null })
      if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Fallback dla inicjałów
  const initials = profile.username ? profile.username.slice(0, 2).toUpperCase() : "??"
  
  // Konwersja daty ze stringa
  const formattedDate = profile.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown'

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your public profile information.</p>
      </div>

      {/* Avatar Card */}
      <Card className="gradient-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-border">
                {/* Obsługa null w avatarUrl */}
                <AvatarImage src={profile.avatarUrl || undefined} alt={profile.username} />
                <AvatarFallback className="bg-gradient-to-br from-violet-500/20 to-purple-600/20 text-lg">
                    {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Upload new image
              </Button>
              {profile.avatarUrl && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={handleRemoveAvatar}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Card */}
      <Card className="gradient-border">
        <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label>Username</Label>
                    <Input 
                        value={profile.username} 
                        onChange={(e) => onUpdate({...profile, username: e.target.value})} 
                        className="input-glow"
                    />
                </div>
                 <div className="space-y-2">
                    <Label>Account Created</Label>
                    <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                        {formattedDate}
                    </div>
                 </div>
            </div>
            
            <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                    value={profile.email} 
                    onChange={(e) => onUpdate({...profile, email: e.target.value})} 
                    className="input-glow"
                />
            </div>

            {hasChanges && (
                <div className="flex justify-end pt-2">
                    <Button onClick={onSave} disabled={isSaving} className="btn-glow glow-primary">
                        {isSaving ? <><Loader2 className="mr-2 animate-spin" /> Saving...</> : "Save Changes"}
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>
    </section>
  )
}
