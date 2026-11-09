import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { registroSchema, loginSchema, perfilSchema } from '../validators/auth.js';
import crypto from 'crypto';

const router = Router();

// Rate limiter inteligente: bloquea por combinación de IP y Email
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde." },
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req);
    return req.body.email ? `${ipKey}_${req.body.email}` : ipKey;
  }
});

const registroLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: { error: "Demasiados registros desde esta IP. Intenta de nuevo en 1 hora." }
});

// Helper para opciones de cookies seguras
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict', // Protege contra ataques CSRF
};

// Registro de usuario
router.post('/registro', registroLimiter, async (req, res) => {
  try {
    // 1. Validar esquema con Zod
    const result = registroSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { nombre, email, password } = result.data;

    // 2. Verificar si el correo ya existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email }
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    // 3. Encriptar la contraseña (seguridad)
    const saltRounds = 10;
    const passwordEncriptada = await bcrypt.hash(password, saltRounds);

    // 4. Guardar en la base de datos
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: passwordEncriptada,
      }
    });

    // 5. Devolver éxito sin exponer la contraseña
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      usuario: { id: nuevoUsuario.id, nombre: nuevoUsuario.nombre, email: nuevoUsuario.email, rol: nuevoUsuario.rol }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un error al registrar el usuario' });
  }
});

// Inicio de sesión (Login)
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { email, password } = result.data;

    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario o contraseña incorrectos' }); // Mensaje ambiguo por seguridad
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Generar Access Token (vida corta: 15 minutos)
    const accessToken = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Generar Refresh Token UUID y guardar en BD
    const refreshTokenId = crypto.randomUUID();
    
    await prisma.refreshToken.create({
      data: {
        token: refreshTokenId,
        usuarioId: usuario.id,
        expiraEn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
      }
    });

    // Enviar tokens como HttpOnly cookies
    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshTokenId, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/usuarios/refresh' });

    res.json({
      message: 'Inicio de sesión exitoso',
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un error al iniciar sesión' });
  }
});

// Refrescar token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ error: 'No autorizado. Se requiere iniciar sesión.' });
  }

  try {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { usuario: true }
    });

    if (!storedToken) {
      // Si usan un token inválido, limpiamos cookies como precaución
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken', { path: '/api/usuarios/refresh' });
      return res.status(403).json({ error: 'Refresh token inválido' });
    }

    if (new Date() > storedToken.expiraEn) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken', { path: '/api/usuarios/refresh' });
      return res.status(403).json({ error: 'Refresh token expirado' });
    }

    // Generar nuevos tokens (Rotación)
    const newAccessToken = jwt.sign(
      { id: storedToken.usuario.id, rol: storedToken.usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshTokenId = crypto.randomUUID();

    // Actualizar en la base de datos
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: storedToken.id } }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshTokenId,
          usuarioId: storedToken.usuarioId,
          expiraEn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      })
    ]);

    res.cookie('accessToken', newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', newRefreshTokenId, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/usuarios/refresh' });

    res.json({ message: 'Token renovado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un error al renovar el token' });
  }
});

// Obtener datos del usuario logueado (basado en Cookie)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { id: true, nombre: true, email: true, rol: true } // Excluimos password explícitamente
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los datos del usuario' });
  }
});

// Cerrar sesión
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.cookies;
  
  if (refreshToken) {
    try {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    } catch (e) {
      console.error('Error al borrar refresh token en logout', e);
    }
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/usuarios/refresh' });
  res.json({ message: 'Sesión cerrada exitosamente' });
});

// Actualizar perfil de usuario (Ruta protegida)
router.put('/perfil', verifyToken, async (req, res) => {
  const usuarioId = req.usuario.id;

  try {
    const result = perfilSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { nombre, email, password } = result.data;
    const dataToUpdate = {};
    
    if (nombre) dataToUpdate.nombre = nombre;
    if (email) dataToUpdate.email = email;

    if (password) {
      const saltRounds = 10;
      dataToUpdate.password = await bcrypt.hash(password, saltRounds);
    }

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
