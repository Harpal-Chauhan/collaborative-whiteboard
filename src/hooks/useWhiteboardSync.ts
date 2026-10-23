
"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { Awareness } from "y-protocols/awareness";
import { IndexeddbPersistence } from "y-indexeddb";

export const useWhiteboardSync = (roomName: string) => {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [connected, setConnected] = useState(false);
  const [awareness, setAwareness] = useState<Awareness | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();

    let provider: WebsocketProvider | null = null;
    let cancelled = false;

    const persistence = new IndexeddbPersistence(
      `whiteboard-${roomName}`,
      doc
    );

    const startSync = async () => {
      try {
        await persistence.whenSynced;

        if (cancelled) return;

        let userName = "Guest";
        let userEmail = "";

        try {
          const response = await fetch("/api/auth/session", {
            cache: "no-store",
          });

          if (response.ok) {
            const session = await response.json();

            userName =
              session?.user?.name ||
              session?.user?.email ||
              "Guest";

            userEmail = session?.user?.email || "";
          }
        } catch {
          // Keep Guest as fallback if session cannot be loaded.
        }

        if (cancelled) return;

        const websocketUrl =
          process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
          "ws://localhost:1234";

        provider = new WebsocketProvider(
          websocketUrl,
          roomName,
          doc
        );

        const colors = [
          "#2563eb",
          "#16a34a",
          "#9333ea",
          "#ea580c",
          "#db2777",
        ];

        const color =
          colors[Math.floor(Math.random() * colors.length)];

        provider.awareness.setLocalStateField("user", {
          name: userName,
          email: userEmail,
          color,
        });

        provider.on(
          "status",
          ({ status }: { status: string }) => {
            setConnected(status === "connected");
          }
        );

        setAwareness(provider.awareness);
      } catch (error) {
        console.error("Whiteboard sync error:", error);
      }
    };

    setYdoc(doc);
    void startSync();

    return () => {
      cancelled = true;
      provider?.destroy();
      persistence.destroy();
      doc.destroy();

      setConnected(false);
      setYdoc(null);
      setAwareness(null);
    };
  }, [roomName]);

  return { ydoc, connected, awareness, activeRoom: roomName };
};
