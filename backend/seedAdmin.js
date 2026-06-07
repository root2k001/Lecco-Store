import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin() {
  const emailToUpgrade = process.argv[2]; // pasaremos el correo como argumento

  if (!emailToUpgrade) {
    console.error('Por favor, proporciona el email del usuario. Ejemplo: node seedAdmin.js emilio@test.com');
    process.exit(1);
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: emailToUpgrade }
    });

    if (!usuario) {
      console.error(`No se encontró un usuario con el correo: ${emailToUpgrade}`);
      process.exit(1);
    }

    await prisma.usuario.update({
      where: { email: emailToUpgrade },
      data: { rol: 'admin' }
    });

    console.log(`¡Éxito! El usuario ${usuario.nombre} (${emailToUpgrade}) ahora es Administrador.`);
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
