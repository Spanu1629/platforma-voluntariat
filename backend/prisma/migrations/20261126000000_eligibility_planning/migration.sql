BEGIN;

-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('GENERAL', 'SPECIALIZED');

-- CreateEnum
CREATE TYPE "TrainingAction" AS ENUM ('CONFIRMED', 'RENEWAL_REQUESTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "IdentityVerificationResult" AS ENUM ('VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EligibilityReviewReason" AS ENUM ('IDENTITY_INVALIDATED', 'TRAINING_CANCELED', 'SHIFT_DATE_CHANGED', 'POSITION_TASKS_CHANGED', 'SUPERVISION_WITHDRAWN');

-- CreateTable
CREATE TABLE "PlanningEvent" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "publishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PlanningEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningCoordinator" (
    "eventId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PlanningCoordinator_pkey" PRIMARY KEY ("eventId","accountId")
);

-- CreateTable
CREATE TABLE "PlanningLocation" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,

    CONSTRAINT "PlanningLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningShift" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "locationId" UUID,
    "startsAt" TIMESTAMPTZ(3),
    "endsAt" TIMESTAMPTZ(3),

    CONSTRAINT "PlanningShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningBreak" (
    "id" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PlanningBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningRole" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minimumAge" INTEGER NOT NULL,
    "specializedTraining" BOOLEAN NOT NULL,
    "supervisionForMinors" BOOLEAN NOT NULL,

    CONSTRAINT "PlanningRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningPosition" (
    "id" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "roleId" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "tasks" TEXT,
    "adequacyConfirmedAt" TIMESTAMPTZ(3),
    "adequacyConfirmedBy" UUID,
    "supervisionConfirmedAt" TIMESTAMPTZ(3),
    "supervisionConfirmedBy" UUID,

    CONSTRAINT "PlanningPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningPolicy" (
    "organizationId" TEXT NOT NULL,
    "breakThresholdMinutes" INTEGER NOT NULL,
    "minimumBreakMinutes" INTEGER NOT NULL,

    CONSTRAINT "PlanningPolicy_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "PlanningAudit" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanningAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerAvailability" (
    "accountId" UUID NOT NULL,
    "weekly" JSONB NOT NULL,
    "exceptions" JSONB NOT NULL,

    CONSTRAINT "VolunteerAvailability_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "TrainingPermission" (
    "accountId" UUID NOT NULL,

    CONSTRAINT "TrainingPermission_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "TrainingRecord" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "type" "TrainingType" NOT NULL,
    "domain" TEXT NOT NULL,
    "trainer" TEXT NOT NULL,
    "completedOn" DATE NOT NULL,
    "confirmedBy" UUID NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3) NOT NULL,
    "canceledAt" TIMESTAMPTZ(3),
    "renewalRequestedAt" TIMESTAMPTZ(3),
    "supersededById" UUID,

    CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRole" (
    "recordId" UUID NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "TrainingRole_pkey" PRIMARY KEY ("recordId","roleId")
);

-- CreateTable
CREATE TABLE "TrainingOperation" (
    "id" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" "TrainingAction" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "TrainingOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerIdentityVerification" (
    "accountId" UUID NOT NULL,
    "result" "IdentityVerificationResult" NOT NULL,
    "verifiedAt" TIMESTAMPTZ(3) NOT NULL,
    "verifierId" UUID NOT NULL,
    "invalidatedAt" TIMESTAMPTZ(3),

    CONSTRAINT "VolunteerIdentityVerification_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "EligibilityReview" (
    "id" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "reason" "EligibilityReviewReason" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EligibilityReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanningEvent_organizationId_publishedAt_idx" ON "PlanningEvent"("organizationId", "publishedAt");

-- CreateIndex
CREATE INDEX "PlanningCoordinator_accountId_revokedAt_idx" ON "PlanningCoordinator"("accountId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningLocation_eventId_id_key" ON "PlanningLocation"("eventId", "id");

-- CreateIndex
CREATE INDEX "PlanningShift_eventId_startsAt_idx" ON "PlanningShift"("eventId", "startsAt");

-- CreateIndex
CREATE INDEX "PlanningBreak_shiftId_startsAt_idx" ON "PlanningBreak"("shiftId", "startsAt");

-- CreateIndex
CREATE INDEX "PlanningRole_organizationId_idx" ON "PlanningRole"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningPosition_shiftId_roleId_key" ON "PlanningPosition"("shiftId", "roleId");

-- CreateIndex
CREATE INDEX "PlanningAudit_eventId_occurredAt_idx" ON "PlanningAudit"("eventId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingRecord_supersededById_key" ON "TrainingRecord"("supersededById");

-- CreateIndex
CREATE INDEX "TrainingRecord_accountId_canceledAt_idx" ON "TrainingRecord"("accountId", "canceledAt");

-- CreateIndex
CREATE INDEX "TrainingOperation_recordId_occurredAt_idx" ON "TrainingOperation"("recordId", "occurredAt");

-- CreateIndex
CREATE INDEX "EligibilityReview_createdAt_idx" ON "EligibilityReview"("createdAt");

-- CreateIndex
CREATE INDEX "EligibilityReview_subjectId_idx" ON "EligibilityReview"("subjectId");

-- AddForeignKey
ALTER TABLE "PlanningCoordinator" ADD CONSTRAINT "PlanningCoordinator_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PlanningEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningCoordinator" ADD CONSTRAINT "PlanningCoordinator_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "IdentityAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningLocation" ADD CONSTRAINT "PlanningLocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PlanningEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningShift" ADD CONSTRAINT "PlanningShift_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PlanningEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningShift" ADD CONSTRAINT "PlanningShift_eventId_locationId_fkey" FOREIGN KEY ("eventId", "locationId") REFERENCES "PlanningLocation"("eventId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningBreak" ADD CONSTRAINT "PlanningBreak_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "PlanningShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningPosition" ADD CONSTRAINT "PlanningPosition_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "PlanningShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningPosition" ADD CONSTRAINT "PlanningPosition_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PlanningRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerAvailability" ADD CONSTRAINT "VolunteerAvailability_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "IdentityAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPermission" ADD CONSTRAINT "TrainingPermission_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "IdentityAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "IdentityAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "TrainingRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRole" ADD CONSTRAINT "TrainingRole_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TrainingRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRole" ADD CONSTRAINT "TrainingRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PlanningRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingOperation" ADD CONSTRAINT "TrainingOperation_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TrainingRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerIdentityVerification" ADD CONSTRAINT "VolunteerIdentityVerification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "IdentityAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlanningPolicy"
    ADD CONSTRAINT "PlanningPolicy_positive_minutes"
    CHECK ("breakThresholdMinutes" > 0 AND "minimumBreakMinutes" > 0);

ALTER TABLE "PlanningRole"
    ADD CONSTRAINT "PlanningRole_minimum_age" CHECK ("minimumAge" >= 15);

ALTER TABLE "PlanningShift"
    ADD CONSTRAINT "PlanningShift_ordered" CHECK ("startsAt" < "endsAt");

ALTER TABLE "PlanningBreak"
    ADD CONSTRAINT "PlanningBreak_ordered" CHECK ("startsAt" < "endsAt");

ALTER TABLE "PlanningPosition"
    ADD CONSTRAINT "PlanningPosition_nonnegative_capacity" CHECK ("capacity" >= 0),
    ADD CONSTRAINT "PlanningPosition_adequacy_pair"
        CHECK (("adequacyConfirmedAt" IS NULL) = ("adequacyConfirmedBy" IS NULL)),
    ADD CONSTRAINT "PlanningPosition_supervision_pair"
        CHECK (("supervisionConfirmedAt" IS NULL) = ("supervisionConfirmedBy" IS NULL));

ALTER TABLE "VolunteerAvailability"
    ADD CONSTRAINT "VolunteerAvailability_interval_arrays"
    CHECK (jsonb_typeof(weekly) = 'array' AND jsonb_typeof(exceptions) = 'array');

ALTER TABLE "TrainingOperation"
    ADD CONSTRAINT "TrainingOperation_cancellation_reason"
    CHECK (action <> 'CANCELED' OR (reason IS NOT NULL AND length(btrim(reason)) > 0));

INSERT INTO "PlanningPolicy" ("organizationId", "breakThresholdMinutes", "minimumBreakMinutes")
VALUES ('voluntrack', 240, 30);

INSERT INTO "PlanningRole" (
    id, "organizationId", name, "minimumAge", "specializedTraining", "supervisionForMinors"
) VALUES
    ('general-coordination', 'voluntrack', 'Coordonare generală și logistică', 18, true, false),
    ('ticket-checking', 'voluntrack', 'Primire participanți și verificare bilete', 16, false, false),
    ('train-access', 'voluntrack', 'Coordonare acces trenuleț', 18, true, false),
    ('creative-workshops', 'voluntrack', 'Ateliere și activități creative', 15, true, true),
    ('artistic-support', 'voluntrack', 'Sprijin program artistic și animatori', 15, false, true),
    ('charity-promotion', 'voluntrack', 'Informare și promovare caritabilă', 16, false, false),
    ('materials-distribution', 'voluntrack', 'Distribuire materiale și cadouri', 15, false, true),
    ('logistics-support', 'voluntrack', 'Amenajare, ordine și suport logistic', 16, true, false);

GRANT SELECT, INSERT, UPDATE ON
    "PlanningEvent", "PlanningCoordinator", "PlanningLocation", "PlanningShift",
    "PlanningPosition", "VolunteerAvailability", "TrainingRecord" TO voluntrack_app;
GRANT SELECT ON "PlanningRole", "PlanningPolicy", "VolunteerIdentityVerification" TO voluntrack_app;
GRANT UPDATE ("invalidatedAt") ON "VolunteerIdentityVerification" TO voluntrack_app;
GRANT SELECT, INSERT ON "TrainingRole" TO voluntrack_app;
GRANT SELECT, INSERT, DELETE ON "PlanningBreak", "TrainingPermission" TO voluntrack_app;
GRANT INSERT ON "PlanningAudit", "TrainingOperation", "EligibilityReview" TO voluntrack_app;

COMMIT;
