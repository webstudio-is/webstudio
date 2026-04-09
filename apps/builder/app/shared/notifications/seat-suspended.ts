export const SEAT_SUSPENDED_TOAST_ID = "seat-suspended";

export const getSeatSuspendedMessage = (workspaceName: string) =>
  `Your editing access to "${workspaceName}" has been paused because the owner's plan doesn't include enough seats. Please reach out to the workspace owner to upgrade their plan or add more seats.`;
