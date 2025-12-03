import { Suspense } from "react"
import { AuthLayout } from "@/components/auth/auth-layout"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata = {
  title: "Reset Password | Decisio.ai",
  description: "Create a new password for your account",
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Reset your password" subtitle="Create a new secure password">
      <Suspense fallback={<div className="animate-pulse h-64 bg-secondary/20 rounded-lg" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  )
}
