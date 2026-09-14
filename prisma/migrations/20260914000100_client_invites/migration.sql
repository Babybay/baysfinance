ALTER TABLE "users"
ADD COLUMN "inviteTokenHash" TEXT,
ADD COLUMN "inviteExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_inviteTokenHash_key" ON "users"("inviteTokenHash");
