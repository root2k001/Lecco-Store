import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const mensajes = await prisma.mensajeContacto.findMany({
      orderBy: { creadoEn: 'desc' }
    });

    console.log('\n==================================================');
    console.log(`📬 MENSAJES DE CONTACTO EN LA BASE DE DATOS (${mensajes.length})`);
    console.log('==================================================\n');

    if (mensajes.length === 0) {
      console.log('No hay mensajes de contacto guardados todavía.');
    } else {
      mensajes.forEach((msg, index) => {
        console.log(`[Mensaje #${mensajes.length - index}]`);
        console.log(`Fecha:    ${msg.creadoEn.toLocaleString()}`);
        console.log(`Nombre:   ${msg.nombre}`);
        console.log(`Correo:   ${msg.email}`);
        console.log(`Teléfono: ${msg.telefono || 'No especificado'}`);
        console.log(`Mensaje:  ${msg.mensaje}`);
        console.log('--------------------------------------------------\n');
      });
    }
  } catch (error) {
    console.error('Error al leer los mensajes de la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
