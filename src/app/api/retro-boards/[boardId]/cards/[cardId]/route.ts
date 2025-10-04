import { CardType } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerBoardEvent } from "@/lib/pusher-server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  const { boardId, cardId } = await params;
  let body: Partial<{
    content: string;
    type: string;
    stageId: string;
    votes: number;
    actorId: string;
  }>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
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

    const card = await prisma.retroCard.update({
      where: { id: cardId },
      data: {
        content: body.content ?? undefined,
        type: nextType === undefined ? undefined : nextType,
        stageId: body.stageId ?? undefined,
        votes: body.votes ?? undefined,
      },
      include: {
        author: true,
        reactions: true,
      },
    });

    await triggerBoardEvent(boardId, "card:updated", {
      card: {
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
        updatedAt: card.updatedAt?.toISOString() ?? null,
        reactions: card.reactions.map((reaction) => ({
          id: reaction.id,
          userId: reaction.userId,
          type: reaction.type,
        })),
      },
      initiatorId: body.actorId ?? null,
    });

    return NextResponse.json(card);
  } catch (error) {
    console.error(`PATCH /api/retro-boards/${boardId}/cards/${cardId} failed`, error);
    return NextResponse.json({ error: "Unable to update card" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  const { boardId, cardId } = await params;
  let body: { actorId?: string } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    await prisma.retroCard.delete({ where: { id: cardId } });
    await triggerBoardEvent(boardId, "card:deleted", { cardId, initiatorId: body.actorId ?? null });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/retro-boards/${boardId}/cards/${cardId} failed`, error);
    return NextResponse.json({ error: "Unable to delete card" }, { status: 500 });
  }
}
