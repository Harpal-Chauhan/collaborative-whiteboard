"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Circle,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
  Transformer,
} from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import * as Y from "yjs";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWhiteboardSync } from "@/hooks/useWhiteboardSync";

type DrawingLine = {
  id: string;
  points: number[];
  color: string;
  type?: "freehand" | "rectangle" | "circle" | "text";
  text?: string;
  rotation?: number;
};

type RemoteCursor = {
  clientId: number;
  name: string;
  color: string;
  x: number;
  y: number;
};

type TextEditorState = {
  id: string;
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  color: string;
} | null;

const getWorldPointer = (stage: Konva.Stage) =>
  stage.getRelativePointerPosition();

export default function WhiteboardCanvas() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, data: session } = useSession();

  const requestedBoardId = searchParams.get("boardId");

  const [syncRoom, setSyncRoom] = useState(
    requestedBoardId
      ? `whiteboard-${requestedBoardId}`
      : "collaborative-whiteboard",
  );

  const { ydoc, connected, awareness, activeRoom } =
    useWhiteboardSync(syncRoom);

  const [collaborators, setCollaborators] = useState<
    { clientId: number; name: string; email: string; color: string }[]
  >([]);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [whiteboardId, setWhiteboardId] = useState<string | null>(null);

  const [availableBoards, setAvailableBoards] = useState<
    {
      id: string;
      title: string;
      owner?: { id: string; name: string | null; email: string };
      members?: { role: string }[];
    }[]
  >([]);

  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [boardMessage, setBoardMessage] = useState("");
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);

  const currentBoard = availableBoards.find(
    (board) => board.id === whiteboardId,
  );
  const currentMemberRole = currentBoard?.members?.[0]?.role;
  const isOwner = !!currentBoard && (currentBoard.members?.length ?? 0) === 0;
  const isViewer = currentMemberRole === "VIEWER";
  const isEditor = currentMemberRole === "EDITOR";

  const userRole = !currentBoard
    ? "Loading"
    : isOwner
      ? "Owner"
      : isEditor
        ? "Editor"
        : isViewer
          ? "Viewer"
          : "Unknown";

  const [persistenceReady, setPersistenceReady] = useState(false);
  const [color, setColor] = useState("#333333");
  const [drawingTool, setDrawingTool] = useState<
    "select" | "freehand" | "rectangle" | "circle" | "text"
  >("freehand");

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [stageWidth, setStageWidth] = useState(900);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const [editingText, setEditingText] = useState<TextEditorState>(null);
  const [textInput, setTextInput] = useState("");

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sharedLinesRef = useRef<Y.Array<DrawingLine> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const currentLineIdRef = useRef<string | null>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const copiedShapeRef = useRef<DrawingLine | null>(null);
  const textEditorHandleRef = useRef(false);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);

  const lastAutoFitKeyRef = useRef("");

  useEffect(() => {
    if (!isCollaboratorsOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        !target.closest("[data-collaborators-dropdown]")
      ) {
        setIsCollaboratorsOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isCollaboratorsOpen]);

  useEffect(() => {
    if (whiteboardId) {
      setSyncRoom(`whiteboard-${whiteboardId}`);
    }
  }, [whiteboardId]);

  // Shared drawing data and undo/redo.
  useEffect(() => {
    if (!ydoc) return;

    const sharedLines = ydoc.getArray<DrawingLine>("lines");
    const undoManager = new Y.UndoManager(sharedLines);

    sharedLinesRef.current = sharedLines;
    undoManagerRef.current = undoManager;

    const syncLines = () => {
      setLines(sharedLines.toArray());
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    };

    sharedLines.observe(syncLines);
    undoManager.on("stack-item-added", syncLines);
    undoManager.on("stack-item-popped", syncLines);
    syncLines();

    return () => {
      sharedLines.unobserve(syncLines);
      undoManager.off("stack-item-added", syncLines);
      undoManager.off("stack-item-popped", syncLines);
      undoManager.destroy();
      sharedLinesRef.current = null;
      undoManagerRef.current = null;
    };
  }, [ydoc]);

  // Receive other users' cursor positions.
  useEffect(() => {
    if (!awareness) {
      setRemoteCursors([]);
      return;
    }

    const updateCursors = () => {
      const cursors: RemoteCursor[] = [];

      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;

        const user = state.user as
          | { name?: string; color?: string }
          | undefined;
        const cursor = state.cursor as { x?: number; y?: number } | undefined;

        if (
          user &&
          typeof cursor?.x === "number" &&
          typeof cursor?.y === "number"
        ) {
          cursors.push({
            clientId,
            name: user.name || "Guest",
            color: user.color || "#2563eb",
            x: cursor.x,
            y: cursor.y,
          });
        }
      });

      setRemoteCursors(cursors);
    };

    awareness.on("change", updateCursors);
    updateCursors();
    return () => awareness.off("change", updateCursors);
  }, [awareness]);

  // Identify the current user to other collaborators.
  useEffect(() => {
    if (!awareness) return;

    const currentUser = awareness.getLocalState()?.user as
      | { color?: string }
      | undefined;

    const userName =
      session?.user?.name?.trim() ||
      session?.user?.email?.split("@")[0] ||
      "Guest";

    awareness.setLocalStateField("user", {
      name: userName,
      email: session?.user?.email || "",
      color: currentUser?.color || "#2563eb",
    });
  }, [awareness, session]);

  // Copy/paste selected shapes.
  useEffect(() => {
    const handleCopyPaste = (event: KeyboardEvent) => {
      if (isViewer) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      if (!(event.ctrlKey || event.metaKey)) return;

      if (event.key.toLowerCase() === "c") {
        if (!selectedShapeId) return;
        const selected = lines.find((line) => line.id === selectedShapeId);
        if (!selected) return;

        event.preventDefault();
        copiedShapeRef.current = {
          ...selected,
          points: [...selected.points],
        };
      }

      if (event.key.toLowerCase() === "v") {
        const copied = copiedShapeRef.current;
        const sharedLines = sharedLinesRef.current;
        if (!copied || !sharedLines) return;

        event.preventDefault();
        const duplicate: DrawingLine = {
          ...copied,
          id: crypto.randomUUID(),
          points: [...copied.points],
          rotation: copied.rotation ?? 0,
        };

        if (duplicate.points.length >= 2) {
          duplicate.points[0] += 20;
          duplicate.points[1] += 20;
        }

        sharedLines.push([duplicate]);
        setSelectedShapeId(duplicate.id);
        setDrawingTool("select");
      }
    };

    window.addEventListener("keydown", handleCopyPaste);
    return () => window.removeEventListener("keydown", handleCopyPaste);
  }, [selectedShapeId, lines, isViewer]);

  // Load the selected board and its saved content.
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (!ydoc || !connected || activeRoom !== syncRoom) return;

    let cancelled = false;

    const loadWhiteboard = async () => {
      try {
        const response = await fetch("/api/whiteboards");
        if (!response.ok) {
          throw new Error("Whiteboard not loaded. Please check login.");
        }

        const boards = await response.json();
        if (cancelled) return;
        setAvailableBoards(boards);

        const targetBoardId = whiteboardId ?? requestedBoardId;
        let board = targetBoardId
          ? boards.find((item: { id: string }) => item.id === targetBoardId)
          : boards[0];

        if (!board && targetBoardId) board = boards[0];

        if (!board) {
          const createResponse = await fetch("/api/whiteboards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "My Whiteboard" }),
          });

          if (!createResponse.ok) {
            throw new Error("Whiteboard could not be created.");
          }
          board = await createResponse.json();
        }

        if (cancelled) return;

        const targetRoom = `whiteboard-${board.id}`;

        if (whiteboardId !== board.id || syncRoom !== targetRoom) {
          setPersistenceReady(false);
          setLines([]);
          setWhiteboardId(board.id);
          setSyncRoom(targetRoom);
          lastAutoFitKeyRef.current = "";
          return;
        }

        const sharedLines = ydoc.getArray<DrawingLine>("lines");

        if (sharedLines.length === 0 && board.content) {
          let savedLines: unknown;
          try {
            savedLines = JSON.parse(board.content);
          } catch (error) {
            console.error("Could not parse saved whiteboard content:", error);
            savedLines = [];
          }

          if (Array.isArray(savedLines) && savedLines.length > 0) {
            ydoc.transact(() => {
              sharedLines.insert(0, savedLines as DrawingLine[]);
            });
          }
        }

        setPersistenceReady(true);
      } catch (error) {
        console.error("Whiteboard load error:", error);
      }
    };

    void loadWhiteboard();
    return () => {
      cancelled = true;
    };
  }, [
    status,
    router,
    ydoc,
    connected,
    activeRoom,
    persistenceReady,
    requestedBoardId,
    whiteboardId,
    syncRoom,
  ]);

  // Delete the selected shape using Delete or Backspace.
  useEffect(() => {
    const handleDeleteKey = (event: KeyboardEvent) => {
      if (isViewer) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      if (!selectedShapeId) return;
      const sharedLines = sharedLinesRef.current;
      if (!sharedLines) return;

      const index = sharedLines
        .toArray()
        .findIndex((line) => line.id === selectedShapeId);
      if (index === -1) return;

      event.preventDefault();
      sharedLines.delete(index, 1);
      setSelectedShapeId(null);
    };

    window.addEventListener("keydown", handleDeleteKey);
    return () => window.removeEventListener("keydown", handleDeleteKey);
  }, [selectedShapeId, isViewer]);

  // Keep the transformer attached to the selected shape.
  useEffect(() => {
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;

    const selectedLine = lines.find((line) => line.id === selectedShapeId);
    const selectedNode =
      !isViewer &&
      selectedLine &&
      selectedLine.type !== "freehand" &&
      selectedShapeId
        ? stage.findOne(`#${selectedShapeId}`)
        : null;

    transformer.nodes(selectedNode ? [selectedNode] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedShapeId, lines, isViewer]);

  // Match the Stage width to the actual container, including narrow mobile screens.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setStageWidth(Math.max(1, Math.floor(entry.contentRect.width)));
    });

    observer.observe(container);
    setStageWidth(
      Math.max(1, Math.floor(container.getBoundingClientRect().width)),
    );

    return () => observer.disconnect();
  }, []);

  // Spacebar enables panning on desktop.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "TEXTAREA" ||
        target.tagName === "INPUT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setIsPanning(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setIsPanning(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Update the online collaborators list.
  useEffect(() => {
    if (!awareness) {
      setCollaborators([]);
      return;
    }

    const updateCollaborators = () => {
      const users: {
        clientId: number;
        name: string;
        email: string;
        color: string;
      }[] = [];

      awareness.getStates().forEach((state, clientId) => {
        const user = state.user as
          | { name?: string; email?: string; color?: string }
          | undefined;

        if (user) {
          users.push({
            clientId,
            name: user.name || "Guest",
            email: user.email || "",
            color: user.color || "#64748b",
          });
        }
      });

      setCollaborators(users);
    };

    awareness.on("change", updateCollaborators);
    updateCollaborators();
    return () => awareness.off("change", updateCollaborators);
  }, [awareness]);

  // Calculate drawing bounds and fit all content into the visible canvas.
  const fitDrawingToScreen = useCallback(
    (items: DrawingLine[] = lines) => {
      const stage = stageRef.current;
      if (!stage || stageWidth <= 0) return;

      if (items.length === 0) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        return;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      const addBounds = (
        left: number,
        top: number,
        right: number,
        bottom: number,
      ) => {
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
      };

      for (const line of items) {
        const points = line.points;
        if (points.length < 2) continue;

        if (line.type === "rectangle") {
          addBounds(
            Math.min(points[0], points[2]),
            Math.min(points[1], points[3]),
            Math.max(points[0], points[2]),
            Math.max(points[1], points[3]),
          );
        } else if (line.type === "circle") {
          const radius = Math.hypot(
            points[2] - points[0],
            points[3] - points[1],
          );
          addBounds(
            points[0] - radius,
            points[1] - radius,
            points[0] + radius,
            points[1] + radius,
          );
        } else if (line.type === "text") {
          const estimatedWidth = Math.max(40, (line.text?.length ?? 1) * 12);
          addBounds(
            points[0],
            points[1],
            points[0] + estimatedWidth,
            points[1] + 32,
          );
        } else {
          for (let i = 0; i + 1 < points.length; i += 2) {
            addBounds(points[i], points[i + 1], points[i], points[i + 1]);
          }
        }
      }

      if (
        !Number.isFinite(minX) ||
        !Number.isFinite(minY) ||
        !Number.isFinite(maxX) ||
        !Number.isFinite(maxY)
      ) {
        return;
      }

      const padding = 35;
      const contentWidth = Math.max(1, maxX - minX);
      const contentHeight = Math.max(1, maxY - minY);
      const canvasHeight = 600;

      const nextScale = Math.max(
        0.1,
        Math.min(
          3,
          (stageWidth - padding * 2) / contentWidth,
          (canvasHeight - padding * 2) / contentHeight,
        ),
      );

      const contentCenterX = (minX + maxX) / 2;
      const contentCenterY = (minY + maxY) / 2;

      setScale(nextScale);
      setPosition({
        x: stageWidth / 2 - contentCenterX * nextScale,
        y: canvasHeight / 2 - contentCenterY * nextScale,
      });
    },
    [lines, stageWidth],
  );

  // Automatically fit the initial drawing on mobile, once per board/viewport.
  useEffect(() => {
    if (!persistenceReady || !whiteboardId || stageWidth <= 0) return;

    const isMobile = stageWidth <= 640;
    const fitKey = `${whiteboardId}-${isMobile ? "mobile" : "desktop"}`;

    if (lastAutoFitKeyRef.current === fitKey) return;

    // Wait for saved or synchronised drawing data before fitting.
    if (lines.length === 0) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      lastAutoFitKeyRef.current = fitKey;
      return;
    }

    if (isMobile) {
      fitDrawingToScreen(lines);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }

    lastAutoFitKeyRef.current = fitKey;
  }, [persistenceReady, whiteboardId, stageWidth, lines, fitDrawingToScreen]);

  const startDrawing = () => {
    if (isViewer) return;

    const stage = stageRef.current;
    const sharedLines = sharedLinesRef.current;
    if (!stage || !sharedLines) return;

    const pointer = getWorldPointer(stage);
    if (!pointer) return;

    if (drawingTool === "text") {
      const container = containerRef.current;
      if (!container) return;

      const rawPointer = stage.getPointerPosition();
      if (!rawPointer) return;

      const stageRect = stage.container().getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const id = crypto.randomUUID();
      setTextInput("");
      textEditorHandleRef.current = false;

      setEditingText({
        id,
        x: pointer.x,
        y: pointer.y,
        screenX: rawPointer.x + stageRect.left - containerRect.left,
        screenY: rawPointer.y + stageRect.top - containerRect.top,
        color,
      });
      return;
    }

    if (drawingTool !== "freehand") return;

    const id = crypto.randomUUID();
    currentLineIdRef.current = id;

    sharedLines.push([
      {
        id,
        points: [pointer.x, pointer.y],
        color,
        type: "freehand",
      },
    ]);
  };

  const finishTextEditing = () => {
    if (textEditorHandleRef.current) return;
    textEditorHandleRef.current = true;

    const sharedLines = sharedLinesRef.current;
    const current = editingText;
    const text = textInput;

    if (current && text.trim() && sharedLines && !isViewer) {
      sharedLines.push([
        {
          id: current.id,
          points: [current.x, current.y],
          color: current.color,
          type: "text",
          text,
        },
      ]);
    }

    setEditingText(null);
    setTextInput("");
  };

  const draw = () => {
    if (isViewer) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = getWorldPointer(stage);
    const sharedLines = sharedLinesRef.current;
    const id = currentLineIdRef.current;

    if (!pointer || !sharedLines || !id) return;

    const index = sharedLines.toArray().findIndex((line) => line.id === id);
    if (index === -1) return;

    const line = sharedLines.get(index);
    sharedLines.delete(index, 1);
    sharedLines.insert(index, [
      { ...line, points: [...line.points, pointer.x, pointer.y] },
    ]);
  };

  const startShape = () => {
    if (isViewer) return;

    const stage = stageRef.current;
    const sharedLines = sharedLinesRef.current;
    if (!stage || !sharedLines) return;

    const pointer = getWorldPointer(stage);
    if (!pointer) return;

    shapeStartRef.current = { x: pointer.x, y: pointer.y };

    const id = crypto.randomUUID();
    currentLineIdRef.current = id;

    sharedLines.push([
      {
        id,
        points: [pointer.x, pointer.y, pointer.x, pointer.y],
        color,
        type: drawingTool === "rectangle" ? "rectangle" : "circle",
      },
    ]);
  };

  const drawShape = () => {
    if (isViewer) return;

    const stage = stageRef.current;
    const sharedLines = sharedLinesRef.current;
    const start = shapeStartRef.current;
    const id = currentLineIdRef.current;

    if (!stage || !sharedLines || !start || !id) return;

    const pointer = getWorldPointer(stage);
    if (!pointer) return;

    const index = sharedLines.toArray().findIndex((line) => line.id === id);
    if (index === -1) return;

    const shape = sharedLines.get(index);
    sharedLines.delete(index, 1);
    sharedLines.insert(index, [
      {
        ...shape,
        points: [start.x, start.y, pointer.x, pointer.y],
      },
    ]);
  };

  const stopDrawing = () => {
    currentLineIdRef.current = null;
    shapeStartRef.current = null;
  };

  const saveTransformedShape = (shapeId: string, node: Konva.Node) => {
    if (isViewer) return;

    const sharedLines = sharedLinesRef.current;
    if (!sharedLines) return;

    const index = sharedLines
      .toArray()
      .findIndex((line) => line.id === shapeId);
    if (index === -1) return;

    const shape = sharedLines.get(index);
    const rotation = node.rotation();

    if (shape.type === "rectangle") {
      const rect = node as Konva.Rect;
      const x = rect.x();
      const y = rect.y();
      const width = Math.max(1, rect.width() * rect.scaleX());
      const height = Math.max(1, rect.height() * rect.scaleY());

      rect.scaleX(1);
      rect.scaleY(1);

      sharedLines.delete(index, 1);
      sharedLines.insert(index, [
        { ...shape, points: [x, y, x + width, y + height], rotation },
      ]);
    } else if (shape.type === "circle") {
      const circle = node as Konva.Circle;
      const x = circle.x();
      const y = circle.y();
      const radius = Math.max(
        1,
        circle.radius() *
          Math.max(Math.abs(circle.scaleX()), Math.abs(circle.scaleY())),
      );

      circle.scaleX(1);
      circle.scaleY(1);

      sharedLines.delete(index, 1);
      sharedLines.insert(index, [
        { ...shape, points: [x, y, x + radius, y], rotation },
      ]);
    } else if (shape.type === "text") {
      const text = node as Konva.Text;
      sharedLines.delete(index, 1);
      sharedLines.insert(index, [
        {
          ...shape,
          points: [text.x(), text.y()],
          rotation,
        },
      ]);
    }
  };

  const moveShape = (shapeId: string, node: Konva.Node) => {
    if (isViewer) return;

    const sharedLines = sharedLinesRef.current;
    if (!sharedLines) return;

    const index = sharedLines
      .toArray()
      .findIndex((line) => line.id === shapeId);
    if (index === -1) return;

    const shape = sharedLines.get(index);
    if (!shape?.type) return;

    const [x1, y1, x2, y2] = shape.points;

    if (shape.type === "text") {
      const newX = node.x();
      const newY = node.y();

      sharedLines.delete(index, 1);
      sharedLines.insert(index, [{ ...shape, points: [newX, newY] }]);

      node.position({ x: 0, y: 0 });
      return;
    }

    const baseX = shape.type === "rectangle" ? Math.min(x1, x2) : x1;
    const baseY = shape.type === "rectangle" ? Math.min(y1, y2) : y1;

    const dx = node.x() - baseX;
    const dy = node.y() - baseY;

    sharedLines.delete(index, 1);
    sharedLines.insert(index, [
      {
        ...shape,
        points: [x1 + dx, y1 + dy, x2 + dx, y2 + dy],
      },
    ]);

    node.position({ x: 0, y: 0 });
  };

  const clearBoard = () => {
    if (isViewer) return;

    const sharedLines = sharedLinesRef.current;
    if (!sharedLines) return;

    sharedLines.delete(0, sharedLines.length);
    setSelectedShapeId(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    lastAutoFitKeyRef.current = "";
  };

  const undo = () => {
    if (!isViewer) undoManagerRef.current?.undo();
  };

  const redo = () => {
    if (!isViewer) undoManagerRef.current?.redo();
  };

  useEffect(() => {
    const handleUndoRedo = (event: KeyboardEvent) => {
      if (isViewer) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoManagerRef.current?.undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        undoManagerRef.current?.redo();
      }
    };

    window.addEventListener("keydown", handleUndoRedo);
    return () => window.removeEventListener("keydown", handleUndoRedo);
  }, [isViewer]);

  useEffect(() => {
    if (!whiteboardId) return;

    const refreshBoards = async () => {
      if (!navigator.onLine) return;

      try {
        const response = await fetch("/api/whiteboards");
        if (response.ok) setAvailableBoards(await response.json());
      } catch (error) {
        console.error("Role refresh error:", error);
      }
    };

    window.addEventListener("focus", refreshBoards);
    return () => window.removeEventListener("focus", refreshBoards);
  }, [whiteboardId]);

  const exportPNG = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const dataURL = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = dataURL;
    link.click();
  };

  const createWhiteboard = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newBoardTitle.trim();

    if (!title) {
      setBoardMessage("Please enter a whiteboard name.");
      return;
    }

    setCreatingBoard(true);
    setBoardMessage("");

    try {
      const response = await fetch("/api/whiteboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      const data = await response.json();
      if (!response.ok || !data.id) {
        throw new Error(data.error || "Could not create whiteboard.");
      }

      setAvailableBoards((previous) => [
        data,
        ...previous.filter((board) => board.id !== data.id),
      ]);

      setNewBoardTitle("");
      setPersistenceReady(false);
      setLines([]);
      setSelectedShapeId(null);
      lastAutoFitKeyRef.current = "";
      setWhiteboardId(data.id);
      setSyncRoom(`whiteboard-${data.id}`);

      router.replace(`/whiteboard?boardId=${encodeURIComponent(data.id)}`, {
        scroll: false,
      });
    } catch (error) {
      setBoardMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setCreatingBoard(false);
    }
  };

  const deleteWhiteboard = async (boardId: string, boardTitle: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${boardTitle}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingBoardId(boardId);
    setDeleteMessage("");

    try {
      const response = await fetch(
        `/api/boards/${encodeURIComponent(boardId)}`,
        { method: "DELETE" },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not delete whiteboard.");
      }

      const remainingBoards = availableBoards.filter(
        (board) => board.id !== boardId,
      );
      setAvailableBoards(remainingBoards);

      if (whiteboardId === boardId) {
        setPersistenceReady(false);
        setLines([]);
        setSelectedShapeId(null);
        lastAutoFitKeyRef.current = "";

        if (remainingBoards.length > 0) {
          const nextBoard = remainingBoards[0];
          setWhiteboardId(nextBoard.id);
          setSyncRoom(`whiteboard-${nextBoard.id}`);
          router.replace(
            `/whiteboard?boardId=${encodeURIComponent(nextBoard.id)}`,
            { scroll: false },
          );
        } else {
          setWhiteboardId(null);
          setSyncRoom("collaborative-whiteboard");
          router.replace("/whiteboard", { scroll: false });
        }
      }
    } catch (error) {
      setDeleteMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while deleting the board.",
      );
    } finally {
      setDeletingBoardId(null);
    }
  };

  const exportSVG = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const width = stage.width();
    const height = stage.height();
    const escapeXML = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const svgLines = lines
      .map((line) => {
        const points = line.points;

        if (line.type === "rectangle") {
          return `<rect x="${Math.min(points[0], points[2])}" y="${Math.min(points[1], points[3])}" width="${Math.abs(points[2] - points[0])}" height="${Math.abs(points[3] - points[1])}" fill="none" stroke="${escapeXML(line.color)}" stroke-width="2" />`;
        }

        if (line.type === "circle") {
          const radius = Math.hypot(
            points[2] - points[0],
            points[3] - points[1],
          );
          return `<circle cx="${points[0]}" cy="${points[1]}" r="${radius}" fill="none" stroke="${escapeXML(line.color)}" stroke-width="2" />`;
        }

        if (line.type === "text") {
          return `<text x="${points[0]}" y="${points[1]}" fill="${escapeXML(line.color)}" font-size="20">${escapeXML(line.text ?? "")}</text>`;
        }

        const svgPoints = Array.from(
          { length: Math.floor(points.length / 2) },
          (_, index) => `${points[index * 2]},${points[index * 2 + 1]}`,
        ).join(" ");

        return `<polyline points="${svgPoints}" fill="none" stroke="${escapeXML(line.color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
      })
      .join("");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svgLines}</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "whiteboard.svg";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportJSON = () => {
    const data = {
      title: currentBoard?.title || "Untitled canvas",
      lines,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "whiteboard.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleMouseDown = (
    event: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (drawingTool === "select") {
      if (event.target === event.target.getStage()) {
        setSelectedShapeId(null);
      }
      return;
    }

    if (drawingTool === "text") {
      startDrawing();
      return;
    }

    setSelectedShapeId(null);

    if (drawingTool === "freehand") {
      startDrawing();
    } else if (drawingTool === "rectangle" || drawingTool === "circle") {
      startShape();
    }
  };

  const handleMouseMove = () => {
    const stage = stageRef.current;
    if (!stage) return;

    // getRelativePointerPosition returns coordinates in the drawing's
    // coordinate system, so remote cursors remain correct while zoomed.
    const pointer = getWorldPointer(stage);

    if (pointer && awareness) {
      awareness.setLocalStateField("cursor", {
        x: pointer.x,
        y: pointer.y,
      });
    }

    if (drawingTool === "select" || drawingTool === "text") return;

    if (drawingTool === "freehand") {
      draw();
    } else if (drawingTool === "rectangle" || drawingTool === "circle") {
      drawShape();
    }
  };

  const handleMouseUp = () => stopDrawing();

  const zoomBy = (factor: number) => {
    const nextScale = Math.max(0.1, Math.min(3, scale * factor));
    const center = { x: stageWidth / 2, y: 300 };
    const point = {
      x: (center.x - position.x) / scale,
      y: (center.y - position.y) / scale,
    };

    setScale(nextScale);
    setPosition({
      x: center.x - point.x * nextScale,
      y: center.y - point.y * nextScale,
    });
  };

  const zoomIn = () => zoomBy(1.2);
  const zoomOut = () => zoomBy(1 / 1.2);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleShare = async () => {
    if (!whiteboardId || !shareEmail.trim()) {
      setShareMessage("Please enter an email address.");
      return;
    }

    setShareLoading(true);
    setShareMessage("");

    try {
      const response = await fetch(`/api/whiteboards/${whiteboardId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: shareEmail.trim(),
          role: shareRole,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to share whiteboard.");
      }

      setShareMessage("Whiteboard shared successfully!");
      setShareEmail("");

      const boardsResponse = await fetch("/api/whiteboards");
      if (boardsResponse.ok) {
        setAvailableBoards(await boardsResponse.json());
      }
    } catch (error) {
      setShareMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f2eb] px-2.5 py-3 text-stone-900 sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1680px] space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  d="M4 5.5A1.5 1.5 0 0 1 5.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5.5Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="m8 15 2.6-3 2.1 2 3.3-4M8 8h.01"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-950 sm:text-2xl">
                Canvas Studio
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Think together. Sketch ideas. Build something great.
              </p>
            </div>
          </div>

          <div className="relative" data-collaborators-dropdown>
            <button
              type="button"
              onClick={() => setIsCollaboratorsOpen((previous) => !previous)}
              aria-expanded={isCollaboratorsOpen}
              className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-left hover:bg-stone-100"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Collaborators
              </p>
              <p className="mt-0.5 text-sm font-semibold text-stone-800">
                {collaborators.length} online now
              </p>
            </button>

            {isCollaboratorsOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-stone-200 bg-white p-3 shadow-lg">
                <p className="mb-3 text-sm font-semibold">
                  Online collaborators
                </p>
                {collaborators.length === 0 ? (
                  <p className="text-sm text-stone-500">
                    No collaborators online.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {collaborators.map((collaborator) => (
                      <div
                        key={collaborator.clientId}
                        className="flex items-start gap-2 rounded-lg px-2 py-2"
                      >
                        <span
                          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: collaborator.color }}
                        />
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium">
                            {collaborator.name}
                          </p>
                          <p className="break-all text-xs text-stone-500">
                            {collaborator.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">My Whiteboards</h2>
              <p className="mt-1 text-sm text-stone-500">
                Create a board or open one you already have.
              </p>
            </div>

            {!isViewer && (
              <form
                onSubmit={createWhiteboard}
                className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"
              >
                <input
                  value={newBoardTitle}
                  onChange={(event) => setNewBoardTitle(event.target.value)}
                  placeholder="Enter board name"
                  maxLength={100}
                  aria-label="New whiteboard name"
                  className="min-w-0 rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 sm:w-56"
                />
                <button
                  type="submit"
                  disabled={creatingBoard}
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {creatingBoard ? "Creating..." : "+ Create Board"}
                </button>
              </form>
            )}
          </div>

          {boardMessage && (
            <p role="status" className="mt-3 text-sm text-rose-600">
              {boardMessage}
            </p>
          )}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {availableBoards.map((board) => (
              <div
                key={board.id}
                className={`rounded-xl border p-4 transition ${
                  board.id === whiteboardId
                    ? "border-emerald-600 bg-emerald-50/60"
                    : "border-stone-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-lg">
                    ▧
                  </div>
                  {board.id === whiteboardId && (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800">
                      Open
                    </span>
                  )}
                </div>
                <h3 className="mt-3 truncate text-sm font-bold">
                  {board.title || "Untitled Whiteboard"}
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  {board.members?.length ? "Shared board" : "Your board"}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (board.id === whiteboardId) return;
                      setPersistenceReady(false);
                      setLines([]);
                      setSelectedShapeId(null);
                      lastAutoFitKeyRef.current = "";
                      setWhiteboardId(board.id);
                      setSyncRoom(`whiteboard-${board.id}`);
                      router.replace(
                        `/whiteboard?boardId=${encodeURIComponent(board.id)}`,
                        { scroll: false },
                      );
                    }}
                    className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Open Board
                  </button>
                  {!board.members?.length && (
                    <button
                      type="button"
                      onClick={() =>
                        deleteWhiteboard(
                          board.id,
                          board.title || "Untitled Whiteboard",
                        )
                      }
                      disabled={deletingBoardId !== null}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingBoardId === board.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {deleteMessage && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {deleteMessage}
            </p>
          )}
          {availableBoards.length === 0 && (
            <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-500">
              No whiteboards yet. Create your first whiteboard above.
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 bg-stone-50/70 px-4 py-4 sm:px-6">
            <div>
              <h2 className="text-sm font-bold sm:text-base">
                Your creative toolkit
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Choose a tool, then create on the canvas
              </p>
              <span className="mt-2 inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                Role: {userRole}
              </span>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${connected ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "animate-pulse bg-amber-500"}`}
              />
              <span
                className={`text-xs font-semibold ${connected ? "text-emerald-700" : "text-amber-700"}`}
              >
                {connected ? "Connected" : "Connecting..."}
              </span>
            </div>
          </div>

          <div className="px-3 py-4 sm:px-5">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {!isViewer && (
                <>
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                      className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                      aria-label="Choose drawing color"
                    />
                    <span className="text-xs font-semibold">
                      {color.toUpperCase()}
                    </span>
                  </label>
                  {(
                    [
                      ["freehand", "Freehand"],
                      ["select", "Select"],
                      ["rectangle", "Rectangle"],
                      ["circle", "Circle"],
                      ["text", "Text"],
                    ] as const
                  ).map(([tool, label]) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => setDrawingTool(tool)}
                      className={`shrink-0 whitespace-nowrap rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
                        drawingTool === tool
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-stone-200 bg-white text-stone-700 hover:bg-emerald-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <div className="flex shrink-0 items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
                    <button
                      type="button"
                      onClick={undo}
                      disabled={!canUndo}
                      className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40"
                    >
                      ↶ Undo
                    </button>
                    <button
                      type="button"
                      onClick={redo}
                      disabled={!canRedo}
                      className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40"
                    >
                      ↷ Redo
                    </button>
                  </div>
                </>
              )}

              <div className="flex shrink-0 items-center gap-1 rounded-xl border border-stone-200 bg-white p-1">
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={scale <= 0.1}
                  aria-label="Zoom out"
                  className="h-9 w-9 rounded-lg text-lg hover:bg-stone-100 disabled:opacity-40"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  aria-label="Reset zoom"
                  title="Reset zoom"
                  className="min-w-14 rounded-lg px-2 py-2 text-xs font-bold"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={scale >= 3}
                  aria-label="Zoom in"
                  className="h-9 w-9 rounded-lg text-lg hover:bg-stone-100 disabled:opacity-40"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => fitDrawingToScreen()}
                className="shrink-0 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold hover:bg-stone-50"
              >
                Fit Drawing
              </button>
              <button
                type="button"
                onClick={exportPNG}
                className="shrink-0 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Export PNG
              </button>
              <button
                type="button"
                onClick={exportSVG}
                className="shrink-0 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold hover:bg-stone-50"
              >
                Export SVG
              </button>
              <button
                type="button"
                onClick={exportJSON}
                className="shrink-0 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold hover:bg-stone-50"
              >
                Export JSON
              </button>
              {!isViewer && (
                <button
                  type="button"
                  onClick={clearBoard}
                  className="shrink-0 rounded-xl border border-rose-200 px-3 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  ⌫ Clear Board
                </button>
              )}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setShareMessage("");
                    setShareOpen(true);
                  }}
                  className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  🔗 Share
                </button>
              )}
            </div>
          </div>
        </section>

        {shareOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold">Share whiteboard</h2>
                <button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  className="rounded-lg px-3 py-1 text-xl text-stone-500 hover:bg-stone-100"
                  aria-label="Close share modal"
                >
                  ×
                </button>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleShare();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={shareEmail}
                    onChange={(event) => setShareEmail(event.target.value)}
                    placeholder="Enter registered user's email"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-black outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Permission
                  </label>
                  <select
                    value={shareRole}
                    onChange={(event) =>
                      setShareRole(event.target.value as "EDITOR" | "VIEWER")
                    }
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-black outline-none focus:border-emerald-600"
                  >
                    <option value="EDITOR">Editor — can edit</option>
                    <option value="VIEWER">Viewer — view only</option>
                  </select>
                </div>
                {shareMessage && (
                  <p role="status" className="text-sm text-stone-600">
                    {shareMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={shareLoading}
                  className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
                >
                  {shareLoading ? "Sharing..." : "Send invitation"}
                </button>
              </form>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 px-4 py-4 sm:px-6">
            <div>
              <select
                value={whiteboardId ?? ""}
                onChange={(event) => {
                  const selected = availableBoards.find(
                    (board) => board.id === event.target.value,
                  );
                  if (!selected || selected.id === whiteboardId) return;
                  setPersistenceReady(false);
                  setLines([]);
                  setSelectedShapeId(null);
                  lastAutoFitKeyRef.current = "";
                  setWhiteboardId(selected.id);
                  setSyncRoom(`whiteboard-${selected.id}`);
                  router.replace(
                    `/whiteboard?boardId=${encodeURIComponent(selected.id)}`,
                    { scroll: false },
                  );
                }}
                className="max-w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold outline-none"
                aria-label="Choose whiteboard"
              >
                {availableBoards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.title || "Untitled Whiteboard"}
                    {board.members?.length ? " (Shared)" : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-stone-500">
                Your ideas, organized in one shared space.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-emerald-600">
                ✳
              </span>
              <div>
                <p className="text-xs font-semibold">Infinite ideas</p>
                <p className="text-[10px] text-stone-400">
                  Shared in real time
                </p>
              </div>
            </div>
          </div>

          <div
            ref={containerRef}
            className="relative w-full min-w-0 overflow-hidden bg-[#fffdf7]"
            style={{
              backgroundImage:
                "radial-gradient(#d8d1c4 0.75px, transparent 0.75px)",
              backgroundSize: "24px 24px",
              touchAction: "none",
            }}
          >
            <Stage
              ref={stageRef}
              width={stageWidth}
              height={600}
              scaleX={scale}
              scaleY={scale}
              x={position.x}
              y={position.y}
              draggable={isPanning}
              onDragMove={(event) =>
                setPosition({ x: event.target.x(), y: event.target.y() })
              }
              onDragEnd={(event) =>
                setPosition({ x: event.target.x(), y: event.target.y() })
              }
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <Layer>
                {lines.map((line) => {
                  const [x1, y1, x2, y2] = line.points;

                  if (line.type === "rectangle") {
                    return (
                      <Rect
                        key={line.id}
                        id={line.id}
                        x={Math.min(x1, x2)}
                        y={Math.min(y1, y2)}
                        width={Math.abs(x2 - x1)}
                        height={Math.abs(y2 - y1)}
                        stroke={line.color}
                        strokeWidth={2}
                        draggable={!isViewer && drawingTool === "select"}
                        onDragEnd={(event) => moveShape(line.id, event.target)}
                        rotation={line.rotation ?? 0}
                        onClick={() => {
                          if (drawingTool === "select")
                            setSelectedShapeId(line.id);
                        }}
                        onTap={() => {
                          if (drawingTool === "select")
                            setSelectedShapeId(line.id);
                        }}
                        onTransformEnd={(event) =>
                          saveTransformedShape(line.id, event.target)
                        }
                      />
                    );
                  }

                  if (line.type === "circle") {
                    const radius = Math.hypot(x2 - x1, y2 - y1);
                    return (
                      <Circle
                        key={line.id}
                        id={line.id}
                        x={x1}
                        y={y1}
                        radius={radius}
                        stroke={line.color}
                        strokeWidth={2}
                        draggable={!isViewer && drawingTool === "select"}
                        onDragEnd={(event) => moveShape(line.id, event.target)}
                        rotation={line.rotation ?? 0}
                        onClick={() => {
                          if (drawingTool === "select")
                            setSelectedShapeId(line.id);
                        }}
                        onTap={() => {
                          if (drawingTool === "select")
                            setSelectedShapeId(line.id);
                        }}
                        onTransformEnd={(event) =>
                          saveTransformedShape(line.id, event.target)
                        }
                      />
                    );
                  }

                  if (line.type === "text") {
                    return (
                      <Text
                        key={line.id}
                        id={line.id}
                        x={line.points[0]}
                        y={line.points[1]}
                        text={line.text ?? ""}
                        fill={line.color}
                        fontSize={20}
                        fontFamily="Arial"
                        padding={4}
                        rotation={line.rotation ?? 0}
                        draggable={!isViewer && drawingTool === "select"}
                        onDragEnd={(event) => moveShape(line.id, event.target)}
                        onClick={() => {
                          if (drawingTool === "select")
                            setSelectedShapeId(line.id);
                        }}
                        onTap={() => {
                          if (drawingTool === "select")
                            setSelectedShapeId(line.id);
                        }}
                        onTransformEnd={(event) =>
                          saveTransformedShape(line.id, event.target)
                        }
                      />
                    );
                  }

                  return (
                    <Line
                      key={line.id}
                      id={line.id}
                      points={line.points}
                      stroke={line.color}
                      strokeWidth={2}
                      lineCap="round"
                      lineJoin="round"
                      onClick={() => {
                        if (drawingTool === "select")
                          setSelectedShapeId(line.id);
                      }}
                      onTap={() => {
                        if (drawingTool === "select")
                          setSelectedShapeId(line.id);
                      }}
                    />
                  );
                })}

                <Transformer
                  ref={transformerRef}
                  rotateEnabled={!isViewer}
                  resizeEnabled={!isViewer}
                  enabledAnchors={
                    isViewer
                      ? []
                      : [
                          "top-left",
                          "top-center",
                          "top-right",
                          "middle-left",
                          "middle-right",
                          "bottom-left",
                          "bottom-center",
                          "bottom-right",
                        ]
                  }
                  boundBoxFunc={(oldBox, newBox) =>
                    newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
                  }
                />
              </Layer>
            </Stage>

            {remoteCursors.map((cursor) => (
              <div
                key={cursor.clientId}
                style={{
                  position: "absolute",
                  left: cursor.x * scale + position.x,
                  top: cursor.y * scale + position.y,
                  pointerEvents: "none",
                  zIndex: 20,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <svg
                  width="22"
                  height="28"
                  viewBox="0 0 22 28"
                  style={{ display: "block", overflow: "visible" }}
                >
                  <path
                    d="M2 1 L2 21 L7 16 L12 26 L16 24 L11 14 L19 14 Z"
                    fill={cursor.color}
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                <div
                  style={{
                    marginLeft: 12,
                    marginTop: 2,
                    padding: "4px 8px",
                    backgroundColor: cursor.color,
                    color: "#ffffff",
                    borderRadius: 5,
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: "16px",
                    whiteSpace: "nowrap",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                  }}
                >
                  {cursor.name}
                </div>
              </div>
            ))}

            {editingText && (
              <textarea
                autoFocus
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    textEditorHandleRef.current = true;
                    setEditingText(null);
                    setTextInput("");
                  }
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    finishTextEditing();
                  }
                }}
                placeholder="Type here..."
                className="absolute z-[9999] min-h-[44px] min-w-[180px] resize rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 shadow-md outline-none focus:border-emerald-600"
                style={{
                  left: editingText.screenX,
                  top: editingText.screenY,
                  color: editingText.color,
                  position: "absolute",
                }}
              />
            )}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 bg-[#faf7f0] px-4 py-2.5 sm:px-5">
            <span className="text-xs text-stone-500">
              Real-time sync via your WebSocket server.
            </span>
            <span className="rounded-md bg-white px-2 py-1 text-[10px] font-medium text-stone-500">
              Canvas · 600px
            </span>
          </footer>
        </section>

        <p className="mt-3 text-center text-xs text-stone-400">
          Your ideas, synchronized across connected tabs.
        </p>
      </div>
    </main>
  );
}
