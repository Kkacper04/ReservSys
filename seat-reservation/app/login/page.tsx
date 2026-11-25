"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail || "Invalid email or password.");
      }

      router.push("/seats");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to sign in. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#161615] flex flex-col lg:flex-row">
      <aside className="hidden lg:flex lg:w-[44%] xl:w-[46%] bg-[#1B4D3E] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-white text-[#1B4D3E] flex items-center justify-center font-mono text-xs font-semibold tracking-tight">
            RS
          </span>
          <span className="font-semibold text-lg tracking-tight">ReservSys</span>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#B9D5C9]">
            Workplace Scheduling
          </p>
          <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight leading-[1.15]">
            Architectural desk booking across every office floor.
          </h1>
          <p className="text-sm text-[#DCEAE3] leading-relaxed">
            Reserve open workstations, quiet booths, or private rooms by exact
            time window, check in on arrival, and manage recurring schedules in
            one place.
          </p>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-[#B9D5C9] font-mono">
          <span>WARSAW · POZNAN</span>
          <span>FLOORPLAN v2</span>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <span className="w-8 h-8 rounded-lg bg-[#1B4D3E] text-white flex items-center justify-center font-mono text-xs font-semibold">
              RS
            </span>
            <span className="font-semibold text-base tracking-tight">
              ReservSys
            </span>
          </div>

          <div className="rs-card p-7 sm:p-9 shadow-[0_1px_3px_rgba(22,22,21,0.04)]">
            <div className="mb-7">
              <h2 className="text-2xl font-semibold tracking-tight text-[#161615]">
                Sign in
              </h2>
              <p className="mt-1.5 text-sm text-[#6B6A65]">
                Enter your workplace credentials to access desk booking.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-lg bg-[#FDF1F0] border border-[#EFC8C4] text-[#9E2A2B] text-sm flex items-start gap-2.5"
              >
                <AlertCircle size={17} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#6B6A65] mb-1.5"
                >
                  Work Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rs-input"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#6B6A65] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rs-input pr-10"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6B6A65] hover:text-[#161615] cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="rs-btn-primary w-full py-2.5 mt-2"
              >
                <span>{isLoading ? "Signing in..." : "Sign in"}</span>
                {!isLoading && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#E4E2DC] text-center text-sm text-[#6B6A65]">
              New to the workspace?{" "}
              <Link
                href="/register"
                className="text-[#1B4D3E] hover:text-[#143B2F] font-semibold transition-colors"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
