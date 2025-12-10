import { AuthLayout } from "@/components/auth/auth-layout"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata = {
  title: "Forgot Password | Decisio.ai",
  description: "Reset your Decisio.ai password",
}

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Forgot your password?" subtitle="No worries, we'll send you reset instructions">
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
