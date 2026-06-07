import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function test() {
  try {
    const nuevoPedido = await prisma.pedido.create({
      data: {
        usuarioId: 1,
        total: 150,
        items: {
          create: [{ productoId: 1, cantidad: 1, precio: 150 }]
        }
      }
    });
    console.log('Exito:', nuevoPedido);
  } catch (e) {
    console.error('Error de Prisma:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
