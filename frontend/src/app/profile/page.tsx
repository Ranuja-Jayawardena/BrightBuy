'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  User,
  Mail,
  Phone,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile, updatePassword } = useAuthStore();

  // Profile Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Active section tab
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || trimmedFirst.length > 50) {
      setProfileError('First name is required (1-50 characters)');
      return;
    }
    if (!trimmedLast || trimmedLast.length > 50) {
      setProfileError('Last name is required (1-50 characters)');
      return;
    }
    if (phone.trim() && phone.trim().length > 20) {
      setProfileError('Phone number cannot exceed 20 characters');
      return;
    }

    setProfileLoading(true);
    try {
      await updateProfile({
        first_name: trimmedFirst,
        last_name: trimmedLast,
        phone: phone.trim() || null,
      });
      setProfileSuccess('Your profile details have been saved successfully.');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess('Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const initials = `${firstName?.[0] || user?.email?.[0] || 'U'}${lastName?.[0] || ''}`.toUpperCase();

  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-zinc-950 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-white/15 text-2xl sm:text-3xl font-black text-white backdrop-blur-md shadow-inner border border-white/20">
                  {initials}
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {firstName && lastName ? `${firstName} ${lastName}` : 'My Account'}
                  </h1>
                  <p className="mt-1 text-sm sm:text-base text-blue-100/90 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {user?.role === 'customer' ? 'Customer Account' : user?.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div className="flex sm:flex-col gap-2.5">
                <Link
                  href="/orders"
                  className="inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs sm:text-sm font-medium text-white backdrop-blur-md transition-all border border-white/15 hover:border-white/30"
                >
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    My Orders
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-70" />
                </Link>
                <Link
                  href="/addresses"
                  className="inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs sm:text-sm font-medium text-white backdrop-blur-md transition-all border border-white/15 hover:border-white/30"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Saved Addresses
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-70" />
                </Link>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900'
              }`}
            >
              <User className="h-4 w-4" />
              Personal Details
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'security'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900'
              }`}
            >
              <KeyRound className="h-4 w-4" />
              Security & Password
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <Card className="border border-slate-200/80 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-2xl">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <User className="h-5 w-5 text-blue-600" />
                      Personal Information
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-zinc-400">
                      Update your contact and identification details.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-6 pt-2">
                    {profileSuccess && (
                      <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-medium">{profileSuccess}</span>
                      </div>
                    )}

                    {profileError && (
                      <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-4 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium">{profileError}</span>
                      </div>
                    )}

                    <form onSubmit={handleProfileSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="first_name" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                            First Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="first_name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="John"
                            required
                            maxLength={50}
                            className="h-10 text-sm bg-slate-50/50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-800"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="last_name" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                            Last Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="last_name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Doe"
                            required
                            maxLength={50}
                            className="h-10 text-sm bg-slate-50/50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-800"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                            Email Address
                          </Label>
                          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Read-only
                          </span>
                        </div>
                        <div className="relative">
                          <Input
                            id="email"
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="h-10 pl-9 text-sm bg-slate-100 text-slate-500 dark:bg-zinc-800/80 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 cursor-not-allowed"
                          />
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Your email address is your unique BrightBuy login identifier and cannot be modified directly.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 (555) 234-5678"
                            maxLength={20}
                            className="h-10 pl-9 text-sm bg-slate-50/50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-800"
                          />
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Used for delivery courier contact and order shipping updates.
                        </p>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Button
                          type="submit"
                          disabled={profileLoading}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-10 font-semibold shadow-sm shadow-blue-500/20"
                        >
                          {profileLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving Changes...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Info Card */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                    Account Security
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Protecting your BrightBuy account with regular credential updates ensures your stored orders, delivery addresses, and payment sessions remain safe.
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                    <button
                      onClick={() => setActiveTab('security')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1.5 hover:underline"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Update Password
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    Orders & Deliveries
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Check your past orders, active shipments, delivery tracking codes, and receipts.
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                    <Link
                      href="/orders"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1.5 hover:underline"
                    >
                      View Order History <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <Card className="border border-slate-200/80 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-2xl">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <KeyRound className="h-5 w-5 text-indigo-600" />
                      Change Password
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-zinc-400">
                      Ensure your account is using a strong password of at least 8 characters.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-6 pt-2">
                    {passwordSuccess && (
                      <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-medium">{passwordSuccess}</span>
                      </div>
                    )}

                    {passwordError && (
                      <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-4 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium">{passwordError}</span>
                      </div>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="space-y-5">
                      <div className="space-y-1.5">
                        <Label htmlFor="current_password" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Current Password <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="current_password"
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className="h-10 pr-10 text-sm bg-slate-50/50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-800"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                            aria-label="Toggle password visibility"
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="new_password" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          New Password <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="new_password"
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                            className="h-10 pr-10 text-sm bg-slate-50/50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-800"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                            aria-label="Toggle password visibility"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400">Must be at least 8 characters long.</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="confirm_password" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Confirm New Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="confirm_password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="h-10 text-sm bg-slate-50/50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-800"
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Button
                          type="submit"
                          disabled={passwordLoading}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 h-10 font-semibold shadow-sm shadow-indigo-500/20"
                        >
                          {passwordLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating Password...
                            </>
                          ) : (
                            'Update Password'
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Security Recommendations */}
              <div>
                <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Lock className="h-5 w-5 text-indigo-600" />
                    Password Guidelines
                  </h3>
                  <ul className="mt-4 space-y-3 text-xs text-slate-500 dark:text-zinc-400">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>Use at least 8 characters</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>Combine uppercase & lowercase letters</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>Include numbers and special symbols (e.g. !@#$)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>Do not reuse passwords from other websites</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
