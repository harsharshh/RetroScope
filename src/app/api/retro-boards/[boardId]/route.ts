import { BoardStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    const board = await prisma.retroBoard.findUnique({
      where: { id: boardId },
      include: {
        owner: true,
        facilitator: true,
        stages: {
          orderBy: { order: "asc" },
        },
        participants: {
          include: {
            user: true,
          },
        },
        cards: {
          include: {
            author: true,
            stage: true,
            comments: {
              include: {
                author: true,
              },
              orderBy: { createdAt: "asc" },
            },
            reactions: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error(`GET /api/retro-boards/${boardId} failed`, error);
    return NextResponse.json({ error: "Unable to retrieve board" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;
  let body: Partial<{
    title: string;
    summary: string | null;
    status: string;
    scheduledFor: string | null;
    facilitatorId: string | null;
  }>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const nextStatus = body.status
      ? (Object.values(BoardStatus).includes(body.status as BoardStatus)
          ? (body.status as BoardStatus)
          : null)
      : undefined;

    if (nextStatus === null) {
      return NextResponse.json({ error: "Invalid board status" }, { status: 422 });
    }

    const board = await prisma.retroBoard.update({
      where: { id: boardId },
      data: {
        title: body.title ?? undefined,
        summary: body.summary === undefined ? undefined : body.summary,
        status: nextStatus === undefined ? undefined : nextStatus,
        scheduledFor:
          body.scheduledFor === undefined
            ? undefined
            : body.scheduledFor
            ? new Date(body.scheduledFor)
            : null,
        facilitatorId:
          body.facilitatorId === undefined ? undefined : body.facilitatorId,
      },
    });

    return NextResponse.json(board);
  } catch (error) {
    console.error(`PATCH /api/retro-boards/${boardId} failed`, error);
    return NextResponse.json({ error: "Unable to update board" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    await prisma.retroBoard.delete({ where: { id: boardId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/retro-boards/${boardId} failed`, error);
    return NextResponse.json({ error: "Unable to delete board" }, { status: 500 });
  }
}
