BEGIN;

CREATE TABLE "HistoricalEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timeZone" TEXT NOT NULL,
    "volunteerCount" INTEGER NOT NULL CHECK ("volunteerCount" >= 0),

    CONSTRAINT "HistoricalEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistoricalRoleTotal" (
    "eventId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "volunteerCount" INTEGER NOT NULL CHECK ("volunteerCount" >= 0),

    CONSTRAINT "HistoricalRoleTotal_pkey" PRIMARY KEY ("eventId", "role"),
    CONSTRAINT "HistoricalRoleTotal_eventId_fkey" FOREIGN KEY ("eventId")
        REFERENCES "HistoricalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "HistoricalInterval" (
    "eventId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL CHECK ("ordinal" > 0),
    "startsAt" TIMESTAMPTZ(0) NOT NULL,
    "endsAt" TIMESTAMPTZ(0) NOT NULL CHECK ("endsAt" > "startsAt"),

    CONSTRAINT "HistoricalInterval_pkey" PRIMARY KEY ("eventId", "ordinal"),
    CONSTRAINT "HistoricalInterval_eventId_fkey" FOREIGN KEY ("eventId")
        REFERENCES "HistoricalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

GRANT SELECT ON TABLE "HistoricalEvent", "HistoricalRoleTotal", "HistoricalInterval"
    TO voluntrack_app;

COMMIT;
