import { z } from 'zod';

export const crearPedidoSchema = z.object({
  items: z.array(
    z.object({
      productoId: z.number({ required_error: 'ID de producto requerido' }).int().positive('ID de producto inválido'),
      cantidad: z.number({ required_error: 'Cantidad requerida' }).int().positive('La cantidad debe ser mayor a 0')
    })
  ).min(1, 'El pedido debe contener al menos un producto.'),
  direccion: z.string().trim().max(255, 'La dirección es demasiado larga.').optional().nullable().or(z.literal('')),
  ciudad: z.string().trim().max(100, 'La ciudad es demasiado larga.').optional().nullable().or(z.literal('')),
  codigoPostal: z.string().trim().max(20, 'El código postal es demasiado largo.').optional().nullable().or(z.literal('')),
  telefono: z.string().trim().max(30, 'El teléfono es demasiado largo.').optional().nullable().or(z.literal(''))
});

export const actualizarEstadoPedidoSchema = z.object({
  estado: z.enum(['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'], {
    errorMap: () => ({ message: 'Estado no válido. Los estados permitidos son: pendiente, procesando, enviado, entregado, cancelado.' })
  }),
  motivo: z.string().trim().max(500, 'El motivo es demasiado largo.').optional().nullable().or(z.literal(''))
});
