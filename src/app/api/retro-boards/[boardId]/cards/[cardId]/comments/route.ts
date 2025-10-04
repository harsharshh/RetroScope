import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type CommentBody = {
  body?: string;
  authorId?: string;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  const { cardId } = await params;

  try {
    const comments = await prisma.retroComment.findMany({
      where: { cardId },
      include: { author: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(comments);
  } catch (error) {
    console.error(`GET comments for card ${cardId} failed`, error);
    return NextResponse.json({ error: "Unable to fetch comments" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  const { cardId } = await params;
  let body: CommentBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.body || !body.authorId) {
    return NextResponse.json({ error: "body and authorId are required" }, { status: 422 });
  }

  try {
    const comment = await prisma.retroComment.create({
      data: {
        body: body.body,
        cardId,
        authorId: body.authorId,
      },
      include: { author: true },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error(`POST comment for card ${cardId} failed`, error);
    return NextResponse.json({ error: "Unable to create comment" }, { status: 500 });
  }
}
