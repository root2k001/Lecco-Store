import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import dotenv from 'dotenv';
dotenv.config();

// Origen: Neon DB (remota)
const neonUrl = process.env.URL_RESPALDO || process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_0NJLKdn1IzUB@ep-polished-rice-aqe5aa77-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Destino: PostgreSQL local de Docker (db:5432 en contenedor o localhost:5432 desde host)
const destinoUrl = process.env.URL_PRODUCTION || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/leccostore?schema=public';

const origen = new PrismaClient({
  datasources: { db: { url: neonUrl } },
});
const destino = new PrismaClient({
  datasources: { db: { url: destinoUrl } },
});

async function resetSequence(tabla) {
  try {
    await destino.$executeRawUnsafe(`
      DO $$ BEGIN
        IF pg_get_serial_sequence('"${tabla}"', 'id') IS NOT NULL THEN
          PERFORM setval(
            pg_get_serial_sequence('"${tabla}"', 'id'),
            COALESCE((SELECT MAX("id") FROM "${tabla}"), 1),
            (SELECT COUNT(*) > 0 FROM "${tabla}")
          );
        END IF;
      END $$;
    `);
  } catch (err) {
    console.warn(`No se pudo reiniciar secuencia para ${tabla}:`, err.message);
  }
}

async function migrarTabla(nombre, consultarOrigen, insertarDestino) {
  try {
    const registros = await consultarOrigen();
    if (!registros || registros.length === 0) {
      console.log(`- ${nombre}: 0 registros encontrados en Neon DB.`);
      return;
    }
    const res = await insertarDestino(registros);
    await resetSequence(nombre);
    console.log(`✔ ${nombre}: ${registros.length} registros sincronizados (nuevos insertados: ${res?.count ?? registros.length})`);
  } catch (err) {
    console.error(`❌ Error al migrar ${nombre}:`, err.message);
  }
}

async function main() {
  console.log('🚀 Iniciando clonación de datos desde Neon DB hacia Local Docker PostgreSQL...');
  console.log('Origen:', neonUrl.replace(/:[^:@]+@/, ':***@'));
  console.log('Destino:', destinoUrl.replace(/:[^:@]+@/, ':***@'));

  // 1. Usuarios
  await migrarTabla('Usuario',
    () => origen.usuario.findMany(),
    (data) => destino.usuario.createMany({ data, skipDuplicates: true })
  );

  // 2. Productos
  await migrarTabla('Producto',
    () => origen.producto.findMany(),
    (data) => destino.producto.createMany({ data, skipDuplicates: true })
  );

  // 3. Pedidos
  await migrarTabla('Pedido',
    () => origen.pedido.findMany(),
    (data) => destino.pedido.createMany({ data, skipDuplicates: true })
  );

  // 4. Items de Pedido
  await migrarTabla('ItemPedido',
    () => origen.itemPedido.findMany(),
    (data) => destino.itemPedido.createMany({ data, skipDuplicates: true })
  );

  // 5. Historial de Cambios
  await migrarTabla('HistorialCambios',
    () => origen.historialCambios.findMany(),
    (data) => destino.historialCambios.createMany({ data, skipDuplicates: true })
  );

  // 6. Mensajes de Contacto
  await migrarTabla('MensajeContacto',
    () => origen.mensajeContacto.findMany(),
    (data) => destino.mensajeContacto.createMany({ data, skipDuplicates: true })
  );

  // 7. Refresh Tokens
  await migrarTabla('RefreshToken',
    () => origen.refreshToken.findMany(),
    (data) => destino.refreshToken.createMany({ data, skipDuplicates: true })
  );

  console.log('🎉 Migración de datos completada exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error fatal durante la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await origen.$disconnect();
    await destino.$disconnect();
  });