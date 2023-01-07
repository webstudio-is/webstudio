import type { ActionArgs } from "@remix-run/node";
import { prisma } from "@webstudio-is/prisma-client";
import { Styles } from "@webstudio-is/react-sdk";
import { Messages, type StylesMessage } from "~/shared/stores";

const loadStylesByTreeId = async (treeId: string) => {
  const tree = await prisma.tree.findUnique({
    where: { id: treeId },
  });

  if (tree === null) {
    return [];
  }

  return Styles.parse(JSON.parse(tree.styles));
};

export const updateStyles = async (messages: StylesMessage[]) => {
  const stylesByTreeId = new Map<string, Styles>();

  for (const message of messages) {
    let styles = stylesByTreeId.get(message.treeId);
    if (styles === undefined) {
      styles = await loadStylesByTreeId(message.treeId);
      stylesByTreeId.set(message.treeId, styles);
    }

    const { breakpointId, instanceId, property } = message.data;
    const matchedIndex = styles.findIndex(
      (item) =>
        item.breakpointId === breakpointId &&
        item.instanceId === instanceId &&
        item.property === property
    );

    if (message.operation === "set") {
      if (matchedIndex === -1) {
        styles.push(message.data);
      } else {
        styles[matchedIndex] = message.data;
      }
    }

    if (message.operation === "delete") {
      styles.splice(matchedIndex, 1);
    }
  }

  for (const [treeId, styles] of stylesByTreeId) {
    await prisma.tree.update({
      data: {
        styles: JSON.stringify(styles),
      },
      where: { id: treeId },
    });
  }
};

export const action = async ({ request }: ActionArgs) => {
  const messages = Messages.parse(await request.json());

  const styleMessages: StylesMessage[] = [];

  for (const message of messages) {
    if (message.store === "styles") {
      styleMessages.push(message);
    }
  }

  if (styleMessages.length !== 0) {
    await updateStyles(styleMessages);
  }

  return { status: "ok" };
};
