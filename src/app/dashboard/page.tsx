"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Board = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
};

export default function DashboardPage() {
  const { status } = useSession();

  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      setBoards([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchBoards() {
      setLoading(true);

      try {
        const response = await fetch("/api/boards");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load boards.");
        }

        if (!cancelled) {
          setBoards(Array.isArray(data.boards) ? data.boards : []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setBoards([]);
          setError(
            err instanceof Error
              ? err.message
              : "Could not load boards. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchBoards();

    return () => {
      cancelled = true;
    };
  }, [status]);

  const handleCreateBoard = async () => {
    if (creating) return;

    setCreating(true);
    setCreateError("");

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newBoardTitle.trim() || "Untitled Whiteboard",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create board.");
      }

      if (!data.board?.id) {
        throw new Error(
          "Board was created, but its details were not returned.",
        );
      }

      setBoards((current) => [data.board as Board, ...current]);
      setNewBoardTitle("");
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Could not create board.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBoard = async (board: Board) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${board.title}"? This action cannot be undone.`,
    );

    if (!confirmed || deletingBoardId) return;

    setDeletingBoardId(board.id);
    setDeleteError("");

    try {
      const response = await fetch(
        `/api/boards/${encodeURIComponent(board.id)}`,
        { method: "DELETE" },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Could not delete this board.");
      }

      setBoards((currentBoards) =>
        currentBoards.filter((item) => item.id !== board.id),
      );
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Could not delete this board.",
      );
    } finally {
      setDeletingBoardId(null);
    }
  };

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F2EB] p-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[#244C3A]" />
          <p className="mt-4 text-sm font-medium text-[#647067]">
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F2EB] p-5">
        <section className="w-full max-w-md rounded-3xl border border-[#E4DED2] bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8EEE8] text-3xl text-[#244C3A]">
            ✳
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#24372D]">
            Welcome back
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#727A72]">
            Please log in to access your collaborative whiteboards.
          </p>

          <Link
            href="/login"
            className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-[#244C3A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#193A2A] focus:outline-none focus:ring-2 focus:ring-[#244C3A] focus:ring-offset-2"
          >
            Go to Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F2EB] text-[#24372D]">
      {/* Top navigation */}
      <header className="border-b border-[#E4DED2] bg-[#FBFAF7]">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#244C3A] text-xl text-white shadow-sm">
              ✳
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight sm:text-lg">
                Canvas Studio
              </p>
              <p className="text-xs text-[#7A8178]">Collaborative workspace</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2 rounded-full border border-[#DCE5DA] bg-[#EDF2EA] px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[#548765]" />
            <span className="text-xs font-semibold text-[#31583D] sm:text-sm">
              Workspace
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {/* Dashboard introduction */}
        <section className="relative overflow-hidden rounded-3xl bg-[#244C3A] px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10 lg:px-12 lg:py-12">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-4 -top-12 h-44 w-44 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-[#D97745]/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-[#E5EDE5]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D9A17E]" />
                YOUR CREATIVE SPACE
              </div>

              <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                My Whiteboards
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-[#D5E0D7] sm:text-base sm:leading-7">
                Bring your ideas to life. Create, organize, and collaborate on
                your boards in one place.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg">
                ▦
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {loading ? "—" : boards.length}
                </p>
                <p className="text-xs text-[#D5E0D7]">
                  {boards.length === 1 ? "Whiteboard" : "Whiteboards"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Create board section */}
        <section
          id="create-board"
          className="mt-8 rounded-3xl border border-[#E4DED2] bg-[#FBFAF7] p-5 shadow-sm sm:p-7"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8EEE8] text-2xl text-[#244C3A]">
              +
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                Create a new board
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#777D74]">
                Start with a blank canvas and turn your ideas into reality.
              </p>
            </div>
          </div>

          <form
            className="mt-6 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateBoard();
            }}
          >
            <input
              type="text"
              value={newBoardTitle}
              onChange={(event) => setNewBoardTitle(event.target.value)}
              placeholder="Give your whiteboard a name..."
              maxLength={100}
              disabled={creating}
              aria-label="New whiteboard title"
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#DED9CE] bg-white px-4 py-3 text-sm text-[#24372D] outline-none transition placeholder:text-[#9A9D94] focus:border-[#548765] focus:ring-4 focus:ring-[#548765]/10 disabled:cursor-not-allowed disabled:bg-[#F3F1EC]"
            />

            <button
              type="submit"
              disabled={creating}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#244C3A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#193A2A] focus:outline-none focus:ring-2 focus:ring-[#244C3A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Creating...
                </>
              ) : (
                <>
                  <span className="text-lg leading-none">+</span>
                  Create board
                </>
              )}
            </button>
          </form>

          {createError && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {createError}
            </p>
          )}
        </section>

        {/* Board collection */}
        <section className="mt-10 sm:mt-12">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A8B7D]">
                YOUR COLLECTION
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                All boards
              </h2>
            </div>

            {!loading && !error && boards.length > 0 && (
              <p className="text-sm text-[#777D74]">
                {boards.length} {boards.length === 1 ? "board" : "boards"}{" "}
                available
              </p>
            )}
          </div>

          {loading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-2xl border border-[#E4DED2] bg-[#FBFAF7] p-5"
                >
                  <div className="h-11 w-11 rounded-xl bg-[#E8E5DC]" />
                  <div className="mt-5 h-4 w-2/3 rounded bg-[#E8E5DC]" />
                  <div className="mt-3 h-3 w-1/2 rounded bg-[#EEEBE4]" />
                  <div className="mt-7 h-10 rounded-xl bg-[#EEEBE4]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="mt-6 rounded-2xl border border-red-200 bg-white p-6 sm:p-8"
            >
              <h3 className="font-semibold text-[#24372D]">
                We couldn&apos;t load your boards
              </h3>
              <p className="mt-2 break-words text-sm leading-6 text-red-700">
                {error}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 rounded-xl bg-[#244C3A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193A2A]"
              >
                Try again
              </button>
            </div>
          ) : boards.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-[#D8D1C4] bg-[#FBFAF7] px-5 py-12 text-center sm:px-8 sm:py-16">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8EEE8] text-3xl text-[#244C3A]">
                ▱
              </div>

              <h3 className="mt-5 text-xl font-bold">
                Your canvas starts here
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777D74]">
                You haven&apos;t created a board yet. Create your first
                whiteboard above and start collaborating.
              </p>

              <a
                href="#create-board"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#244C3A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193A2A]"
              >
                Create your first board
              </a>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board, index) => (
                <article
                  key={board.id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E4DED2] bg-[#FBFAF7] shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#B8C8B7] hover:shadow-lg hover:shadow-[#244C3A]/5"
                >
                  <div className="h-1.5 bg-[#244C3A]" />

                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8EEE8] text-xl text-[#244C3A] transition group-hover:bg-[#DCE8DC]">
                        ▱
                      </div>

                      <span className="rounded-full border border-[#E4DED2] bg-white px-3 py-1 text-xs font-medium text-[#777D74]">
                        Board {index + 1}
                      </span>
                    </div>

                    <h3 className="mt-5 break-words text-lg font-bold tracking-tight text-[#24372D]">
                      {board.title}
                    </h3>

                    <p className="mt-2 text-xs text-[#85877E]">
                      Last updated{" "}
                      {Number.isNaN(Date.parse(board.updatedAt))
                        ? "recently"
                        : new Date(board.updatedAt).toLocaleDateString(
                            undefined,
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                    </p>

                    <div className="mt-6 flex flex-col gap-2 border-t border-[#EAE5DB] pt-4 sm:flex-row">
                      <Link
                        href={`/whiteboard?boardId=${encodeURIComponent(board.id)}`}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#C9D6C7] bg-[#EDF2EA] px-4 py-3 text-sm font-semibold text-[#244C3A] transition hover:bg-[#244C3A] hover:text-white"
                      >
                        Open whiteboard →
                      </Link>

                      <button
                        type="button"
                        onClick={() => void handleDeleteBoard(board)}
                        disabled={deletingBoardId !== null}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E8C7BC] bg-[#FFF5F0] px-4 py-3 text-sm font-semibold text-[#A44732] transition hover:bg-[#D97745] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                      >
                        {deletingBoardId === board.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                    {deleteError && (
                      <p
                        role="alert"
                        className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                      >
                        {deleteError}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-12 border-t border-[#E4DED2] py-6">
          <p className="text-center text-xs leading-5 text-[#85877E]">
            Canvas Studio · A shared space for better ideas.
          </p>
        </footer>
      </div>
    </main>
  );
}
