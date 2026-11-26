// URLs amigables de producto: /producto/12-gafa-aviador-negra
export const slugify = (texto) => String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

// Acepta el producto de la API (nombre) o el mapeado del catálogo (name)
export const rutaProducto = (p) => {
    const slug = slugify(p.nombre ?? p.name);
    return `/producto/${p.id}${slug ? `-${slug}` : ''}`;
};

export const idDesdeSlug = (slug) => {
    const m = /^(\d+)(?:-|$)/.exec(String(slug ?? ''));
    return m ? Number(m[1]) : null;
};
