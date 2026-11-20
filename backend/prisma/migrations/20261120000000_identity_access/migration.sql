BEGIN;

CREATE TYPE "IdentityRole" AS ENUM ('VOLUNTEER', 'COORDINATOR', 'ADMIN');
CREATE TYPE "IdentityChallengePurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD', 'ACTIVATE_STAFF');
CREATE TYPE "IdentityMailState" AS ENUM ('PENDING', 'SENT', 'EXPIRED', 'REVIEW');
CREATE TYPE "IdentityLoginKind" AS ENUM ('ACCOUNT', 'IP');

CREATE TABLE "IdentityAccount" (
    "id" UUID NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL CHECK ("email" = lower("email")),
    "passwordHash" TEXT,
    "role" "IdentityRole" NOT NULL,
    "locale" TEXT NOT NULL CHECK ("locale" IN ('ro', 'en')),
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "activatedAt" TIMESTAMPTZ(3),
    "disabledAt" TIMESTAMPTZ(3),
    "approvedAt" TIMESTAMPTZ(3),
    "canApprove" BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (NOT "canApprove" OR "role" = 'COORDINATOR')
);
CREATE UNIQUE INDEX "IdentityAccount_email_key" ON "IdentityAccount"("email");
CREATE INDEX "IdentityAccount_organizationId_role_idx" ON "IdentityAccount"("organizationId", "role");

CREATE TABLE "IdentityProfile" (
    "accountId" UUID NOT NULL PRIMARY KEY,
    "firstName" TEXT,
    "lastName" TEXT,
    "birthDate" DATE,
    "phone" TEXT,
    "locality" TEXT,
    CONSTRAINT "IdentityProfile_accountId_fkey" FOREIGN KEY ("accountId")
        REFERENCES "IdentityAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "IdentitySession" (
    "digest" TEXT NOT NULL PRIMARY KEY,
    "accountId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "IdentitySession_accountId_fkey" FOREIGN KEY ("accountId")
        REFERENCES "IdentityAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "IdentitySession_accountId_idx" ON "IdentitySession"("accountId");

CREATE TABLE "IdentityChallenge" (
    "id" UUID NOT NULL PRIMARY KEY,
    "accountId" UUID NOT NULL,
    "purpose" "IdentityChallengePurpose" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    CONSTRAINT "IdentityChallenge_accountId_fkey" FOREIGN KEY ("accountId")
        REFERENCES "IdentityAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "IdentityChallenge_accountId_purpose_expiresAt_idx"
    ON "IdentityChallenge"("accountId", "purpose", "expiresAt");

CREATE TABLE "IdentityMailJob" (
    "id" UUID NOT NULL PRIMARY KEY,
    "state" "IdentityMailState" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(3) NOT NULL,
    "leaseUntil" TIMESTAMPTZ(3),
    CONSTRAINT "IdentityMailJob_id_fkey" FOREIGN KEY ("id")
        REFERENCES "IdentityChallenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "IdentityMailJob_state_availableAt_idx" ON "IdentityMailJob"("state", "availableAt");

CREATE TABLE "IdentityLoginBucket" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "kind" "IdentityLoginKind" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "blockedUntil" TIMESTAMPTZ(3)
);
CREATE INDEX "IdentityLoginBucket_expiresAt_idx" ON "IdentityLoginBucket"("expiresAt");

CREATE TABLE "IdentityAudit" (
    "id" UUID NOT NULL PRIMARY KEY,
    "actorId" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "IdentityAudit_targetId_occurredAt_idx" ON "IdentityAudit"("targetId", "occurredAt");

GRANT SELECT, INSERT, UPDATE ON "IdentityAccount", "IdentityProfile", "IdentityChallenge", "IdentityMailJob"
    TO voluntrack_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "IdentitySession", "IdentityLoginBucket"
    TO voluntrack_app;
GRANT INSERT ON "IdentityAudit" TO voluntrack_app;

COMMIT;
