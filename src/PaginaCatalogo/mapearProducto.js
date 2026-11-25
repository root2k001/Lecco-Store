// Convierte un producto de la API (nombre, precio, imagen...) al formato que usan
// el catálogo, el carrito y el detalle de producto (name, price, img...).
export const mapearProducto = (p) => ({
    id: p.id,
    name: p.nombre,
    price: Number(p.precio),
    img: p.imagen || 'en proceso',
    gender: p.genero,
    color: p.color ? String(p.color).trim() : null,
    stock: p.stock,
    quantity: p.stock,
    descripcion: p.descripcion,
    imagenesAdicionales: p.imagenesAdicionales || [],
    videos: p.videos || []
});
