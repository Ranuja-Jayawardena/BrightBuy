'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setMessage('This reset link is invalid.'); return; }
    const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
    setDone(response.ok);
    setMessage(response.ok ? 'Password updated. You can now log in.' : 'This reset link is invalid or expired.');
  }
  return <main className="mx-auto max-w-md p-8 space-y-5"><h1 className="text-2xl font-bold">Choose a new password</h1>{!done && <form onSubmit={submit} className="space-y-4"><input className="w-full rounded border p-3" type="password" minLength={8} maxLength={200} required value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" /><button className="rounded bg-primary px-5 py-3 text-primary-foreground">Update password</button></form>}{message && <p role="status">{message}</p>}<Link href="/login" className="underline">Back to login</Link></main>;
}
