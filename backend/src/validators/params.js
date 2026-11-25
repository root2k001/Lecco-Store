// Convierte un parámetro de ruta (:id) en entero positivo.
// Devuelve null si no es válido (ej. "abc", "1.5", "-3"), para responder 400 en vez de 500.
export const parseId = (valor) => {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
};
