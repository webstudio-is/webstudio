CREATE OR REPLACE VIEW "UserProduct" AS (
  SELECT
    "userId",
    "subscriptionId",
    "productId",
    "customerId",
    "customerEmail"
  FROM
    "TransactionLog" AS tl
  WHERE
    "status" = 'complete'
    AND "eventType" = 'checkout.session.completed'
    AND NOT EXISTS (
      SELECT
        1
      FROM
        "TransactionLog" AS tlexsists
      WHERE
        tlexsists."subscriptionId" = tl."subscriptionId"
        AND tlexsists."eventType" = 'customer.subscription.deleted'
        AND tlexsists."status" = 'canceled'
        AND tlexsists."eventCreated" > tl."eventCreated")
      AND NOT EXISTS (
        SELECT
          1
        FROM
          "TransactionLog" AS tlexsists
        WHERE
          tlexsists."paymentIntent" = tl."paymentIntent"
          AND tlexsists."eventType" = 'charge.refunded'
          AND tlexsists."status" = 'succeeded'
          AND tlexsists."eventCreated" > tl."eventCreated")
      ORDER BY
        "userId",
        "eventCreated" DESC)
    UNION ALL (
      SELECT
        "userId",
        "subscriptionId",
        "productId",
        "customerId",
        "customerEmail"
      FROM
        "TransactionLog"
      WHERE
        "eventType" = 'appsumo.activate');

