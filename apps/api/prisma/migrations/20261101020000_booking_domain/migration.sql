-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_DP', 'DP_PAID', 'PAID_IN_FULL', 'EXPIRED', 'CANCELLED', 'COMPLETED', 'REFUND_PENDING', 'REFUNDED');

-- AlterTable
ALTER TABLE "TripSchedule" ADD COLUMN     "heldSeats" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "soldSeats" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "bookerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "contactVerificationHash" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_DP',
    "participantCount" INTEGER NOT NULL,
    "unitPriceIdr" INTEGER NOT NULL,
    "totalPriceIdr" INTEGER NOT NULL,
    "amountDueIdr" INTEGER NOT NULL,
    "holdExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_code_key" ON "Booking"("code");

-- CreateIndex
CREATE INDEX "Booking_scheduleId_status_holdExpiresAt_idx" ON "Booking"("scheduleId", "status", "holdExpiresAt");

-- CreateIndex
CREATE INDEX "Booking_email_createdAt_idx" ON "Booking"("email", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TripSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain invariants must also hold for non-HTTP database writes.
ALTER TABLE "TripSchedule" ADD CONSTRAINT "TripSchedule_capacity_check" CHECK ("capacity" > 0);
ALTER TABLE "TripSchedule" ADD CONSTRAINT "TripSchedule_priceIdr_check" CHECK ("priceIdr" >= 0);
ALTER TABLE "TripSchedule" ADD CONSTRAINT "TripSchedule_minimumPax_check" CHECK ("minimumPax" > 0);
ALTER TABLE "TripSchedule" ADD CONSTRAINT "TripSchedule_seats_check" CHECK ("heldSeats" >= 0 AND "soldSeats" >= 0 AND "heldSeats" + "soldSeats" <= "capacity");
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_durationDays_check" CHECK ("durationDays" > 0);
ALTER TABLE "TripDestination" ADD CONSTRAINT "TripDestination_position_check" CHECK ("position" >= 0);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_participantCount_check" CHECK ("participantCount" > 0);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_amounts_check" CHECK ("unitPriceIdr" >= 0 AND "totalPriceIdr" >= 0 AND "amountDueIdr" >= 0);
