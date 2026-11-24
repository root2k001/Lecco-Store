import dotenv from 'dotenv';
dotenv.config();

import prisma from './src/prisma.js';

async function main() {
  const productos = await prisma.producto.findMany();
  console.log('Productos actuales:');
  productos.forEach(p => console.log(`- ID ${p.id}: ${p.nombre} | color actual: ${p.color}`));

  // Asignar colores si están vacíos o null
  for (const p of productos) {
    let nuevoColor = p.color;
    if (!nuevoColor) {
      if (p.nombre.toLowerCase().includes('max torres 2')) {
        nuevoColor = 'rosa';
      } else if (p.nombre.toLowerCase().includes('maxtorres')) {
        nuevoColor = 'negro';
      }
    }
    if (nuevoColor && nuevoColor !== p.color) {
      await prisma.producto.update({
        where: { id: p.id },
        data: { color: nuevoColor }
      });
      console.log(`=> Actualizado producto #${p.id} (${p.nombre}) con color: "${nuevoColor}"`);
    }
  }

  const final = await prisma.producto.findMany();
  console.log('Productos tras actualización:');
  final.forEach(p => console.log(`- ID ${p.id}: ${p.nombre} | color: ${p.color}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
