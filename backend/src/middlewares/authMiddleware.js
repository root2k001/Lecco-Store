import jwt from 'jsonwebtoken';

// Middleware para verificar que el usuario tenga un token válido
export const verifyToken = (req, res, next) => {
  let token = req.cookies?.accessToken;
  if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
    const bearerToken = req.headers.authorization.split(' ')[1];
    if (bearerToken && bearerToken !== 'undefined' && bearerToken !== 'null') {
      token = bearerToken;
    }
  }
  
  if (!token) {
    return res.status(401).json({ error: 'No autorizado. Se requiere iniciar sesión.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // Guardamos { id, rol } en req.usuario para que la ruta lo use
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Sesión expirada o inválida. Vuelve a iniciar sesión.' });
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

// Middleware OPCIONAL: intenta leer el token pero no bloquea si no existe (para checkout de invitados)
export const optionalToken = (req, res, next) => {
  let token = req.cookies?.accessToken;
  if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
    const bearerToken = req.headers.authorization.split(' ')[1];
    if (bearerToken && bearerToken !== 'undefined' && bearerToken !== 'null') {
      token = bearerToken;
    }
  }
  req.usuario = null; // Por defecto: invitado (sin usuario)

  if (!token) return next();

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // Token inválido o expirado: continuar como invitado igualmente
    req.usuario = null;
  }

  next();
};
