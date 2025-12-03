import { AuthLayout } from "@/components/auth/auth-layout"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata = {
  title: "Create Account | Decisio.ai",
  description: "Create your Decisio.ai account",
}

export default function RegisterPage() {
  return (
    <AuthLayout title="Create an account" subtitle="Get started with Decisio.ai today">
      <RegisterForm />
    </AuthLayout>
  )
}
