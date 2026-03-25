-- AlterTable
ALTER TABLE "account_balances" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "account_balances_client_account_key" RENAME TO "account_balances_clientId_accountId_key";

-- RenameIndex
ALTER INDEX "idx_account_balances_client" RENAME TO "account_balances_clientId_idx";

-- RenameIndex
ALTER INDEX "idx_audit_logs_client_created" RENAME TO "audit_logs_clientId_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_audit_logs_model_record" RENAME TO "audit_logs_model_recordId_idx";

-- RenameIndex
ALTER INDEX "idx_audit_logs_user_created" RENAME TO "audit_logs_userId_createdAt_idx";
