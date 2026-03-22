import { Link } from 'react-router-dom'
import './footer.css'

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-seccion">
                    <h3 className="footer-logo">Lecco</h3>
                    <p className="footer-descripcion">
                        Tu destino para lentes de alta calidad con estilo moderno y elegante.
                    </p>
                </div>

                <div className="footer-seccion">
                    <h4>Enlaces</h4>
                    <ul className="footer-links">
                        <li><Link to="/">Inicio</Link></li>
                        <li><Link to="/Coleccion">Colección</Link></li>
                        <li><Link to="/Nosotros">Nosotros</Link></li>
                        <li><Link to="/Contacto">Contacto</Link></li>
                    </ul>
                </div>

                <div className="footer-seccion">
                    <h4>Contacto</h4>
                    <ul className="footer-info">
                        
                        <li>📞 +51 966894989</li>
                        <li>✉️ contacto@lecco.com</li>
                    </ul>
                </div>

                <div className="footer-seccion">
                    <h4>Síguenos</h4>
                    <div className="footer-social">
                        <a href="#" className="social-link">Facebook</a>
                        <a href="#" className="social-link">Instagram</a>
                        <a href="#" className="social-link">Twitter</a>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; 2026 Lecco. Todos los derechos reservados.</p>
            </div>
        </footer>
    )
}

export default Footer
