
ALTER TABLE "AuthorizationToken" ADD COLUMN "canPublish" boolean NOT NULL DEFAULT false;

UPDATE "AuthorizationToken"
SET "canPublish" =
CASE
    WHEN "relation" IN ('viewers', 'builders') THEN FALSE
    ELSE TRUE
END;
