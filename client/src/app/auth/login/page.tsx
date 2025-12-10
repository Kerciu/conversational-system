import { AuthLayout } from "@/components/auth/auth-layout"
import { LoginForm } from "@/components/auth/login-form"

export const metadata = {
  title: "Sign In | Decisio.ai",
  description: "Sign in to your Decisio.ai account",
}

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to Decisio.ai">
      <LoginForm />
    </AuthLayout>
  )
}
