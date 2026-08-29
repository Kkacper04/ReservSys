'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid email or password');
      }

      router.push('/seats');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-black rounded-xl shadow-lg border border-green-700 p-8">
        <h2 className="text-3xl font-bold text-center text-yellow-400 mb-8">
          ReservSys Login page
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-200 text-center rounded-lg font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-zinc-400 text-sm font-bold mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-zinc-400 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-bold py-3 px-4 rounded-lg transition-all ${
              isLoading
                ? 'bg-emerald-600/50 cursor-not-allowed text-zinc-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50'
            }`}
          >
            {isLoading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-zinc-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}