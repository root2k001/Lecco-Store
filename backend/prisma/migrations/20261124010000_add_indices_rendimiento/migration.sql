-- Índices de rendimiento para el catálogo, pedidos e historial.
-- IF NOT EXISTS para que sea seguro de re-ejecutar.

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HistorialCambios_creadoEn_idx" ON "HistorialCambios"("creadoEn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ItemPedido_pedidoId_idx" ON "ItemPedido"("pedidoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ItemPedido_productoId_idx" ON "ItemPedido"("productoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Pedido_usuarioId_creadoEn_idx" ON "Pedido"("usuarioId", "creadoEn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Pedido_creadoEn_idx" ON "Pedido"("creadoEn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Producto_sale_creadoEn_idx" ON "Producto"("sale", "creadoEn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Producto_coleccion_creadoEn_idx" ON "Producto"("coleccion", "creadoEn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Producto_nuevosingresos_creadoEn_idx" ON "Producto"("nuevosingresos", "creadoEn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Producto_creadoEn_idx" ON "Producto"("creadoEn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RefreshToken_usuarioId_idx" ON "RefreshToken"("usuarioId");
