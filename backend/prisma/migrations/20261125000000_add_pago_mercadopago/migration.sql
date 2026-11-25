-- Pasarela de pago: el pedido puede cerrarse por WhatsApp (por defecto) o pagarse con Mercado Pago.

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "metodoPago" TEXT NOT NULL DEFAULT 'whatsapp',
ADD COLUMN     "estadoPago" TEXT NOT NULL DEFAULT 'pendiente',
ADD COLUMN     "mpPreferenciaId" TEXT,
ADD COLUMN     "mpPagoId" TEXT;
