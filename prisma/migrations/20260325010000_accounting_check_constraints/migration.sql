-- Ensure debit and credit are never both positive on the same line item.
-- This enforces double-entry bookkeeping at the database level.
ALTER TABLE journal_items
  ADD CONSTRAINT check_debit_credit_exclusive
    CHECK (NOT (debit > 0 AND credit > 0));

-- Ensure debit and credit are never negative.
ALTER TABLE journal_items
  ADD CONSTRAINT check_non_negative_amounts
    CHECK (debit >= 0 AND credit >= 0);
