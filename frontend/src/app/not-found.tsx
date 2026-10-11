import Link from 'next/link';
import { ShoppingBag, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-slate-50 dark:bg-zinc-900/40">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shadow-inner">
          <ShoppingBag className="w-10 h-10" />
        </div>

        <span className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          404 Error
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-2 mb-3">
          Page Not Found
        </h1>
        <p className="text-slate-600 dark:text-zinc-400 text-base mb-8">
          The page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button variant="default" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <ArrowLeft className="w-4 h-4" />
              Return Home
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <Search className="w-4 h-4" />
              Explore Products
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
