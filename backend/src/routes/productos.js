import { Router } from 'express';
import prisma from '../prisma.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Obtener todos los productos (Público)
router.get('/', async (req, res) => {
  try {
    const productos = await prisma.producto.findMany();
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los productos' });
  }
});

// Obtener un producto por ID (Público)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const producto = await prisma.producto.findUnique({
      where: { id: parseInt(id) }
    });
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

// --- RUTAS PROTEGIDAS (ADMIN) ---

// Crear un producto
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const { nombre, precio, imagen, genero, stock, descripcion } = req.body;
  try {
    const nuevoProducto = await prisma.producto.create({
      data: { nombre, precio, imagen, genero, stock, descripcion }
    });
    res.status(201).json(nuevoProducto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
});

// Actualizar un producto (ej. para cambiar el stock o precio)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const data = req.body; // Puede incluir { stock: 10, precio: 120 }
  
  try {
    const productoActualizado = await prisma.producto.update({
      where: { id: parseInt(id) },
      data
    });
    res.json(productoActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
});

// Eliminar un producto
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.producto.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

export default router;
