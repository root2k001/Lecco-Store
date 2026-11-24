-- AlterTable: hacer usuarioId opcional en Pedido para permitir guest checkout
ALTER TABLE "Pedido" ALTER COLUMN "usuarioId" DROP NOT NULL;
