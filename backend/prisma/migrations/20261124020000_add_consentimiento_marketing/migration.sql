-- Consentimiento de marketing (Brevo). Idempotente.

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "aceptaMarketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "consentimientoEn" TIMESTAMP(3);
