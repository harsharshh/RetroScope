import { NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(request: Request) {
  const raw = await request.text();
  let socketId: string | undefined;
  let channelName: string | undefined;
  let userId: string | undefined;
  let userName: string | null | undefined;
  let userEmail: string | undefined;

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      socketId = typeof parsed.socket_id === "string" ? parsed.socket_id : undefined;
      channelName = typeof parsed.channel_name === "string" ? parsed.channel_name : undefined;
      userId = typeof parsed.user_id === "string" ? parsed.user_id : undefined;
      userName = typeof parsed.user_name === "string" ? parsed.user_name : null;
      userEmail = typeof parsed.user_email === "string" ? parsed.user_email : undefined;
    } catch {
      const params = new URLSearchParams(raw);
      socketId = params.get("socket_id") ?? undefined;
      channelName = params.get("channel_name") ?? undefined;
      userId = params.get("user_id") ?? undefined;
      userName = params.get("user_name");
      userEmail = params.get("user_email") ?? undefined;
    }
  }

  if (!socketId || !channelName || !userId) {
    return NextResponse.json({ error: "Missing authentication data" }, { status: 400 });
  }

  const pusher = getPusherServer();
  if (!pusher) {
    return NextResponse.json({ error: "Pusher is not configured" }, { status: 503 });
  }

  try {
    const authResponse = pusher.authenticate(socketId, channelName, {
      user_id: userId,
      user_info: {
        name: userName ?? undefined,
        email: userEmail ?? undefined,
      },
    });

    return NextResponse.json(authResponse);
  } catch (cause) {
    console.warn("Unable to authenticate Pusher presence", cause);
    return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 });
  }
}
