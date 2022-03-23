import { createValueContainer } from "react-nano-state";
export const statusContainer = createValueContainer<"syncing" | "idle">("idle");
