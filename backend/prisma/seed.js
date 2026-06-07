import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando el poblado (seeding) de la base de datos...');

  // Leer el archivo data.json del frontend
  // Como ejecutaremos esto desde la carpeta "backend", ../public/data.json apunta a la carpeta correcta
  const dataPath = path.resolve('../public/data.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ No se encontró el archivo data.json en:', dataPath);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(dataPath, 'utf-8');
  const productos = JSON.parse(fileContent);

  console.log(`📦 Se encontraron ${productos.length} productos en data.json.`);

  // Opcional: Limpiamos la tabla primero para no duplicar si corres el script 2 veces
  await prisma.producto.deleteMany({});
  console.log('🧹 Tabla de productos limpiada para evitar duplicados.');

  let insertados = 0;
  for (const prod of productos) {
    await prisma.producto.create({
      data: {
        nombre: prod.name,
        precio: prod.price,
        imagen: prod.img,
        genero: prod.gender,
        // Si no tiene stock definido, le ponemos 10 por defecto para que puedas vender
        stock: prod.quantity || 10, 
      }
    });
    insertados++;
  }

  console.log(`✅ ¡Éxito! Se insertaron ${insertados} productos en PostgreSQL.`);
}

main()
  .catch((e) => {
    console.error('❌ Error fatal al insertar los datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
