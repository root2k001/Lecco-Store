import Cabecera from "../Compartidos/cabecera/cabecera";
import PiePagina from '../Compartidos/footer/Footer.jsx';
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
                        Lecco nació con una misión clara: acercar las mejores gafas del mercado a
                        quienes valoran el estilo y la calidad. Seleccionamos cuidadosamente cada modelo
                        para ofrecerte una colección con las tendencias más actuales.
                    </p>
                    <p>
                        Buscamos, evaluamos y elegimos solo los lentes que cumplen con nuestros
                        estándares de diseño, comodidad y durabilidad. Nos apasiona ayudarte a
                        encontrar el par perfecto que se adapte a tu personalidad y a tu estilo
                        de vida, todo con una experiencia de compra simple y confiable.
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

                            <h3>Calidad</h3>
                            <p>Materiales premium y acabados impecables en cada producto.</p>
                        </div>
                        <div className="valor-card">

                            <h3>Innovación</h3>
                            <p>Diseños modernos que se adaptan a las tendencias actuales.</p>
                        </div>
                        <div className="valor-card">

                            <h3>Confianza</h3>
                            <p>Transparencia y honestidad en cada interacción.</p>
                        </div>

                    </div>
                </section>

                <section className="nosotros-preguntas">
                    <h2>Preguntas Generales</h2>

                    <div className="pregunta-item">
                        <h3>¿Cuáles son nuestros tiempos de envío?</h3>
                        <p>
                            Los pedidos se procesan en 1-4 días hábiles, dependiendo de la ubicación.
                        </p>
                    </div>

                    <div className="pregunta-item">
                        <h3>¿Ofrecen garantía en sus productos?</h3>
                        <p>
                            Sí, todos nuestros lentes incluyen garantía,si tienes algún problema, ten la confianza de contactarnos.
                        </p>
                    </div>



                </section>
            </div>

            <PiePagina />
        </div>
    )
}

export default Nosotros
