-- Campañas de la tienda (Colección de Verano, etc.) y atribución de ventas por UTM.

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "origenCampana" TEXT;

-- CreateTable
CREATE TABLE "Campana" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "banner" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CampanaToProducto" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Campana_slug_key" ON "Campana"("slug");

-- CreateIndex
CREATE INDEX "Campana_activa_inicio_fin_idx" ON "Campana"("activa", "inicio", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "_CampanaToProducto_AB_unique" ON "_CampanaToProducto"("A", "B");

-- CreateIndex
CREATE INDEX "_CampanaToProducto_B_index" ON "_CampanaToProducto"("B");

-- AddForeignKey
ALTER TABLE "_CampanaToProducto" ADD CONSTRAINT "_CampanaToProducto_A_fkey" FOREIGN KEY ("A") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampanaToProducto" ADD CONSTRAINT "_CampanaToProducto_B_fkey" FOREIGN KEY ("B") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

