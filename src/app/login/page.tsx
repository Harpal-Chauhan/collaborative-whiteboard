"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.code === "account_not_found") {
          setError("No account found with this email. Please sign up first.");
        } else if (result.code === "incorrect_password") {
          setError("Incorrect password. Please try again.");
        } else {
          setError("Login failed. Please check your details and try again.");
        }

        return;
      }

      if (!result?.ok) {
        setError("Login failed. Please try again.");
        return;
      }

      router.replace("/whiteboard");
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);

      setError(
        "Unable to connect to the server. Please check your internet connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F2EB] px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#E5E0D5] bg-white shadow-xl shadow-[#244C3A]/10 lg:min-h-[600px] lg:grid-cols-2">
        {/* Left side */}
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#244C3A] p-7 text-white sm:p-10 lg:p-12">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/10 sm:h-72 sm:w-72" />
          <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full border border-white/10 sm:h-80 sm:w-80" />

          <Link
            href="/"
            className="relative z-10 flex w-fit items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D97745] text-lg font-bold text-white">
              C
            </span>
            <span className="text-lg font-semibold tracking-wide">
              Canvas Studio
            </span>
          </Link>

          <div className="relative z-10 py-10 lg:py-0">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#E8B18F]">
              Your workspace awaits
            </p>

            <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Great ideas start with a blank canvas.
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-white/75 sm:text-base">
              Bring your ideas together, collaborate with your team, and turn
              thoughts into something meaningful.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#244C3A] bg-[#E8B18F] text-xs font-semibold text-[#244C3A]">
                  A
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#244C3A] bg-[#F5F2EB] text-xs font-semibold text-[#244C3A]">
                  B
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#244C3A] bg-[#D97745] text-xs font-semibold text-white">
                  C
                </span>
              </div>

              <p className="text-xs text-white/70 sm:text-sm">
                Think together. Create together.
              </p>
            </div>
          </div>

          <p className="relative z-10 text-xs text-white/50">
            A shared space for better ideas.
          </p>
        </section>

        {/* Right side: login form */}
        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#B9653C]">
                Welcome back
              </p>

              <h2 className="text-3xl font-semibold tracking-tight text-[#24352B] sm:text-4xl">
                Sign in
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#77766E]">
                Enter your details to access your whiteboard.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[#34483A]"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error" : undefined}
                  className="w-full rounded-xl border border-[#DDD9CE] bg-[#FCFBF8] px-4 py-3 text-sm text-[#24352B] outline-none transition placeholder:text-[#A09D93] focus:border-[#55745C] focus:ring-4 focus:ring-[#244C3A]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-[#34483A]"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error" : undefined}
                  className="w-full rounded-xl border border-[#DDD9CE] bg-[#FCFBF8] px-4 py-3 text-sm text-[#24352B] outline-none transition placeholder:text-[#A09D93] focus:border-[#55745C] focus:ring-4 focus:ring-[#244C3A]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {error && (
                <p
                  id="login-error"
                  role="alert"
                  aria-live="polite"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-[#244C3A] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#193B2B] focus:outline-none focus:ring-4 focus:ring-[#244C3A]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in to your workspace"}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#E9E5DB]" />
              <span className="text-xs text-[#99968D]">
                NEW TO CANVAS STUDIO?
              </span>
              <div className="h-px flex-1 bg-[#E9E5DB]" />
            </div>

            <p className="text-center text-sm text-[#77766E]">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-[#B9653C] transition hover:text-[#914728] hover:underline"
              >
                Create an account
              </Link>
            </p>

            <p className="mt-8 text-center text-xs leading-5 text-[#A09D93]">
              By signing in, you can access your collaborative workspace.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
