'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, AlertCircle, Lock, Mail, ShieldCheck, ArrowRight, Store } from 'lucide-react';

function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const { login, logout, user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  // If already authenticated as an admin, redirect immediately
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === 'admin') {
      router.push(redirectTo || '/admin');
    }
  }, [isLoading, isAuthenticated, user, redirectTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Inline field validation
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      const resUser = await login({ email: email.trim().toLowerCase(), password });
      
      // Verify role
      if (resUser?.role !== 'admin') {
        // Revoke session if non-admin attempted to login here
        await logout();
        setError('Access restricted to authorized staff & administrators. If you are a customer, please sign in via the storefront.');
        return;
      }

      // Success - navigate to target redirect or admin overview
      router.push(redirectTo || '/admin');
    } catch (err: any) {
      setError(err.message || 'Invalid staff credentials');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-8 bg-muted/30">
      <Card className="w-full max-w-md shadow-xl border border-border/80 rounded-2xl animate-in fade-in-50 zoom-in-95 duration-200">
        <CardHeader className="space-y-2 pb-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs mb-1">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 self-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider mx-auto">
            Internal Operations
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Staff & Admin Sign In
          </CardTitle>
          <CardDescription className="text-sm max-w-xs mx-auto">
            Sign in with authorized administrative credentials to manage store operations.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-300 rounded-lg flex items-start gap-2 border border-red-200 dark:border-red-900">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-xs font-semibold">Staff Email Address</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@brightbuy.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                  }}
                  disabled={isLoading}
                  className={`pl-9 text-sm ${fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="admin-password" className="text-xs font-semibold">Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                  disabled={isLoading}
                  className={`pl-9 pr-9 text-sm ${fieldErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldErrors.password}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full font-bold shadow-xs gap-2 mt-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                <>
                  Access Operations Portal <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground w-full">
            <span>Customer account?</span>
            <Link href="/login" className="text-primary font-semibold hover:underline flex items-center gap-1">
              Storefront Sign In <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="text-center w-full">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors">
              <Store className="w-3.5 h-3.5" /> Return to BrightBuy Shop
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
