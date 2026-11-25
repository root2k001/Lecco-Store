import { Router } from 'express';
import prisma from '../prisma.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';
import { crearCampanaSchema, actualizarCampanaSchema, slugSchema } from '../validators/campanas.js';
import { parseId } from '../validators/params.js';

const router = Router();

// Una campaña es visible en la tienda si está activa y dentro de sus fechas
export const filtroCampanaVigente = (ahora = new Date()) => ({
  activa: true,
  inicio: { lte: ahora },
  fin: { gte: ahora }
});

const camposPublicos = { id: true, slug: true, titulo: true, descripcion: true, banner: true, inicio: true, fin: true };

const registrarHistorial = (adminId, accion, detalle) =>
  prisma.historialCambios.create({ data: { adminId, accion, detalle } });

// ── Públicas ────────────────────────────────────────────────────────────────

// GET /api/campanas/activas — Campañas vigentes (cabecera, carrusel de inicio)
router.get('/activas', async (req, res) => {
  try {
    const campanas = await prisma.campana.findMany({
      where: filtroCampanaVigente(),
      orderBy: { inicio: 'desc' },
      select: camposPublicos
    });
    res.json(campanas);
  } catch (error) {
    console.error('Error obteniendo campañas activas:', error);
    res.status(500).json({ error: 'Error al obtener las campañas' });
  }
});

// GET /api/campanas/slug/:slug — Datos de una campaña vigente (página /campanas/:slug)
router.get('/slug/:slug', async (req, res) => {
  const slug = slugSchema.safeParse(req.params.slug);
  if (!slug.success) return res.status(404).json({ error: 'Campaña no encontrada' });

  try {
    const campana = await prisma.campana.findFirst({
      where: { slug: slug.data, ...filtroCampanaVigente() },
      select: camposPublicos
    });
    if (!campana) return res.status(404).json({ error: 'Campaña no encontrada' });
    res.json(campana);
  } catch (error) {
    console.error('Error obteniendo campaña:', error);
    res.status(500).json({ error: 'Error al obtener la campaña' });
  }
});

// ── Administración ──────────────────────────────────────────────────────────

// GET /api/campanas — Todas las campañas con sus productos (panel admin)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const campanas = await prisma.campana.findMany({
      orderBy: { inicio: 'desc' },
      include: { productos: { select: { id: true, nombre: true } } }
    });
    res.json(campanas);
  } catch (error) {
    console.error('Error obteniendo campañas:', error);
    res.status(500).json({ error: 'Error al obtener las campañas' });
  }
});

// Normaliza los datos validados al formato de Prisma
const datosPrisma = ({ productoIds, descripcion, banner, ...resto }, esCreacion) => ({
  ...resto,
  ...(descripcion !== undefined ? { descripcion: descripcion || null } : {}),
  ...(banner !== undefined ? { banner: banner || null } : {}),
  ...(productoIds !== undefined
    ? { productos: esCreacion
        ? { connect: productoIds.map(id => ({ id })) }
        : { set: productoIds.map(id => ({ id })) } }
    : {})
});

const responderErrorPrisma = (error, res, mensaje) => {
  if (error.code === 'P2002') return res.status(409).json({ error: 'Ya existe una campaña con ese identificador.' });
  if (error.code === 'P2025' || error.code === 'P2018') return res.status(400).json({ error: 'Alguno de los productos no existe.' });
  console.error(mensaje, error);
  return res.status(500).json({ error: mensaje });
};

// POST /api/campanas — Crear campaña
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const validacion = crearCampanaSchema.safeParse(req.body);
  if (!validacion.success) {
    return res.status(400).json({ error: validacion.error.issues[0]?.message || 'Datos de campaña inválidos' });
  }
  try {
    const campana = await prisma.campana.create({
      data: datosPrisma(validacion.data, true),
      include: { productos: { select: { id: true, nombre: true } } }
    });
    await registrarHistorial(req.usuario.id, 'Creación de Campaña',
      `Campaña "${campana.titulo}" (${campana.slug}) creada con ${campana.productos.length} productos.`);
    res.status(201).json(campana);
  } catch (error) {
    responderErrorPrisma(error, res, 'Error al crear la campaña');
  }
});

// PUT /api/campanas/:id — Editar campaña (productoIds reemplaza la lista de productos)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID de campaña inválido' });

  const validacion = actualizarCampanaSchema.safeParse(req.body);
  if (!validacion.success) {
    return res.status(400).json({ error: validacion.error.issues[0]?.message || 'Datos de campaña inválidos' });
  }

  try {
    const previa = await prisma.campana.findUnique({ where: { id } });
    if (!previa) return res.status(404).json({ error: 'Campaña no encontrada' });

    // Si solo llega una de las fechas, validar contra la que ya estaba guardada
    const inicio = validacion.data.inicio ?? previa.inicio;
    const fin = validacion.data.fin ?? previa.fin;
    if (fin <= inicio) {
      return res.status(400).json({ error: 'La fecha de fin debe ser posterior a la de inicio.' });
    }

    const campana = await prisma.campana.update({
      where: { id },
      data: datosPrisma(validacion.data, false),
      include: { productos: { select: { id: true, nombre: true } } }
    });
    await registrarHistorial(req.usuario.id, 'Actualización de Campaña', `Campaña "${campana.titulo}" (${campana.slug}) actualizada.`);
    res.json(campana);
  } catch (error) {
    responderErrorPrisma(error, res, 'Error al actualizar la campaña');
  }
});

// DELETE /api/campanas/:id — Eliminar campaña (los productos no se borran)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID de campaña inválido' });

  try {
    const campana = await prisma.campana.findUnique({ where: { id } });
    if (!campana) return res.status(404).json({ error: 'Campaña no encontrada' });

    await prisma.campana.delete({ where: { id } });
    await registrarHistorial(req.usuario.id, 'Eliminación de Campaña', `Campaña "${campana.titulo}" (${campana.slug}) eliminada.`);
    res.json({ message: 'Campaña eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando campaña:', error);
    res.status(500).json({ error: 'Error al eliminar la campaña' });
  }
});

export default router;
