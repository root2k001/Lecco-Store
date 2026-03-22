import Cabecera from "../ComponentesGenerales/cabecera/cabecera";
import PiePagina from '../ComponentesGenerales/footer/Footer.jsx';
import './Nosotros.css'

function Nosotros() {
    return (
        <div className="nosotros-page">
            <Cabecera />
            
            <div className="nosotros-hero">
                <h1>Sobre Nosotros</h1>
                <p>Conoce la historia detrás de Lecco</p>
            </div>

            <div className="nosotros-container">
                <section className="nosotros-seccion">
                    <h2>¿Quiénes Somos?</h2>
                    <p>
                        Somos una marca dedicada a crear lentes que combinan estilo, calidad y accesibilidad. 
                        En Lecco creemos que la buena visión no debería ser un lujo, por eso trabajamos 
                        para ofrecer productos que mejoren tu vida diaria.
                    </p>
                </section>

                <section className="nosotros-seccion">
                    <h2>Nuestra Misión</h2>
                    <p>
                        Proporcionar lentes de alta calidad con diseños modernos a precios justos, 
                        respaldados por un servicio al cliente excepcional y un compromiso con la 
                        satisfacción de cada uno de nuestros clientes.
                    </p>
                </section>

                <section className="nosotros-valores">
                    <h2>Nuestros Valores</h2>
                    <div className="valores-grid">
                        <div className="valor-card">
                            <span className="valor-icono">✨</span>
                            <h3>Calidad</h3>
                            <p>Materiales premium y acabados impecables en cada producto.</p>
                        </div>
                        <div className="valor-card">
                            <span className="valor-icono">💡</span>
                            <h3>Innovación</h3>
                            <p>Diseños modernos que se adaptan a las tendencias actuales.</p>
                        </div>
                        <div className="valor-card">
                            <span className="valor-icono">🤝</span>
                            <h3>Confianza</h3>
                            <p>Transparencia y honestidad en cada interacción.</p>
                        </div>
                      
                    </div>
                </section>

                <section className="nosotros-preguntas">
                    <h2>Preguntas Frecuentes</h2>
                    
                    <div className="pregunta-item">
                        <h3>¿Cuáles son nuestros tiempos de envío?</h3>
                        <p>
                            Los pedidos se procesan en 1-2 días hábiles. El envío estándar tarda 
                            3-5 días hábiles, mientras que el envío express llega en 1-2 días.
                        </p>
                    </div>

                    <div className="pregunta-item">
                        <h3>¿Ofrecen garantía en sus productos?</h3>
                        <p>
                            Sí, todos nuestros lentes incluyen garantía de 6 meses contra defectos 
                            de fabricación. Si tienes algún problema, contáctanos y lo resolveremos.
                        </p>
                    </div>

                    <div className="pregunta-item">
                        <h3>¿Puedo devolver o cambiar mi compra?</h3>
                        <p>
                            Aceptamos devoluciones dentro de los 30 días posteriores a la compra, 
                            siempre que el producto esté en su estado original y con todos sus accesorios.
                        </p>
                    </div>

                  
                </section>
            </div>

            <PiePagina />
        </div>
    )
}

export default Nosotros
