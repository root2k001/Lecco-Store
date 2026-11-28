// Datos estructurados schema.org (los usa Google para resultados enriquecidos).
// Se escapa "<" para que el contenido no pueda cerrar la etiqueta <script>.
export default function JsonLd({ datos }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, '\u003c') }}
        />
    );
}
