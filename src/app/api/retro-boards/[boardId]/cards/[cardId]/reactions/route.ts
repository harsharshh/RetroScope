import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerBoardEvent } from "@/lib/pusher-server";

type ReactionBody = {
  type?: string;
  userId?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  const { boardId, cardId } = await params;
  let body: ReactionBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.type || !body.userId) {
    return NextResponse.json({ error: "type and userId are required" }, { status: 422 });
  }

  try {
    const reaction = await prisma.retroCardReaction.upsert({
      where: {
        cardId_userId_type: {
          cardId,
          userId: body.userId,
          type: body.type,
        },
      },
      update: {},
      create: {
        cardId,
        userId: body.userId,
        type: body.type,
      },
    });

    await triggerBoardEvent(boardId, "card:reaction-added", {
      cardId,
      reaction: {
        id: reaction.id,
        userId: reaction.userId,
        type: reaction.type,
      },
      initiatorId: body.userId ?? null,
    });

    return NextResponse.json(reaction, { status: 201 });
  } catch (error) {
    console.error(`POST reaction for card ${cardId} failed`, error);
    return NextResponse.json({ error: "Unable to add reaction" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  const { boardId, cardId } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const userId = searchParams.get("userId");

  if (!type || !userId) {
    return NextResponse.json({ error: "type and userId query params are required" }, { status: 422 });
  }

  try {
    await prisma.retroCardReaction.delete({
      where: {
        cardId_userId_type: {
          cardId,
          userId,
          type,
        },
      },
    });

    await triggerBoardEvent(boardId, "card:reaction-removed", {
      cardId,
      reaction: { userId, type },
      initiatorId: userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE reaction for card ${cardId} failed`, error);
    return NextResponse.json({ error: "Unable to remove reaction" }, { status: 500 });
  }
}
