"use client"

import { useState } from "react"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DangerZoneProps {
  onDelete: () => void
  isDeleting: boolean
}

export function DangerZone({ onDelete, isDeleting }: DangerZoneProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [understandChecked, setUnderstandChecked] = useState(false)

  return (
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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete your account?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>This action is <strong>permanent</strong> and <strong>cannot be undone</strong>.</p>
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
                onCheckedChange={(c) => setUnderstandChecked(c === true)}
              />
              <Label htmlFor="understand" className="text-sm leading-relaxed">
                I understand that all my data will be permanently deleted.
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Type <strong>DELETE</strong> to confirm</Label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                className="input-glow"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={deleteConfirmation !== "DELETE" || !understandChecked || isDeleting}
            >
              {isDeleting ? <><Loader2 className="mr-2 animate-spin" /> Deleting...</> : "Delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
