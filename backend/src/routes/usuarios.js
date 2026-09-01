import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import rateLimit from 'express-rate-limit'



const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Demasiados intentos de inicio de sesion desde esta IP, intenta de nuevo mas tarde"
});

const registroLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: "Demasiados registros desde esta IP, intenta de nuevo en 1 hora"
});

const router = Router();

// Registro de usuario
router.post('/registro', registroLimiter, async (req, res) => {
  const { nombre, email, password } = req.body;

  // 0. Validar y sanear los campos de entrada (C-3)
  if (!nombre || nombre.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'El formato del correo electrónico no es válido.' });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  // Sanear los valores antes de usarlos
  const nombreSanitizado = nombre.trim();
  const emailSanitizado = email.trim().toLowerCase();

  try {
    // 1. Verificar si el correo ya existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: emailSanitizado }
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
        nombre: nombreSanitizado,
        email: emailSanitizado,
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
router.post('/login', loginLimiter, async (req, res) => {
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

  // Validar campos antes de actualizar
  if (nombre !== undefined && nombre.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email !== undefined && !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'El formato del correo electrónico no es válido.' });
  }

  if (password !== undefined && password.trim() !== '' && password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  try {
    const dataToUpdate = {};
    if (nombre !== undefined) dataToUpdate.nombre = nombre.trim();
    if (email !== undefined) dataToUpdate.email = email.trim().toLowerCase();

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
