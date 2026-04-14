import Link from 'next/link'
import { login } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage({
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
          <p className="mt-2 text-zinc-500">Internal Business Intelligence Portal</p>
        </div>

        <Card className="border-zinc-200 bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-zinc-900">Sign In</CardTitle>
            <CardDescription className="text-zinc-500">
              Enter your corporate credentials to access the dashboard.
            </CardDescription>
          </CardHeader>
          <form action={login}>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-zinc-700">Password</Label>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-blue-600"
                />
              </div>
              {searchParams?.message && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                  {searchParams.message}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg shadow-md transition-all active:scale-[0.98]">
                Access Dashboard
              </Button>
              <div className="text-center text-sm text-zinc-500">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-blue-600 hover:underline hover:text-blue-700">
                  Register here
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Smax Analytics. Restricted access. All activities logged.
        </p>
      </div>
    </div>
  )
}
