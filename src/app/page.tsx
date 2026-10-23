"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

const HomePage = () => {
  const { data: session, status } = useSession();

  const isLoggedIn = status === "authenticated";
  const isLoading = status === "loading";

  return (
    <main className="min-h-screen overflow-hidden bg-[#F5F2EB] text-[#24352B]">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#E5E0D5] bg-[#FCFBF8]/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#244C3A] text-lg font-bold text-white">
              C
            </span>
            <span className="text-base font-bold tracking-tight sm:text-lg">
              Canvas Studio
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoading ? (
              <span className="px-3 py-2 text-sm text-[#77766E]">
                Checking...
              </span>
            ) : isLoggedIn ? (
              <Link
                href="/whiteboard"
                className="rounded-xl bg-[#244C3A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#193B2B] sm:px-5"
              >
                Open Whiteboard <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#34483A] transition hover:bg-[#EAE7DE] sm:px-4"
                >
                  Log in
                </Link>

                <Link
                  href="/signup"
                  className="rounded-xl bg-[#244C3A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#193B2B] sm:px-5"
                >
                  Get Started <span aria-hidden="true">→</span>
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero section */}
      <section className="relative">
        <div className="pointer-events-none absolute -right-32 top-10 h-72 w-72 rounded-full bg-[#D97745]/10 blur-3xl sm:h-96 sm:w-96" />
        <div className="pointer-events-none absolute -left-32 top-48 h-72 w-72 rounded-full bg-[#244C3A]/10 blur-3xl sm:h-96 sm:w-96" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DCE5D8] bg-white/80 px-4 py-2 text-xs font-semibold text-[#45664A] shadow-sm sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-[#56805D]" />
              Real-time collaborative whiteboard
            </div>

            <h1 className="mt-7 max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight text-[#24352B] sm:text-5xl lg:text-6xl">
              Great ideas don&apos;t happen in{" "}
              <span className="text-[#B9653C]">isolation.</span>
              <span className="mt-2 block">Create them together.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[#77766E] sm:text-lg sm:leading-8">
              Sketch your thoughts, organize your plans, and collaborate with
              your team on one shared digital canvas. From the first idea to the
              final plan, make every thought count.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={isLoggedIn ? "/whiteboard" : "/signup"}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#244C3A] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#244C3A]/15 transition hover:-translate-y-0.5 hover:bg-[#193B2B]"
              >
                {isLoggedIn ? "Open Whiteboard" : "Create Your Account"}
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href={isLoggedIn ? "/dashboard" : "/login"}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#D8D4C9] bg-white px-6 py-3.5 text-sm font-semibold text-[#34483A] transition hover:border-[#A9B9A5] hover:bg-[#FDFCF9]"
              >
                {isLoggedIn ? "View Dashboard" : "I already have an account"}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[#77766E]">
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#DCE5D8] text-xs font-bold text-[#244C3A]">
                  ✓
                </span>
                Easy to use
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#DCE5D8] text-xs font-bold text-[#244C3A]">
                  ✓
                </span>
                Real-time updates
              </span>
            </div>
          </div>

          {/* CSS-based whiteboard preview */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-3 rotate-2 rounded-[2rem] bg-[#D97745]/10 sm:-inset-4" />

            <div className="relative overflow-hidden rounded-2xl border border-[#E1DDD2] bg-white shadow-2xl shadow-[#244C3A]/10">
              <div className="flex items-center justify-between border-b border-[#E9E5DB] bg-[#FCFBF8] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D97745]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D9C18A]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8CA88A]" />
                </div>
                <span className="text-xs font-medium text-[#77766E]">
                  Team brainstorm
                </span>
                <span className="rounded-lg bg-[#E5EBDD] px-2.5 py-1 text-xs font-semibold text-[#45664A]">
                  Live canvas
                </span>
              </div>

              <div className="relative min-h-[300px] overflow-hidden bg-[#FFFEFB] p-4 sm:min-h-[380px] sm:p-6">
                <div
                  className="pointer-events-none absolute inset-0 opacity-50"
                  style={{
                    backgroundImage:
                      "radial-gradient(#D8D4C9 0.8px, transparent 0.8px)",
                    backgroundSize: "18px 18px",
                  }}
                />

                <div className="relative mx-auto flex min-h-[260px] max-w-md flex-col items-center justify-center sm:min-h-[330px]">
                  <div className="z-10 rounded-xl border border-[#C9D8C5] bg-[#EAF0E5] px-5 py-3 text-center shadow-sm sm:px-7">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#638064]">
                      Our next big idea
                    </p>
                    <p className="mt-1 text-base font-bold text-[#244C3A] sm:text-lg">
                      Think. Plan. Create.
                    </p>
                  </div>

                  <svg
                    viewBox="0 0 320 110"
                    className="h-20 w-full max-w-xs shrink-0 sm:h-24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M160 0 V24 C160 42 55 35 55 66"
                      stroke="#8CA88A"
                      strokeWidth="2"
                      strokeDasharray="5 5"
                    />
                    <path
                      d="M160 24 C160 42 265 35 265 66"
                      stroke="#D97745"
                      strokeWidth="2"
                      strokeDasharray="5 5"
                    />
                    <path
                      d="M50 59 L55 68 L61 59"
                      stroke="#8CA88A"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M259 59 L265 68 L271 59"
                      stroke="#D97745"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <div className="grid w-full grid-cols-2 gap-3 sm:gap-5">
                    <div className="rounded-xl border border-[#E6D5B9] bg-[#FBF1DF] p-3 sm:p-4">
                      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0DFC1] text-lg">
                        ✎
                      </div>
                      <p className="text-sm font-bold text-[#795832]">
                        Sketch ideas
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#8A765D]">
                        Explore possibilities
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#EBCBB9] bg-[#FFF0E7] p-3 sm:p-4">
                      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#F6DDCE] text-lg">
                        ◇
                      </div>
                      <p className="text-sm font-bold text-[#9A5535]">
                        Build together
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#A5745B]">
                        Share your vision
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2 self-end rounded-full border border-[#E9E5DB] bg-white px-3 py-2 shadow-sm">
                    <div className="flex -space-x-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#244C3A] text-[10px] font-bold text-white">
                        A
                      </span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#D97745] text-[10px] font-bold text-white">
                        B
                      </span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#8CA88A] text-[10px] font-bold text-white">
                        C
                      </span>
                    </div>
                    <span className="text-xs font-medium text-[#77766E]">
                      Better ideas, together
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-2 hidden rounded-xl border border-[#E5E0D5] bg-white px-4 py-3 shadow-lg sm:block lg:-left-8">
              <p className="text-xs text-[#77766E]">One shared space</p>
              <p className="mt-1 text-sm font-bold text-[#244C3A]">
                Ideas in motion
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-[#E5E0D5] bg-[#FCFBF8]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B9653C]">
              Everything in one place
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#24352B] sm:text-4xl">
              A simpler way to work together
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#77766E] sm:text-base">
              Keep your workflow focused with tools designed to help your team
              think clearly and create confidently.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
            <article className="group rounded-2xl border border-[#E5E0D5] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#C9D8C5] hover:shadow-xl hover:shadow-[#244C3A]/5 sm:p-7">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E5EBDD] text-2xl">
                ✎
              </div>
              <h3 className="text-lg font-bold text-[#24352B]">
                Draw Your Ideas
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#77766E]">
                Sketch freely, create shapes, and turn your thoughts into clear
                visual plans on an interactive canvas.
              </p>
            </article>

            <article className="group rounded-2xl border border-[#E5E0D5] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#EBCBB9] hover:shadow-xl hover:shadow-[#244C3A]/5 sm:p-7">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F9E7DC] text-2xl">
                ↗
              </div>
              <h3 className="text-lg font-bold text-[#24352B]">
                Collaborate in Real Time
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#77766E]">
                Share a board with your team and see drawing changes synchronize
                across connected users.
              </p>
            </article>

            <article className="group rounded-2xl border border-[#E5E0D5] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#D8D4C9] hover:shadow-xl hover:shadow-[#244C3A]/5 sm:col-span-2 sm:p-7 lg:col-span-1">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F2EBD8] text-2xl">
                ◇
              </div>
              <h3 className="text-lg font-bold text-[#24352B]">
                Keep Things Organized
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#77766E]">
                Keep your work in one place, revisit your boards, and make
                planning easier for everyone.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#244C3A] px-6 py-12 text-center shadow-xl shadow-[#244C3A]/10 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10 sm:h-80 sm:w-80" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full border border-white/10 sm:h-96 sm:w-96" />

          <div className="relative mx-auto max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E8B18F]">
              Your next idea starts here
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              Ready to create something together?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
              Bring your team, ideas, and creativity into one shared workspace.
              Start with a blank canvas and see where it takes you.
            </p>

            <Link
              href={isLoggedIn ? "/whiteboard" : "/signup"}
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F5F2EB] px-6 py-3.5 text-sm font-bold text-[#244C3A] transition hover:-translate-y-0.5 hover:bg-white"
            >
              {isLoggedIn ? "Open Your Whiteboard" : "Get Started for Free"}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E0D5] bg-[#FCFBF8]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#244C3A] text-xs font-bold text-white">
              C
            </span>
            <span className="text-sm font-bold text-[#34483A]">
              Canvas Studio
            </span>
          </Link>
          <p className="text-xs text-[#99968D]">
            Think together. Create together.
          </p>
        </div>
      </footer>
    </main>
  );
};

export default HomePage;
