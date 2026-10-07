'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'register') {
      router.replace('/register');
    } else {
      router.replace('/login');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#040711] flex items-center justify-center text-slate-400 text-sm">
      Mengalihkan ke halaman autentikasi...
    </div>
  );
}

export default function AuthRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#040711] flex items-center justify-center text-slate-400 text-sm">Mengalihkan...</div>}>
      <AuthRedirectContent />
    </Suspense>
  );
}
