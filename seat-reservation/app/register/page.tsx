"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || "Registration failed. Please try again."
        );
      }

      toast.success("Account created. You can now sign in.");
      router.push("/login");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
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
            Workspace Onboarding
          </p>
          <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight leading-[1.15]">
            Set up your profile for instant desk access.
          </h1>
          <p className="text-sm text-[#DCEAE3] leading-relaxed">
            Once registered, browse live floor plans across Warsaw and Poznan,
            filter workstations with external monitors, and track upcoming
            check-ins.
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
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-[#161615]">
                Create account
              </h2>
              <p className="mt-1.5 text-sm text-[#6B6A65]">
                Register your name and email to start booking desks.
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

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#6B6A65] mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rs-input"
                  placeholder="Alex Kowalski"
                  required
                />
              </div>

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
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    className="rs-input pr-10"
                    placeholder="Minimum 6 characters"
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

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#6B6A65] mb-1.5"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="rs-input"
                  placeholder="Re-enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="rs-btn-primary w-full py-2.5 mt-2"
              >
                <span>{isLoading ? "Creating account..." : "Create account"}</span>
                {!isLoading && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#E4E2DC] text-center text-sm text-[#6B6A65]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#1B4D3E] hover:text-[#143B2F] font-semibold transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
