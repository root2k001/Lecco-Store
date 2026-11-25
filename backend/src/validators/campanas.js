import { z } from 'zod';

// "verano-2027": minúsculas, números y guiones. Se usa en la URL y como utm_campaign.
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugSchema = z.string().trim().toLowerCase().max(60)
  .regex(SLUG_REGEX, 'El identificador solo puede tener minúsculas, números y guiones (ej. verano-2027).');

const camposCampana = {
  slug: slugSchema,
  titulo: z.string().trim().min(2, 'El título debe tener al menos 2 caracteres.').max(100),
  descripcion: z.string().trim().max(500, 'La descripción es demasiado larga.').optional().nullable().or(z.literal('')),
  banner: z.string().trim().url('El banner debe ser una URL válida.').max(1000).optional().nullable().or(z.literal('')),
  inicio: z.coerce.date({ message: 'Fecha de inicio inválida.' }),
  fin: z.coerce.date({ message: 'Fecha de fin inválida.' }),
  activa: z.boolean().optional(),
  productoIds: z.array(z.number().int().positive()).max(500).optional()
};

const fechasCoherentes = (datos, ctx) => {
  if (datos.inicio && datos.fin && datos.fin <= datos.inicio) {
    ctx.addIssue({ code: 'custom', path: ['fin'], message: 'La fecha de fin debe ser posterior a la de inicio.' });
  }
};

export const crearCampanaSchema = z.object(camposCampana).superRefine(fechasCoherentes);

export const actualizarCampanaSchema = z.object(camposCampana).partial().superRefine(fechasCoherentes);
