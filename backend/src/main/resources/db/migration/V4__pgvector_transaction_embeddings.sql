-- V4 — pgvector + transaction embeddings (Phase 3.2 RAG).
--
-- Stores a 768-dim Gemini text-embedding-004 vector per transaction so
-- chat questions can retrieve the most semantically relevant rows
-- ("groceries last week", "any flights this month") instead of always
-- dumping the most recent N.
--
-- IDEMPOTENT: CREATE EXTENSION IF NOT EXISTS, CREATE TABLE IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS — safe on a baselined production schema.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS transaction_embeddings (
    transaction_id BIGINT PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Sentence used to generate the embedding (kept for debugging /
    -- so we can re-embed without rebuilding the descriptor).
    content TEXT NOT NULL,
    -- 768 dimensions = Gemini text-embedding-004 output size.
    embedding vector(768) NOT NULL,
    embedded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Per-user filter is the hot lookup before similarity ranking.
CREATE INDEX IF NOT EXISTS idx_transaction_embeddings_user
    ON transaction_embeddings (user_id);

-- HNSW index for cosine-distance ANN search. m=16 / ef_construction=64
-- are pgvector's defaults — good enough for our scale (low thousands of
-- rows per user). vector_cosine_ops matches the <=> operator we'll use.
CREATE INDEX IF NOT EXISTS idx_transaction_embeddings_hnsw
    ON transaction_embeddings
    USING hnsw (embedding vector_cosine_ops);
