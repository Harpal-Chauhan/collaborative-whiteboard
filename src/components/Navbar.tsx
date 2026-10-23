"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-lg font-bold text-white">
            W
          </span>
          <span className="text-lg font-semibold text-gray-900">
            Whiteboard
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === "/"
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Home
          </Link>

          <Link
            href="/whiteboard"
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === "/whiteboard"
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Whiteboard
          </Link>
        </div>
      </div>
    </nav>
  );
}
