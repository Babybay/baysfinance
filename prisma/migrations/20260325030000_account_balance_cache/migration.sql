-- Materialized account balance cache.
-- Updated transactionally when journal entries are posted.
CREATE TABLE account_balances (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debitTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "creditTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    balance DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT account_balances_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX account_balances_client_account_key ON account_balances ("clientId", "accountId");
CREATE INDEX idx_account_balances_client ON account_balances ("clientId");

-- Seed balances from existing posted journal entries
INSERT INTO account_balances (id, "clientId", "accountId", "debitTotal", "creditTotal", balance, "updatedAt")
SELECT
    gen_random_uuid()::text,
    je."clientId",
    ji."accountId",
    COALESCE(SUM(ji.debit), 0),
    COALESCE(SUM(ji.credit), 0),
    COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0),
    NOW()
FROM journal_items ji
JOIN journal_entries je ON je.id = ji."journalEntryId"
WHERE je.status = 'Posted' AND je."deletedAt" IS NULL
GROUP BY je."clientId", ji."accountId";
