import { Router } from 'express';
import prisma from '../prisma.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Obtener todo el historial de cambios (Ruta protegida para admins)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const historial = await prisma.historialCambios.findMany({
      orderBy: { creadoEn: 'desc' },
      include: {
        admin: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });
    res.json(historial);
  } catch (error) {
    console.error('Error al obtener el historial de cambios:', error);
    res.status(500).json({ error: 'Hubo un error al obtener el historial de cambios' });
  }
});

export default router;
