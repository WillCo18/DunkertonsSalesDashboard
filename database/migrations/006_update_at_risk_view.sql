-- Update at-risk customer view with 5-month window and severity levels
CREATE OR REPLACE VIEW v_at_risk_customers AS
WITH recent_month AS (
  SELECT MAX(report_month) AS max_month FROM fact_shipments
),
customer_last_order AS (
  SELECT
    del_account,
    MAX(report_month) AS last_order_month,
    SUM(quantity) AS total_units_all_time
  FROM fact_shipments
  GROUP BY del_account
)
SELECT
  c.del_account,
  c.customer_name,
  c.delivery_city,
  c.delivery_postcode,
  clo.last_order_month,
  rm.max_month AS current_month,
  EXTRACT(MONTH FROM AGE(rm.max_month, clo.last_order_month))::INTEGER AS months_since_last_order,
  clo.total_units_all_time,
  -- Severity: 1-2 months = warning, 3-4 months = at-risk, 5+ months = critical
  CASE 
    WHEN EXTRACT(MONTH FROM AGE(rm.max_month, clo.last_order_month))::INTEGER >= 5 THEN 'critical'
    WHEN EXTRACT(MONTH FROM AGE(rm.max_month, clo.last_order_month))::INTEGER >= 3 THEN 'at-risk'
    ELSE 'warning'
  END AS risk_level
FROM dim_customer c
JOIN customer_last_order clo ON c.del_account = clo.del_account
CROSS JOIN recent_month rm
WHERE clo.last_order_month < rm.max_month  -- Did NOT buy most recent month
  AND clo.last_order_month >= rm.max_month - INTERVAL '5 months'  -- But DID buy within last 5 months
ORDER BY months_since_last_order DESC, clo.total_units_all_time DESC;
