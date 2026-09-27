type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

// Global in-memory registry of active group listeners
const groupClients = new Map<string, Set<SSEClient>>();

export function addGroupClient(groupId: string, client: SSEClient) {
  if (!groupClients.has(groupId)) {
    groupClients.set(groupId, new Set());
  }
  groupClients.get(groupId)!.add(client);
}

export function removeGroupClient(groupId: string, client: SSEClient) {
  const clients = groupClients.get(groupId);
  if (clients) {
    clients.delete(client);
    if (clients.size === 0) {
      groupClients.delete(groupId);
    }
  }
}

export async function broadcastGroupUpdate(groupId: string, eventData: any) {
  // 1. Broadcast to in-memory Server-Sent Events subscribers (zero-config, works everywhere)
  const clients = groupClients.get(groupId);
  if (clients && clients.size > 0) {
    const payload = `data: ${JSON.stringify(eventData)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(payload);

    for (const client of clients) {
      try {
        client.controller.enqueue(encoded);
      } catch {
        // Client disconnected
        clients.delete(client);
      }
    }
  }

  // 2. Broadcast via Pusher if configured
  const pusherAppId = process.env.PUSHER_APP_ID;
  const pusherKey = process.env.PUSHER_KEY;
  const pusherSecret = process.env.PUSHER_SECRET;
  const pusherCluster = process.env.PUSHER_CLUSTER;

  if (pusherAppId && pusherKey && pusherSecret && pusherCluster) {
    try {
      const Pusher = (await import("pusher")).default;
      const pusher = new Pusher({
        appId: pusherAppId,
        key: pusherKey,
        secret: pusherSecret,
        cluster: pusherCluster,
        useTLS: true,
      });
      await pusher.trigger(`group-${groupId}`, "update", eventData);
    } catch (err) {
      console.warn("Pusher broadcast failed:", err);
    }
  }
}
