import type { Project } from "@webstudio-is/project";
import type { Build } from "@webstudio-is/project-build";
import type { Change } from "immerhin";
import type { Transaction } from "@webstudio-is/sync-client";

type Command =
  | {
      type: "transactions";
      projectId: Project["id"];
      transactions: Transaction<Change[]>[];
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

  // Merge only with the immediate tail command. Looking farther back can move
  // transactions across another project's pending command and change save order.
  const projectCommand = projectCommandsQueue.at(-1);
  if (
    projectCommand?.type === "transactions" &&
    projectCommand.projectId === command.projectId
  ) {
    projectCommand.transactions.push(...command.transactions);
    return;
  }

  projectCommandsQueue.push(command);
};

export const dequeueAll = () => {
  const commands = [...projectCommandsQueue];
  projectCommandsQueue.length = 0;
  return commands;
};
