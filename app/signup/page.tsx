import Link from 'next/link'
import { signup } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50/50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 lg:text-5xl">
            Smax <span className="text-blue-600">Analytics</span>
          </h1>
          <p className="mt-2 text-zinc-500">Create your business account</p>
        </div>

        <Card className="border-zinc-200 bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-zinc-900">Create Account</CardTitle>
            <CardDescription className="text-zinc-500">
              Join our internal analytics platform.
            </CardDescription>
          </CardHeader>
          <form action={signup}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-700">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-blue-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-700">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-blue-600"
                />
              </div>
              {searchParams?.message && (
                <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-600 border border-blue-200">
                  {searchParams.message}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg shadow-md transition-all active:scale-[0.98]">
                Register
              </Button>
              <div className="text-center text-sm text-zinc-500">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:underline hover:text-blue-700">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Smax Analytics. Internal project.
        </p>
      </div>
    </div>
  )
}
