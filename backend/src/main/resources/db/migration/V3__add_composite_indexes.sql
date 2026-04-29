-- V3 — composite indexes for user-scoped recent-activity queries.
--
-- Without these, every "show this user's transactions" query is a sequential
-- scan + sort. The composite (user_id, <date> DESC) lets Postgres satisfy the
-- whole query — filter AND ordering — from the index alone. On the dashboard
-- (which fetches the most-recent-N for the logged-in user on every page
-- load), this turns an O(rows-in-table) scan into an O(rows-for-this-user)
-- index lookup, and the index already returns rows in the order we want so
-- the planner can skip the sort step entirely.
--
-- Notes:
--   * Postgres does NOT auto-create indexes on foreign key columns. The
--     existing fk_transactions_user / fk_insights_user constraints provide
--     referential integrity but no read-side speedup.
--   * The composite index also satisfies queries that filter on user_id
--     alone (Postgres can use the leading column), so we don't need a
--     separate (user_id) index.

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
    ON transactions (user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_insights_user_created
    ON insights (user_id, created_at DESC);

-- Budgets: low cardinality (~12 categories per user) so a simple per-user
-- index is plenty. Skip the composite — there's nothing meaningful to sort by.
CREATE INDEX IF NOT EXISTS idx_budgets_user
    ON budgets (user_id);
