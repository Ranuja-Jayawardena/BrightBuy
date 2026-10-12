'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, AlertCircle, Lock, Mail, User, Phone, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = 'First name is required';
    if (!lastName.trim()) errors.lastName = 'Last name is required';
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      const payload: Record<string, string> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      };
      if (phone.trim()) {
        payload.phone = phone.trim();
      }
      await register(payload);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to register account');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-8 bg-muted/20">
      <Card className="w-full max-w-lg shadow-md border rounded-2xl animate-in fade-in-50 zoom-in-95 duration-200">
        <CardHeader className="space-y-1.5 pb-6">
          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">Create an Account</CardTitle>
          <CardDescription className="text-sm">
            Sign up to track purchases, save delivery addresses, and enjoy seamless checkout.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-300 rounded-lg flex items-center gap-2 border border-red-200 dark:border-red-900">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-semibold">First Name</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input 
                    id="firstName" 
                    placeholder="John" 
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (fieldErrors.firstName) setFieldErrors({ ...fieldErrors, firstName: '' });
                    }}
                    disabled={isLoading}
                    className={`pl-9 text-sm ${fieldErrors.firstName ? 'border-red-500' : ''}`}
                    required
                  />
                </div>
                {fieldErrors.firstName && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {fieldErrors.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-semibold">Last Name</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input 
                    id="lastName" 
                    placeholder="Doe" 
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (fieldErrors.lastName) setFieldErrors({ ...fieldErrors, lastName: '' });
                    }}
                    disabled={isLoading}
                    className={`pl-9 text-sm ${fieldErrors.lastName ? 'border-red-500' : ''}`}
                    required
                  />
                </div>
                {fieldErrors.lastName && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {fieldErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold">Phone Number (Optional)</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="+1 234 567 890" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                  }}
                  disabled={isLoading}
                  className={`pl-9 text-sm ${fieldErrors.email ? 'border-red-500' : ''}`}
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                </p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••" 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                  }}
                  disabled={isLoading}
                  className={`pl-9 pr-9 text-sm ${fieldErrors.password ? 'border-red-500' : ''}`}
                  required
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
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-2 border-t">
          <div className="text-sm text-center text-muted-foreground w-full">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
