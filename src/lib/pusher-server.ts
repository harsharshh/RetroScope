import Pusher from "pusher";

let cachedPusher: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (cachedPusher) return cachedPusher;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Pusher server environment variables are not fully configured.");
    }
    return null;
  }

  cachedPusher = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return cachedPusher;
}

export async function triggerBoardEvent(
  boardId: string,
  eventName: string,
  payload: unknown
): Promise<boolean> {
  const pusher = getPusherServer();
  if (!pusher) return false;

  try {
    await pusher.trigger(`presence-retro-board-${boardId}`, eventName, payload);
    return true;
  } catch (error) {
    console.warn("Unable to trigger Pusher event", { boardId, eventName, error });
    return false;
  }
}
