DROP VIEW "UserProduct";

ALTER TABLE "public"."TransactionLog" ALTER COLUMN "productId" DROP NOT NULL;

ALTER TABLE "TransactionLog" DROP CONSTRAINT "TransactionLog_productId_fkey";

-- AddForeignKey
ALTER TABLE "TransactionLog" ADD CONSTRAINT "TransactionLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "TransactionLog"
DROP COLUMN "eventCreated",
DROP COLUMN "eventType",
DROP COLUMN "status",
DROP COLUMN "customerEmail",
DROP COLUMN "subscriptionId",
DROP COLUMN "customerId",
DROP COLUMN "sessionId";

ALTER TABLE "TransactionLog"
ADD COLUMN     "eventData" JSONB,
ADD COLUMN     "eventCreated" INT GENERATED ALWAYS AS (("eventData"#>>'{created}')::INTEGER) STORED,
ADD COLUMN     "eventType" TEXT GENERATED ALWAYS AS ("eventData"#>>'{type}') STORED,
ADD COLUMN     "status" TEXT GENERATED ALWAYS AS ("eventData"#>>'{data,object,status}') STORED,
ADD COLUMN     "customerId" TEXT GENERATED ALWAYS AS ("eventData"#>>'{data,object,customer}') STORED,
ADD COLUMN     "customerEmail" TEXT GENERATED ALWAYS AS ("eventData"#>>'{data,object,customer_details,email}') STORED,
ADD COLUMN     "subscriptionId" TEXT GENERATED ALWAYS AS (
  CASE
    WHEN "eventData"#>>'{data,object,object}' = 'subscription'
    THEN "eventData"#>>'{data,object,id}'
    ELSE "eventData"#>>'{data,object,subscription}'
  END
) STORED,
ADD COLUMN     "paymentIntent" TEXT GENERATED ALWAYS AS ("eventData"#>>'{data,object,payment_intent}') STORED;


CREATE VIEW "UserProduct" AS
SELECT "userId", "subscriptionId", "productId", "customerId", "customerEmail"
FROM "TransactionLog" AS tl
WHERE "status" = 'complete' AND "eventType" = 'checkout.session.completed'
  AND NOT EXISTS (
    SELECT 1
    FROM "TransactionLog" AS tlexsists
    WHERE tlexsists."subscriptionId" = tl."subscriptionId"
      AND tlexsists."eventType" = 'customer.subscription.deleted'
      AND tlexsists."status" = 'canceled'
      AND tlexsists."eventCreated" > tl."eventCreated"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "TransactionLog" AS tlexsists
    WHERE tlexsists."paymentIntent" = tl."paymentIntent"
      AND tlexsists."eventType" = 'charge.refunded'
      AND tlexsists."status" = 'succeeded'
      AND tlexsists."eventCreated" > tl."eventCreated"
  )
ORDER BY "userId", "eventCreated" DESC;

