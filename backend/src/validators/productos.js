import { z } from 'zod';

export const crearProductoSchema = z.object({
  nombre: z.string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(150, 'El nombre no puede exceder 150 caracteres.'),
  precio: z.number({ required_error: 'El precio es obligatorio' })
    .positive('El precio debe ser un número positivo.'),
  stock: z.number({ required_error: 'El stock es obligatorio' })
    .int('El stock debe ser un número entero.')
    .min(0, 'El stock no puede ser negativo.'),
  genero: z.string().trim().max(50).optional().nullable().or(z.literal('')),
  descripcion: z.string().trim().max(2000, 'La descripción es demasiado larga.').optional().nullable().or(z.literal('')),
  imagen: z.string().trim().max(1000).optional().nullable().or(z.literal('')),
  imagenesAdicionales: z.array(z.string().trim().max(1000)).optional(),
  videos: z.array(z.string().trim().max(1000)).optional()
});

export const actualizarProductoSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(150).optional(),
  precio: z.number().positive('El precio debe ser un número positivo.').optional(),
  stock: z.number().int('El stock debe ser un número entero.').min(0, 'El stock no puede ser negativo.').optional(),
  genero: z.string().trim().max(50).optional().nullable().or(z.literal('')),
  descripcion: z.string().trim().max(2000).optional().nullable().or(z.literal('')),
  imagen: z.string().trim().max(1000).optional().nullable().or(z.literal('')),
  imagenesAdicionales: z.array(z.string().trim().max(1000)).optional(),
  videos: z.array(z.string().trim().max(1000)).optional()
});
