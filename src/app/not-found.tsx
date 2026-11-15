import Link from 'next/link';
import { ArrowLeft, HeartHandshake } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-nest-100 text-nest-700 flex items-center justify-center mb-4">
        <HeartHandshake className="w-8 h-8" />
      </div>
      <h2 className="text-3xl font-black text-navy-950 mb-2">Page Not Found</h2>
      <p className="text-slate-600 max-w-md mb-6">
        The care page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-nest-600 text-white font-bold hover:bg-nest-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
