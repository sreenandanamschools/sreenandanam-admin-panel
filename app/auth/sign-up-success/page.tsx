import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold text-center text-green-600">
              Account Created
            </CardTitle>
            <CardDescription className="text-center">
              Your account has been successfully created
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              A confirmation email has been sent to your email address. Please check your inbox and confirm your email to activate your account.
            </p>
            <p className="text-xs text-gray-500 text-center">
              If you don&apos;t see the email, please check your spam folder.
            </p>
            <Link href="/auth/login" className="block">
              <Button className="w-full">Return to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
