import { z } from 'zod';

export const registroSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  email: z.string().trim().toLowerCase().email('El formato del correo electrónico no es válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  // Consentimiento expreso para recibir ofertas (casilla sin marcar por defecto)
  aceptaMarketing: z.boolean().optional()
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('El formato del correo electrónico no es válido.'),
  password: z.string().min(1, 'La contraseña es requerida.')
});

export const perfilSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').optional(),
  email: z.string().trim().toLowerCase().email('El formato del correo electrónico no es válido.').optional(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').optional().or(z.literal('')),
  aceptaMarketing: z.boolean().optional()
});
