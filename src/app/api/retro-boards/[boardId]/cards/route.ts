import { CardType } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPusherServer } from "@/lib/pusher-server";

type CreateCardBody = {
  content?: string;
  type?: string;
  stageId?: string;
  authorId?: string;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    const cards = await prisma.retroCard.findMany({
      where: { boardId },
      include: {
        author: true,
        stage: true,
        comments: {
          include: { author: true },
          orderBy: { createdAt: "asc" },
        },
        reactions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error(`GET /api/retro-boards/${boardId}/cards failed`, error);
    return NextResponse.json({ error: "Unable to fetch cards" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;
  let body: CreateCardBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.content || !body.stageId) {
    return NextResponse.json({ error: "content and stageId are required" }, { status: 422 });
  }

  try {
    const nextType = body.type
      ? (Object.values(CardType).includes(body.type as CardType)
          ? (body.type as CardType)
          : null)
      : undefined;

    if (nextType === null) {
      return NextResponse.json({ error: "Invalid card type" }, { status: 422 });
    }

    const card = await prisma.retroCard.create({
      data: {
        content: body.content,
        boardId,
        stageId: body.stageId,
        type: nextType === undefined ? undefined : nextType,
        authorId: body.authorId,
      },
      include: {
        author: true,
        stage: true,
      },
    });

    const pusher = getPusherServer();
    if (pusher) {
      const eventCard = {
        id: card.id,
        content: card.content,
        stageId: card.stageId,
        authorId: card.authorId,
        author: card.author
          ? {
              id: card.author.id,
              name: card.author.name,
              email: card.author.email,
            }
          : null,
        createdAt: card.createdAt?.toISOString() ?? null,
        reactions: [] as Array<{ id: string; userId: string; type: string }>,
      };
      void pusher.trigger(`presence-retro-board-${boardId}`, "card:created", { card: eventCard });
    }

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error(`POST /api/retro-boards/${boardId}/cards failed`, error);
    return NextResponse.json({ error: "Unable to create card" }, { status: 500 });
  }
}
