import jwt from 'jsonwebtoken';

// Middleware para verificar que el usuario tenga un token válido
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(403).json({ error: 'Se requiere un token de autenticación' });
  }

  const token = authHeader.split(' ')[1]; // El formato suele ser "Bearer TOKEN_AQUI"
  if (!token) {
    return res.status(403).json({ error: 'Token no proporcionado o mal formado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // Guardamos { id, rol } en req.usuario para que la ruta lo use
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware para verificar que el usuario tenga rol de administrador
export const verifyAdmin = (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
  }

  next();
};
