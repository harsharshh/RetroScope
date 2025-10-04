import { CardType } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error(`POST /api/retro-boards/${boardId}/cards failed`, error);
    return NextResponse.json({ error: "Unable to create card" }, { status: 500 });
  }
}
