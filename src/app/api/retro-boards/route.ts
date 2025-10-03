import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DEFAULT_STAGE_TEMPLATE = [
  { name: "Start", order: 0, type: "START" as const },
  { name: "Stop", order: 1, type: "STOP" as const },
  { name: "Continue", order: 2, type: "CONTINUE" as const },
];

type CreateBoardBody = {
  title: string;
  summary?: string;
  ownerId: string;
  facilitatorId?: string;
  scheduledFor?: string;
  stages?: Array<{ name: string; order?: number }>;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ownerId = searchParams.get("ownerId") ?? undefined;

  try {
    const boards = await prisma.retroBoard.findMany({
      where: ownerId ? { ownerId } : undefined,
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
        participants: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(boards);
  } catch (error) {
    console.error("GET /api/retro-boards failed", error);
    return NextResponse.json({ error: "Unable to fetch boards" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: CreateBoardBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.title || !body.ownerId) {
    return NextResponse.json({ error: "title and ownerId are required" }, { status: 422 });
  }

  const stagePayload = (body.stages?.length ? body.stages : DEFAULT_STAGE_TEMPLATE).map(
    (stage, index) => ({
      name: stage.name,
      order: stage.order ?? index,
    })
  );

  try {
    const board = await prisma.retroBoard.create({
      data: {
        title: body.title,
        summary: body.summary,
        ownerId: body.ownerId,
        facilitatorId: body.facilitatorId,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
        stages: {
          create: stagePayload,
        },
        participants: {
          create: {
            userId: body.ownerId,
            role: "OWNER",
          },
        },
      },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
        participants: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error("POST /api/retro-boards failed", error);
    return NextResponse.json({ error: "Unable to create board" }, { status: 500 });
  }
}
