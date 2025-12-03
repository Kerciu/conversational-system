"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { AmbientOrbs } from "@/components/ui/ambient-orbs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Camera,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  Settings,
} from "lucide-react"
import { PasswordStrengthIndicator, isPasswordStrong } from "@/components/auth/password-strength-indicator"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getProfile, saveProfile } from "@/lib/settings-storage"
import type { UserProfile } from "@/types/settings"
import { useRef } from "react"

export default function SettingsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Email verification
  const [isResendingVerification, setIsResendingVerification] = useState(false)

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [understandChecked, setUnderstandChecked] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load profile data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 500))
      const loadedProfile = getProfile()
      setProfile(loadedProfile)
      setOriginalProfile(loadedProfile)
      setIsLoading(false)
    }
    loadData()
  }, [])

  const hasProfileChanges = JSON.stringify(profile) !== JSON.stringify(originalProfile)

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasProfileChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasProfileChanges])

  // Avatar handlers
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image under 5MB.", variant: "destructive" })
      return
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please select a JPG or PNG image.", variant: "destructive" })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setAvatarPreview(result)
      setProfile({ ...profile, avatarUrl: result })
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    if (!profile) return
    setAvatarPreview(null)
    setProfile({ ...profile, avatarUrl: null })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Save profile
  const handleSaveProfile = async () => {
    if (!profile) return
    setIsSavingProfile(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      saveProfile(profile)
      setOriginalProfile(profile)
      toast({ title: "Profile updated", description: "Your profile has been saved successfully." })
    } catch {
      toast({ title: "Error saving profile", description: "Please try again.", variant: "destructive" })
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Change password
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Missing fields", description: "Please fill in all password fields.", variant: "destructive" })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      })
      return
    }
    if (!isPasswordStrong(newPassword)) {
      toast({ title: "Weak password", description: "Please choose a stronger password.", variant: "destructive" })
      return
    }

    setIsChangingPassword(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast({ title: "Password updated", description: "Your password has been changed successfully." })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast({ title: "Error", description: "Failed to change password. Please try again.", variant: "destructive" })
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Resend verification
  const handleResendVerification = async () => {
    if (!profile) return
    setIsResendingVerification(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast({ title: "Verification email sent", description: `We've sent a verification email to ${profile.email}.` })
    } catch {
      toast({ title: "Error", description: "Failed to send verification email.", variant: "destructive" })
    } finally {
      setIsResendingVerification(false)
    }
  }

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE" || !understandChecked) return
    setIsDeleting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      localStorage.clear()
      toast({ title: "Account deleted", description: "Your account has been permanently deleted." })
      router.push("/")
    } catch {
      toast({ title: "Error", description: "Could not delete your account. Please try again.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const displayAvatar = avatarPreview || profile?.avatarUrl
  const initials = profile?.displayName
    ? profile.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : profile?.username.slice(0, 2).toUpperCase() || "U"

  if (isLoading || !profile) {
    return (
      <div className="relative min-h-screen bg-background">
        <AmbientOrbs variant="subtle" />
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-3xl items-center gap-4 px-4 sm:px-6">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-6 w-24" />
          </div>
        </header>
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background">
      <AmbientOrbs variant="subtle" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/chat">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <Settings className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-semibold">Settings</h1>
            </div>
          </div>

          {hasProfileChanges && (
            <div className="flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              Unsaved changes
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        {/* Profile Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Profile</h2>
            <p className="text-sm text-muted-foreground">Manage your public profile information.</p>
          </div>

          {/* Avatar */}
          <Card className="gradient-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarImage src={displayAvatar || undefined} alt={profile.displayName} />
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
                  {displayAvatar && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={handleRemoveAvatar}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card className="gradient-border">
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    className="input-glow"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    placeholder="How you want to be called"
                    className="input-glow"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="input-glow"
                  />
                  {profile.emailVerified ? (
                    <Badge variant="outline" className="shrink-0 border-success/30 bg-success/10 text-success">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-500">
                      <XCircle className="mr-1 h-3 w-3" />
                      Unverified
                    </Badge>
                  )}
                </div>
                {!profile.emailVerified && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={handleResendVerification}
                    disabled={isResendingVerification}
                  >
                    {isResendingVerification ? "Sending..." : "Resend verification email"}
                  </Button>
                )}
              </div>

              {hasProfileChanges && (
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="btn-glow glow-primary">
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Security Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Security</h2>
            <p className="text-sm text-muted-foreground">Update your password to keep your account secure.</p>
          </div>

          <Card className="gradient-border">
            <CardHeader>
              <CardTitle className="text-base">Change Password</CardTitle>
              <CardDescription>Enter your current password and choose a new one.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input-glow pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-glow pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrengthIndicator password={newPassword} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-glow"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="btn-glow"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Danger Zone */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground">Irreversible actions. Proceed with caution.</p>
          </div>

          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Delete Account
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete your account?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                This action is <strong>permanent</strong> and <strong>cannot be undone</strong>.
              </p>
              <p>All your data will be permanently deleted, including:</p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li>All conversations and chat history</li>
                <li>Generated models and code</li>
                <li>Your profile and account settings</li>
              </ul>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="understand"
                checked={understandChecked}
                onCheckedChange={(checked) => setUnderstandChecked(checked === true)}
              />
              <Label htmlFor="understand" className="text-sm leading-relaxed">
                I understand that all my data will be permanently deleted and this action cannot be undone.
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm">
                Type <strong>DELETE</strong> to confirm
              </Label>
              <Input
                id="confirm"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                className="input-glow"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConfirmation("")
                setUnderstandChecked(false)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== "DELETE" || !understandChecked || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete my account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
