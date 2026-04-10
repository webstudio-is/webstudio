-- Add seatQuantity to UserProduct view.
-- Extracts Stripe subscription item quantity from the latest
-- customer.subscription.updated/created event in TransactionLog.
CREATE OR REPLACE VIEW "UserProduct" AS (
  SELECT
    tl."userId",
    tl."subscriptionId",
    tl."productId",
    tl."customerId",
    tl."customerEmail",
    seat_event."seatQuantity"
  FROM
    "TransactionLog" AS tl
    LEFT JOIN LATERAL (
      SELECT
        ("eventData" #>> '{data,object,items,data,0,quantity}')::INTEGER AS "seatQuantity"
      FROM
        "TransactionLog" AS tl_sub
      WHERE
        tl_sub."subscriptionId" = tl."subscriptionId"
        AND tl_sub."subscriptionId" IS NOT NULL
        AND tl_sub."eventType" IN (
          'customer.subscription.updated',
          'customer.subscription.created'
        )
      ORDER BY
        tl_sub."eventCreated" DESC
      LIMIT 1
    ) seat_event ON TRUE
  WHERE
    tl."status" = 'complete'
    AND tl."eventType" = 'checkout.session.completed'
    AND NOT EXISTS (
      SELECT 1
      FROM "TransactionLog" AS tlexists
      WHERE
        tlexists."subscriptionId" = tl."subscriptionId"
        AND tlexists."eventType" = 'customer.subscription.deleted'
        AND tlexists."status" = 'canceled'
        AND tlexists."eventCreated" > tl."eventCreated"
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "TransactionLog" AS tlexists
      WHERE
        tlexists."paymentIntent" = tl."paymentIntent"
        AND tlexists."eventType" = 'charge.refunded'
        AND tlexists."status" = 'succeeded'
        AND tlexists."eventCreated" > tl."eventCreated"
    )
  ORDER BY
    tl."userId",
    tl."eventCreated" DESC
)
UNION ALL (
  SELECT
    "userId",
    "subscriptionId",
    "productId",
    "customerId",
    "customerEmail",
    NULL::INTEGER AS "seatQuantity"
  FROM "TransactionLog"
  WHERE "eventType" = 'appsumo.activate'
);
