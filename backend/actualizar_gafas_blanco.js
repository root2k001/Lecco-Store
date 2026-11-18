import dotenv from 'dotenv';
dotenv.config();

import prisma from './src/prisma.js';

async function main() {
  const prod = await prisma.producto.findFirst({
    where: {
      nombre: { contains: 'gafasajhsgajsklg', mode: 'insensitive' }
    }
  });

  if (prod) {
    await prisma.producto.update({
      where: { id: prod.id },
      data: { color: 'blanco' }
    });
    console.log(`Producto #${prod.id} (${prod.nombre}) actualizado a color: 'blanco'`);
  } else {
    console.log('No se encontro el producto');
  }

  const todos = await prisma.producto.findMany();
  console.log('Productos en base de datos:');
  todos.forEach(p => console.log(`- #${p.id} ${p.nombre} -> color: "${p.color}"`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
