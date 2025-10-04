import { CardType } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

  try {
    await prisma.retroCard.delete({ where: { id: cardId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/retro-boards/${boardId}/cards/${cardId} failed`, error);
    return NextResponse.json({ error: "Unable to delete card" }, { status: 500 });
  }
}
