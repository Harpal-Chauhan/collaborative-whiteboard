
# Collaborative Whiteboard

A real-time collaborative whiteboard where users can draw, create shapes, add text, and work together.

## Live Demo

🔗 **Live Website:** [Open Whiteboard](https://collaborative-whiteboard-ten-sigma.vercel.app/)

## Features

- Real-time collaboration
- Freehand drawing, rectangles, circles, and text
- Multiple whiteboards
- Share boards with Editor or Viewer access
- Undo and Redo
- Zoom and pan
- Export as PNG, SVG, and JSON
- User authentication
- Automatic logout after 2 hours

## Tech Stack

- Next.js and React
- TypeScript and Tailwind CSS
- Konva.js
- Yjs and WebSocket
- Prisma ORM and PostgreSQL
- NextAuth.js

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Configure the required environment variables in your `.env` file:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_WEBSOCKET_URL`

## Author

**Harpal Chauhan**
