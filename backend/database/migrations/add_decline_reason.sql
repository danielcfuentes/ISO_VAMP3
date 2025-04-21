-- Add declineReason column to ExceptionRequest table
ALTER TABLE "ExceptionRequest" ADD COLUMN IF NOT EXISTS "declineReason" TEXT; 