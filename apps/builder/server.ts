import type { PartyKitRoom, PartyKitServer } from "partykit/server";
import type { Change } from "immerhin";

const broadcast = (
  sourceSocker: WebSocket,
  room: PartyKitRoom,
  message: string
) => {
  for (const connection of room.connections.values()) {
    if (connection.socket !== sourceSocker) {
      connection.socket.send(message);
    }
  }
};

const loadInitialChanges = async (_projectId: string) => {
  const changes: Change[] = [];
  return changes;
};

export default {
  async onConnect(socket, room) {
    const projectId = room.id;
    let initialChanges = await loadInitialChanges(projectId);
    socket.send(JSON.stringify(initialChanges));
    socket.addEventListener("message", async (event) => {
      const newChanges: Change[] = JSON.parse(event.data);
      initialChanges = [...initialChanges, ...newChanges];
      broadcast(socket, room, event.data);
    });
  },
} satisfies PartyKitServer;
