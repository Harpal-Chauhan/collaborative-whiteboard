"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

function SessionTimeout() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session) return;

    const loginTimeKey = "whiteboard-session-start";
    let loginTime = sessionStorage.getItem(loginTimeKey);

    if (!loginTime) {
      loginTime = Date.now().toString();
      sessionStorage.setItem(loginTimeKey, loginTime);
    }

    const expiresAt = Number(loginTime) + 2 * 60 * 60 * 1000;
    const remaining = expiresAt - Date.now();

    if (remaining <= 0) {
      sessionStorage.removeItem(loginTimeKey);
      void signOut({ callbackUrl: "/login" });
      return;
    }

    const timer = window.setTimeout(() => {
      sessionStorage.removeItem(loginTimeKey);
      void signOut({ callbackUrl: "/login" });
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [session, status]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionTimeout />
      {children}
    </SessionProvider>
  );
}
