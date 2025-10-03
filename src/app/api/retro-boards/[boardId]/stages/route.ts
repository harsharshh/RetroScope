import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { boardId: string } }
) {
  const { boardId } = params;
  let body: { name?: string; order?: number };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json({ error: "Stage name is required" }, { status: 422 });
  }

  try {
    const stageCount = await prisma.retroStage.count({ where: { boardId } });
    const stage = await prisma.retroStage.create({
      data: {
        boardId,
        name: body.name,
        order: body.order ?? stageCount,
      },
    });
    return NextResponse.json(stage, { status: 201 });
  } catch (error) {
    console.error(`POST /api/retro-boards/${boardId}/stages failed`, error);
    return NextResponse.json({ error: "Unable to create stage" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { boardId: string } }
) {
  const { boardId } = params;

  try {
    const stages = await prisma.retroStage.findMany({
      where: { boardId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(stages);
  } catch (error) {
    console.error(`GET /api/retro-boards/${boardId}/stages failed`, error);
    return NextResponse.json({ error: "Unable to fetch stages" }, { status: 500 });
  }
}
