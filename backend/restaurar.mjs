import { PrismaClient } from '@prisma/client';

const origen = new PrismaClient({
  datasources: { db: { url: 'URL_RESPALDO' } },
});
const destino = new PrismaClient({
  datasources: { db: { url: 'URL_PRODUCTION' } },
});

const normalizar = (val) =>
  val !== null && typeof val === 'object' && val.constructor === Object
    ? JSON.stringify(val)
    : val;

async function main() {
  const tablas = await origen.$queryRawUnsafe(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `);

  let pendientes = tablas.map((t) => t.tablename);

  while (pendientes.length > 0) {
    const siguientes = [];
    let progreso = false;

    for (const tabla of pendientes) {
      const filas = await origen.$queryRawUnsafe(`SELECT * FROM "${tabla}"`);
      if (filas.length === 0) {
        progreso = true;
        continue;
      }

      try {
        for (const fila of filas) {
          const cols = Object.keys(fila);
          const colsSql = cols.map((c) => `"${c}"`).join(', ');
          const paramsSql = cols.map((_, i) => `$${i + 1}`).join(', ');
          const valores = cols.map((c) => normalizar(fila[c]));

          await destino.$executeRawUnsafe(
            `INSERT INTO "${tabla}" (${colsSql}) VALUES (${paramsSql}) ON CONFLICT DO NOTHING`,
            ...valores
          );
        }
        // Reiniciar secuencia autoincremental si la tabla tiene columna "id"
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
        console.log(`✔ ${tabla}: ${filas.length} registros restaurados`);
        progreso = true;
      } catch (err) {
        if (err.message.includes('23503')) {
          siguientes.push(tabla); // Esperar a que se inserte primero su tabla padre
        } else {
          throw err;
        }
      }
    }

    if (!progreso) throw new Error(`No se pudieron resolver dependencias: ${siguientes}`);
    pendientes = siguientes;
  }
}

main()
  .then(() => console.log('Restauración completa.'))
  .finally(async () => {
    await origen.$disconnect();
    await destino.$disconnect();
  });