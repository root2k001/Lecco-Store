'use client'

import { useState } from 'react'
import Link from 'next/link'
import './footer.css'

// Suscripción a la newsletter (Brevo, con doble opt-in: llega un correo para confirmar)
function NewsletterForm() {
    const [email, setEmail] = useState('')
    const [estado, setEstado] = useState({ tipo: '', texto: '' })
    const [enviando, setEnviando] = useState(false)

    const suscribirse = async (e) => {
        e.preventDefault()
        setEnviando(true)
        setEstado({ tipo: '', texto: '' })
        try {
            const res = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'No se pudo completar la suscripción')
            setEstado({ tipo: 'exito', texto: data.message || 'Revisa tu correo y confirma tu suscripción.' })
            setEmail('')
        } catch (err) {
            setEstado({ tipo: 'error', texto: err.message })
        } finally {
            setEnviando(false)
        }
    }

    return (
        <form className="footer-newsletter" onSubmit={suscribirse}>
            <label htmlFor="newsletter-email">Recibe ofertas y nuevas colecciones</label>
            <div className="footer-newsletter-fila">
                <input
                    id="newsletter-email"
                    type="email"
                    required
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" disabled={enviando}>{enviando ? '...' : 'Suscribirme'}</button>
            </div>
            {estado.texto && (
                <p className={`footer-newsletter-mensaje ${estado.tipo}`} role="status">{estado.texto}</p>
            )}
            <p className="footer-newsletter-legal">Te enviaremos un correo para confirmar. Puedes darte de baja cuando quieras.</p>
        </form>
    )
}

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-seccion">
                    <h3 className="footer-logo">Lecco</h3>
                    <p className="footer-descripcion">
                        Tu destino para lentes de alta calidad con estilo moderno y elegante.
                    </p>
                    <NewsletterForm />
                </div>

                <div className="footer-seccion">
                    <h4>Enlaces</h4>
                    <ul className="footer-links">
                        <li><Link href="/">Inicio</Link></li>
                        <li><Link href="/Lentes">Colección</Link></li>
                        <li><Link href="/Nosotros">Nosotros</Link></li>
                    </ul>
                </div>

                <div className="footer-seccion">
                    <h4>Contacto</h4>
                    <ul className="footer-info">

                        <li>+51 999 999 999</li>
                        <li>lecco.eyewear@gmail.com</li>
                    </ul>
                </div>

                <div className="footer-seccion">
                    <h4>Síguenos</h4>
                    <div className="footer-social">
                        <a href="#" className="social-link">Facebook</a>
                        <a href="https://www.instagram.com/lecco.eyewear" className="social-link">Instagram</a>
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
