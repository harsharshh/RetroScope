import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type CreateUserBody = {
  email: string;
  name?: string;
  avatarUrl?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") ?? undefined;

  try {
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      return NextResponse.json(user);
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/users failed", error);
    return NextResponse.json({ error: "Unable to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: CreateUserBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.email) {
    return NextResponse.json({ error: "Email is required" }, { status: 422 });
  }

  try {
    const user = await prisma.user.upsert({
      where: { email: body.email },
      update: {
        name: body.name,
        avatarUrl: body.avatarUrl,
      },
      create: {
        email: body.email,
        name: body.name,
        avatarUrl: body.avatarUrl,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("POST /api/users failed", error);
    return NextResponse.json({ error: "Unable to create user" }, { status: 500 });
  }
}
