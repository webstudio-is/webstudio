-- Notifications table for workspace invites, project transfers, etc.
-- Generic and extensible — new types added via the `type` column without schema changes.

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "respondedAt" TIMESTAMPTZ(3),

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_recipientId_status_idx"
  ON "Notification"("recipientId", "status");
