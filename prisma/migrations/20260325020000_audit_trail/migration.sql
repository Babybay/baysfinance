-- Add audit fields to financial tables
ALTER TABLE journal_entries ADD COLUMN "createdBy" TEXT;
ALTER TABLE journal_entries ADD COLUMN "updatedByUser" TEXT;

ALTER TABLE invoices ADD COLUMN "createdBy" TEXT;
ALTER TABLE invoices ADD COLUMN "updatedByUser" TEXT;

ALTER TABLE payments ADD COLUMN "createdBy" TEXT;

-- Create audit log table
CREATE TABLE audit_logs (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    action TEXT NOT NULL,
    model TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "clientId" TEXT,
    before JSONB,
    after JSONB,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_audit_logs_model_record ON audit_logs (model, "recordId");
CREATE INDEX idx_audit_logs_user_created ON audit_logs ("userId", "createdAt");
CREATE INDEX idx_audit_logs_client_created ON audit_logs ("clientId", "createdAt");
