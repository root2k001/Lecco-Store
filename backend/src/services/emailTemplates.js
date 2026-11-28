// Helper para escapar HTML en datos dinámicos
const escapeHtml = (str) => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/**
 * Genera el HTML del email de bienvenida para un usuario recién registrado.
 */
export const plantillaBienvenida = ({ nombre }) => {
  const nombreSeguro = escapeHtml(nombre);

  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #111827; padding: 28px 32px;">
        <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase;">LECCO</h1>
        <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Store</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #1e293b; margin: 0 0 8px; font-size: 22px; font-weight: 600;">¡Bienvenido/a, ${nombreSeguro}! 🎉</h2>
        <p style="color: #475569; margin: 0 0 20px; font-size: 15px; line-height: 1.6;">
          Gracias por registrarte en <strong>Lecco Store</strong>. Tu cuenta ha sido creada exitosamente.
        </p>

        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 12px; font-size: 14px; color: #166534; font-weight: 600;">¿Qué puedes hacer ahora?</p>
          <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.8;">
            <li>Explorar nuestro catálogo de lentes</li>
            <li>Guardar tus productos favoritos</li>
            <li>Realizar pedidos y seguir su estado</li>
          </ul>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
          Si tienes alguna pregunta, no dudes en contactarnos. ¡Estamos aquí para ayudarte!
        </p>
      </div>
      <div style="background: #f8fafc; padding: 20px 32px; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #cbd5e1;">© ${new Date().getFullYear()} Lecco Store. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
};

/**
 * Genera el HTML del email que avisa al cliente de un cambio de estado de su pedido.
 * `estadoInfo` = { label, color, bg } según el estado nuevo.
 */
export const plantillaEstadoPedido = ({ pedidoId, clienteNombre, estadoInfo, items, direccion, ciudad, total }) => {
  const itemsHtml = items.map(item => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #334155;">${escapeHtml(item.producto?.nombre || 'Producto')}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; text-align: center;">${item.cantidad}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #334155; text-align: right;">S/ ${Number(item.precioUnit).toFixed(2)}</td>
        </tr>
      `).join('');

  return `
          <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: #111827; padding: 28px 32px;">
              <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase;">LECCO</h1>
              <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Store</p>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #1e293b; margin: 0 0 8px; font-size: 20px; font-weight: 600;">Hola, ${escapeHtml(clienteNombre)} 👋</h2>
              <p style="color: #475569; margin: 0 0 24px; font-size: 15px; line-height: 1.6;">
                Te informamos que el estado de tu pedido <strong>#${pedidoId}</strong> ha sido actualizado.
              </p>
              <div style="background: ${estadoInfo.bg}; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Estado actual</p>
                <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${estadoInfo.color};">${estadoInfo.label}</p>
              </div>
              <h3 style="color: #1e293b; font-size: 14px; font-weight: 600; letter-spacing: 0.5px; margin: 0 0 12px; text-transform: uppercase;">Productos de tu pedido</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <thead>
                  <tr>
                    <th style="padding: 8px 0; text-align: left; font-size: 12px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">Producto</th>
                    <th style="padding: 8px 0; text-align: center; font-size: 12px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">Cant.</th>
                    <th style="padding: 8px 0; text-align: right; font-size: 12px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">Precio</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <div style="background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px; font-size: 13px; color: #64748b;">📍 <strong>Dirección de envío:</strong></p>
                <p style="margin: 0; color: #334155; font-size: 14px;">${escapeHtml(direccion || '')}, ${escapeHtml(ciudad || '')}</p>
              </div>
              <div style="border-top: 2px solid #f1f5f9; padding-top: 16px;">
                <span style="color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase;">Total: </span>
                <span style="color: #1e293b; font-size: 18px; font-weight: 700;">S/ ${Number(total).toFixed(2)}</span>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">© ${new Date().getFullYear()} Lecco Store. Todos los derechos reservados.</p>
            </div>
          </div>
        `;
};
