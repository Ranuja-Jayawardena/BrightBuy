'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const [message, setMessage] = useState('');
  async function verify() {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setMessage('This verification link is invalid.'); return; }
    const response = await fetch('/api/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    setMessage(response.ok ? 'Your email is verified.' : 'This verification link is invalid or expired.');
  }
  return <main className="mx-auto max-w-md p-8 space-y-5"><h1 className="text-2xl font-bold">Verify your email</h1><button onClick={verify} className="rounded bg-primary px-5 py-3 text-primary-foreground">Verify email</button>{message && <p role="status">{message}</p>}<Link href="/login" className="underline">Go to login</Link></main>;
}
