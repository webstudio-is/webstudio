import type { Project } from "@webstudio-is/project";
import type { Build } from "@webstudio-is/project-build";
import type { SyncItem } from "immerhin";

type Command =
  | {
      type: "transactions";
      projectId: Project["id"];
      transactions: SyncItem[];
    }
  | {
      type: "setDetails";
      projectId: Project["id"];
      version: number;
      buildId: Build["id"];
      authToken: string | undefined;
    };

const projectCommandsQueue: Command[] = [];

export const enqueue = (command: Command) => {
  if (command.type !== "transactions") {
    projectCommandsQueue.push(command);
    return;
  }

  // merge transactions in case of no commands in queue
  for (const projectCommand of projectCommandsQueue.reverse()) {
    if (projectCommand.type !== "transactions") {
      break;
    }

    if (projectCommand.projectId === command.projectId) {
      projectCommand.transactions.push(...command.transactions);
      return;
    }
  }

  projectCommandsQueue.push(command);
};

export const dequeueAll = () => {
  const commands = [...projectCommandsQueue];
  projectCommandsQueue.length = 0;
  return commands;
};
