"use client";

import WhiteboardCanvas from "@/components/WhiteboardCanvas";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const WhiteboardPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F2EB] px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#D9E2D7] border-t-[#244C3A]" />
          <p className="text-sm font-medium text-[#244C3A]">
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F5F2EB]">
      {/* Responsive header */}
      <header className="sticky top-0 z-40 border-b border-[#E5E0D5] bg-[#FCFBF8]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo and title */}
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#244C3A] text-lg font-bold text-white">
              C
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[#24352B] sm:text-base">
                Canvas Studio
              </span>
              <span className="hidden text-xs text-[#88877E] sm:block">
                Collaborative workspace
              </span>
            </span>
          </Link>

          {/* User information and logout */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-[#88877E]">Signed in as</p>
              <p className="max-w-[220px] truncate text-sm font-semibold text-[#34483A]">
                {session.user?.name || session.user?.email || "User"}
              </p>
            </div>

            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E5EBDD] text-sm font-bold text-[#244C3A]"
              title={session.user?.name || session.user?.email || "User"}
            >
              {(session.user?.name || session.user?.email || "U")
                .charAt(0)
                .toUpperCase()}
            </span>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-xl border border-[#DDD9CE] bg-white px-3 py-2 text-sm font-semibold text-[#34483A] transition hover:border-[#D97745] hover:bg-[#FFF7F1] hover:text-[#A64F2B] focus:outline-none focus:ring-4 focus:ring-[#244C3A]/10 sm:px-4"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Whiteboard content */}
      <section className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#B9653C]">
              Your creative space
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-[#24352B] sm:text-3xl">
              Collaborative Whiteboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77766E] sm:text-base">
              Sketch ideas, organize thoughts, and collaborate with your team in
              real time.
            </p>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-full border border-[#DCE5D8] bg-white px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[#56805D]" />
            <span className="text-xs font-medium text-[#45664A]">
              Workspace ready
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E5E0D5] bg-white shadow-sm shadow-[#244C3A]/5">
          <WhiteboardCanvas />
        </div>
      </section>
    </main>
  );
};

export default WhiteboardPage;
