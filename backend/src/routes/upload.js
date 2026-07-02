import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer en memoria (no guarda archivos en disco)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // Máximo 20MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo imágenes JPG, PNG, WebP, GIF y videos MP4, WebM, OGG, MOV.'));
    }
  }
});

// POST /api/upload — Subir una imagen o video a Cloudinary (Admin)
router.post('/', verifyToken, verifyAdmin, upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ningún archivo' });
    }

    const isVideo = req.file.mimetype.startsWith('video/');

    // Subir a Cloudinary usando un stream desde el buffer en memoria
    const result = await new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: 'lecco-store/productos',
        resource_type: isVideo ? 'video' : 'image'
      };

      if (!isVideo) {
        uploadOptions.transformation = [
          { width: 800, height: 800, crop: 'limit', quality: 'auto', format: 'auto' }
        ];
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // Enviar el buffer al stream
      uploadStream.end(req.file.buffer);
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      resource_type: result.resource_type
    });
  } catch (error) {
    console.error('Error subiendo archivo a Cloudinary:', error);
    res.status(500).json({ error: error.message || 'Error al subir el archivo' });
  }
});

// Middleware de manejo de errores de multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 20MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;
