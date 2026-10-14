import emailAddresses from "email-addresses";
import { z } from "zod";

export type EmailMailbox = { name?: string; address: string };

/** Parse only individual mailboxes, preserving display names and duplicates. */
export const parseEmailMailboxes = (
  value: string
): EmailMailbox[] | undefined => {
  if (value.trim() === "") {
    return [];
  }
  // Header fields must never contain line breaks or other control characters.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return;
  }
  const parsed = emailAddresses.parseAddressList({
    input: value,
    strict: true,
  });
  if (
    parsed === null ||
    parsed.some(
      (item) =>
        item.type !== "mailbox" ||
        z.email().safeParse(item.address).success === false
    )
  ) {
    return;
  }
  return parsed.map((item) => {
    if (item.type !== "mailbox") {
      throw new Error("Expected a mailbox");
    }
    return { address: item.address, ...(item.name ? { name: item.name } : {}) };
  });
};

export const parseEmailSender = (value: string): EmailMailbox | undefined => {
  const mailboxes = parseEmailMailboxes(value);
  return mailboxes?.length === 1 ? mailboxes[0] : undefined;
};
