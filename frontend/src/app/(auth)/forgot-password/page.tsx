'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      setMessage(response.ok ? 'If this account exists, a reset link is on its way.' : 'Please try again later.');
    } catch { setMessage('Please try again later.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-md p-8 space-y-5"><h1 className="text-2xl font-bold">Reset your password</h1><p>Enter your account email to receive a reset link.</p><form onSubmit={submit} className="space-y-4"><input className="w-full rounded border p-3" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" /><button className="rounded bg-primary px-5 py-3 text-primary-foreground" disabled={busy}>Send reset link</button></form>{message && <p role="status">{message}</p>}<Link href="/login" className="underline">Back to login</Link></main>;
}
