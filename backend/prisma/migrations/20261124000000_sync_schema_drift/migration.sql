-- Sincroniza las migraciones con schema.prisma.
-- Estos cambios se aplicaron antes con `prisma db push` (Neon) y nunca quedaron
-- versionados, por lo que una base nueva (Docker local) no los tenía.
-- Es idempotente (IF NOT EXISTS) para poder aplicarse también sobre Neon,
-- donde estas columnas/tablas probablemente ya existen.

-- AlterTable
ALTER TABLE "ItemPedido" ADD COLUMN IF NOT EXISTS "color" TEXT;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "coleccion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "color" TEXT,
ADD COLUMN IF NOT EXISTS "colores" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "nuevosingresos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "sale" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_usuarioId_fkey'
    ) THEN
        ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
