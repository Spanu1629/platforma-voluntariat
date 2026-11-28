BEGIN;

-- CreateEnum
CREATE TYPE "PlacementState" AS ENUM ('PROPOSED', 'QUEUED', 'SUSPENDED', 'OFFERED', 'CONFIRMED', 'DECLINED', 'EXPIRED', 'WITHDRAWN', 'CANCELED', 'REPLACED');

-- CreateEnum
CREATE TYPE "ParticipationJobKind" AS ENUM ('POSITION', 'EVENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EligibilityReviewReason" ADD VALUE 'AVAILABILITY_CHANGED';
ALTER TYPE "EligibilityReviewReason" ADD VALUE 'TRAINING_CHANGED';
ALTER TYPE "EligibilityReviewReason" ADD VALUE 'POSITION_REQUIREMENTS_RESTORED';

-- AlterTable
ALTER TABLE "PlanningShift" ADD COLUMN     "canceledAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "PlanningPolicy" ADD COLUMN     "offerDurationMinutes" INTEGER NOT NULL DEFAULT 720;

-- AlterTable
ALTER TABLE "EligibilityReview" ADD COLUMN     "processedAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "ParticipationRequest" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ParticipationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipationPlacement" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "proposedBy" UUID NOT NULL,
    "replacesId" UUID,
    "state" "PlacementState" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queueOrder" BIGINT,
    "expiresAt" TIMESTAMPTZ(3),
    "reviewIssues" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ParticipationPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipationJob" (
    "kind" "ParticipationJobKind" NOT NULL,
    "targetId" UUID NOT NULL,
    "dueAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ParticipationJob_pkey" PRIMARY KEY ("kind","targetId")
);

-- CreateTable
CREATE TABLE "ParticipationNotice" (
    "id" BIGSERIAL NOT NULL,
    "accountId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipationNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParticipationRequest_eventId_closedAt_idx" ON "ParticipationRequest"("eventId", "closedAt");

-- CreateIndex
CREATE INDEX "ParticipationRequest_accountId_closedAt_idx" ON "ParticipationRequest"("accountId", "closedAt");

-- CreateIndex
CREATE INDEX "ParticipationPlacement_positionId_state_queueOrder_idx" ON "ParticipationPlacement"("positionId", "state", "queueOrder");

-- CreateIndex
CREATE INDEX "ParticipationPlacement_requestId_state_idx" ON "ParticipationPlacement"("requestId", "state");

-- CreateIndex
CREATE INDEX "ParticipationJob_dueAt_idx" ON "ParticipationJob"("dueAt");

-- CreateIndex
CREATE INDEX "ParticipationNotice_accountId_id_idx" ON "ParticipationNotice"("accountId", "id");

-- CreateIndex
CREATE INDEX "EligibilityReview_processedAt_createdAt_idx" ON "EligibilityReview"("processedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "ParticipationRequest" ADD CONSTRAINT "ParticipationRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PlanningEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationRequest" ADD CONSTRAINT "ParticipationRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "IdentityAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationPlacement" ADD CONSTRAINT "ParticipationPlacement_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ParticipationRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationPlacement" ADD CONSTRAINT "ParticipationPlacement_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "PlanningPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationPlacement" ADD CONSTRAINT "ParticipationPlacement_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "ParticipationPlacement"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "PlanningAudit" ALTER COLUMN "actorId" DROP NOT NULL, ADD COLUMN "reason" TEXT;

CREATE UNIQUE INDEX "ParticipationRequest_one_open" ON "ParticipationRequest" ("eventId", "accountId") WHERE "closedAt" IS NULL;
CREATE UNIQUE INDEX "ParticipationPlacement_one_live" ON "ParticipationPlacement" ("requestId", "positionId")
    WHERE state IN ('PROPOSED', 'QUEUED', 'SUSPENDED', 'OFFERED', 'CONFIRMED');
CREATE UNIQUE INDEX "ParticipationPlacement_one_replacement" ON "ParticipationPlacement" ("replacesId")
    WHERE "replacesId" IS NOT NULL AND state IN ('PROPOSED', 'QUEUED', 'SUSPENDED', 'OFFERED');
CREATE SEQUENCE "ParticipationQueueOrder";
ALTER TABLE "PlanningPolicy" ADD CHECK ("offerDurationMinutes" > 0);
ALTER TABLE "ParticipationPlacement" ADD CHECK (
    (state NOT IN ('QUEUED', 'SUSPENDED', 'OFFERED') OR "queueOrder" IS NOT NULL) AND
    (state <> 'OFFERED' OR "expiresAt" IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE ON "ParticipationRequest", "ParticipationPlacement" TO voluntrack_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ParticipationJob" TO voluntrack_app;
GRANT SELECT, INSERT ON "ParticipationNotice" TO voluntrack_app;
GRANT USAGE ON SEQUENCE "ParticipationQueueOrder", "ParticipationNotice_id_seq" TO voluntrack_app;
GRANT SELECT ON "EligibilityReview" TO voluntrack_app;
GRANT UPDATE ("processedAt") ON "EligibilityReview" TO voluntrack_app;

COMMIT;
