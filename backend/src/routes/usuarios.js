import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

// Registro de usuario
router.post('/registro', async (req, res) => {
  const { nombre, email, password } = req.body;

  try {
    // 1. Verificar si el correo ya existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email }
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    // 2. Encriptar la contraseña (seguridad)
    const saltRounds = 10;
    const passwordEncriptada = await bcrypt.hash(password, saltRounds);

    // 3. Guardar en la base de datos
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: passwordEncriptada,
      }
    });

    // 4. Devolver éxito sin exponer la contraseña
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      usuario: { id: nuevoUsuario.id, nombre: nuevoUsuario.nombre, email: nuevoUsuario.email }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un error al registrar el usuario' });
  }
});

// Inicio de sesión (Login)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar al usuario por correo
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // 2. Comparar contraseñas
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // 3. Generar el Token VIP (JWT)
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET, // Esta es la llave secreta en tu .env
      { expiresIn: '24h' }
    );

    // 4. Enviar el token al frontend
    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un error al iniciar sesión' });
  }
});

// Actualizar perfil de usuario (Ruta protegida)
router.put('/perfil', verifyToken, async (req, res) => {
  const { nombre, email, password } = req.body;
  const usuarioId = req.usuario.id; // Extraído del token por verifyToken

  try {
    const dataToUpdate = { nombre, email };

    // Si el usuario proporcionó una nueva contraseña, la encriptamos
    if (password && password.trim() !== '') {
      const saltRounds = 10;
      dataToUpdate.password = await bcrypt.hash(password, saltRounds);
    }

    // Comprobar si el email nuevo ya pertenece a otra persona
    if (email) {
      const emailExistente = await prisma.usuario.findFirst({
        where: { email, id: { not: usuarioId } }
      });
      if (emailExistente) {
        return res.status(400).json({ error: 'El correo electrónico ya está en uso por otra cuenta' });
      }
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: dataToUpdate
    });

    res.json({
      message: 'Perfil actualizado exitosamente',
      usuario: { 
        id: usuarioActualizado.id, 
        nombre: usuarioActualizado.nombre, 
        email: usuarioActualizado.email, 
        rol: usuarioActualizado.rol 
      }
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: 'Hubo un error al actualizar el perfil' });
  }
});

export default router;
