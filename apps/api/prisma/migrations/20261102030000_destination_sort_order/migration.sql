-- Add an operator-controlled ordering value without changing existing rows.
ALTER TABLE "Destination" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
