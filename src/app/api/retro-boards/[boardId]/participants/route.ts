import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;
  let body: { userId?: string; role?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 422 });
  }

  try {
    const participant = await prisma.retroBoardParticipant.upsert({
      where: {
        boardId_userId: {
          boardId,
          userId: body.userId,
        },
      },
      update: {
        role: body.role,
      },
      create: {
        boardId,
        userId: body.userId,
        role: body.role,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    console.error(`POST /api/retro-boards/${boardId}/participants failed`, error);
    return NextResponse.json({ error: "Unable to add participant" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  try {
    const participants = await prisma.retroBoardParticipant.findMany({
      where: { boardId },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json(participants);
  } catch (error) {
    console.error(`GET /api/retro-boards/${boardId}/participants failed`, error);
    return NextResponse.json({ error: "Unable to fetch participants" }, { status: 500 });
  }
}
