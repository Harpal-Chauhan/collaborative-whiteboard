"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setError("");

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }

    if (trimmedName.length > 100) {
      setError("Name must be 100 characters or fewer.");
      return;
    }

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password.length > 72) {
      setError("Password must be 72 characters or fewer.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: normalizedEmail,
          password,
        }),
      });

      let data: { error?: string } | null = null;

      try {
        data = await response.json();
      } catch {
        // Handle an empty or invalid JSON response below.
      }

      if (!response.ok) {
        if (response.status === 409) {
          setError(
            "An account with this email already exists. Please log in instead.",
          );
        } else if (response.status === 400) {
          setError(data?.error || "Please check your details and try again.");
        } else if (response.status === 429) {
          setError("Too many signup attempts. Please try again later.");
        } else if (response.status >= 500) {
          setError("Server error. Please try again in a few moments.");
        } else {
          setError(data?.error || "Signup failed. Please try again.");
        }

        return;
      }

      setPassword("");
      router.replace("/login");
    } catch (err) {
      console.error("Signup error:", err);

      setError(
        "Unable to connect to the server. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F2EB] px-4 py-8 sm:px-6 sm:py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#E5E0D5] bg-white shadow-xl shadow-[#244C3A]/10 lg:grid-cols-2">
        {/* Left side */}
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#244C3A] p-7 text-white sm:p-10 lg:min-h-[680px] lg:p-12">
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

          <div className="relative z-10 py-10 lg:py-12">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#E8B18F]">
              Make room for ideas
            </p>

            <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Create. Collaborate. Bring ideas to life.
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-white/75 sm:text-base">
              Create your account and start building ideas together on your own
              collaborative whiteboard.
            </p>

            <div className="mt-8 space-y-4 text-sm text-white/85">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[#E8B18F]">
                  ✓
                </span>
                Organize your ideas in one place
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[#E8B18F]">
                  ✓
                </span>
                Collaborate on shared whiteboards
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[#E8B18F]">
                  ✓
                </span>
                Turn your thoughts into plans
              </div>
            </div>
          </div>

          <p className="relative z-10 text-xs text-white/50">
            A shared space for better ideas.
          </p>
        </section>

        {/* Right side: signup form */}
        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md py-2">
            <div className="mb-7">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#B9653C]">
                Get started today
              </p>

              <h2 className="text-3xl font-semibold tracking-tight text-[#24352B] sm:text-4xl">
                Create account
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#77766E]">
                Fill in your details to create your workspace account.
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-[#34483A]"
                >
                  Full name
                </label>

                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter your name"
                  required
                  maxLength={100}
                  disabled={loading}
                  aria-invalid={!!error}
                  aria-describedby={error ? "signup-error" : undefined}
                  className="w-full rounded-xl border border-[#DDD9CE] bg-[#FCFBF8] px-4 py-3 text-sm text-[#24352B] outline-none transition placeholder:text-[#A09D93] focus:border-[#55745C] focus:ring-4 focus:ring-[#244C3A]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

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
                  aria-describedby={error ? "signup-error" : undefined}
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="At least 8 characters"
                  minLength={8}
                  maxLength={72}
                  required
                  disabled={loading}
                  aria-invalid={!!error}
                  aria-describedby={error ? "signup-password-help" : undefined}
                  className="w-full rounded-xl border border-[#DDD9CE] bg-[#FCFBF8] px-4 py-3 text-sm text-[#24352B] outline-none transition placeholder:text-[#A09D93] focus:border-[#55745C] focus:ring-4 focus:ring-[#244C3A]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <p
                  id="signup-password-help"
                  className="mt-2 text-xs text-[#99968D]"
                >
                  Use at least 8 characters.
                </p>
              </div>

              {error && (
                <p
                  id="signup-error"
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
                {loading ? "Creating account..." : "Create your account"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#E9E5DB]" />
              <span className="text-xs text-[#99968D]">ALREADY A MEMBER?</span>
              <div className="h-px flex-1 bg-[#E9E5DB]" />
            </div>

            <p className="text-center text-sm text-[#77766E]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#B9653C] transition hover:text-[#914728] hover:underline"
              >
                Log in
              </Link>
            </p>

            <p className="mt-6 text-center text-xs leading-5 text-[#A09D93]">
              Your next great idea starts here.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
