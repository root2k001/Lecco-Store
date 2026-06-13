import { useState } from 'react'
import Cabecera from "../ComponentesGenerales/cabecera/cabecera"
import './Contacto.css'

function Contacto() {
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        telefono: '',
        mensaje: ''
    })
    const [enviado, setEnviado] = useState(false)
    const [errores, setErrores] = useState({})
    const [enviando, setEnviando] = useState(false)
    const [errorGeneral, setErrorGeneral] = useState('')

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        
        if (errores[name]) {
            setErrores(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validarFormulario = () => {
        const nuevosErrores = {}

        if (!formData.nombre.trim()) {
            nuevosErrores.nombre = 'El nombre es requerido'
        }

        if (!formData.email.trim()) {
            nuevosErrores.email = 'El correo es requerido'
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            nuevosErrores.email = 'Ingresa un correo válido'
        }

        if (!formData.mensaje.trim()) {
            nuevosErrores.mensaje = 'El mensaje es requerido'
        }

        setErrores(nuevosErrores)
        return Object.keys(nuevosErrores).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrorGeneral('')
        
        if (validarFormulario()) {
            setEnviando(true)
            try {
                const res = await fetch('/api/contacto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                })

                const data = await res.json()

                if (res.ok) {
                    setEnviado(true)
                } else {
                    setErrorGeneral(data.error || 'Hubo un error al enviar el mensaje. Inténtalo de nuevo.')
                }
            } catch (err) {
                console.error('Error de red en contacto:', err)
                setErrorGeneral('Error al conectar con el servidor. Verifica tu conexión.')
            } finally {
                setEnviando(false)
            }
        }
    }

    const handleReset = () => {
        setFormData({ nombre: '', email: '', telefono: '', mensaje: '' })
        setErrores({})
        setErrorGeneral('')
        setEnviado(false)
        setEnviando(false)
    }

    if (enviado) {
        return (
            <div className="contacto-page">
                <Cabecera />
                <div className="contacto-exito">
                    <div className="exito-icono">✓</div>
                    <h2>¡Mensaje Enviado!</h2>
                    <p>Gracias por contactarnos. Te responderemos lo antes posible.</p>
                    <button onClick={handleReset} className="btn-nuevo-mensaje">
                        Enviar otro mensaje
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="contacto-page">
            <Cabecera />
            <div className="contacto-container">
                <div className="contacto-info">
                    <h1>Contáctanos</h1>
                    <p className="contacto-descripcion">
                        ¿Tienes alguna pregunta o comentario? Estamos aquí para ayudarte.
                    </p>
                    
                    <div className="contacto-detalles">
                       
                        <div className="detalle-item">
                            <span className="detalle-icono">📞</span>
                            <div>
                                <h3>#whatsapp</h3>
                                <p>+51 966 895 989</p>
                            </div>
                        </div>
                        <div className="detalle-item">
                            <span className="detalle-icono">✉️</span>
                            <div>
                                <h3>Correo</h3>
                                <p>contacto@lecco.com</p>
                            </div>
                        </div>
                    </div>
                </div>

                <form className="contacto-formulario" onSubmit={handleSubmit}>
                    {errorGeneral && (
                        <div className="error-general" style={{
                            backgroundColor: '#fef2f2',
                            color: '#ef4444',
                            border: '1px solid #fca5a5',
                            padding: '12px',
                            borderRadius: '4px',
                            marginBottom: '20px',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            ⚠️ {errorGeneral}
                        </div>
                    )}
                    <div className="form-grupo">
                        <label htmlFor="nombre">Nombre</label>
                        <input
                            id="nombre"
                            name="nombre"
                            type="text"
                            value={formData.nombre}
                            onChange={handleChange}
                            className={errores.nombre ? 'input-error' : ''}
                            placeholder="Tu nombre"
                        />
                        {errores.nombre && <span className="error-mensaje">{errores.nombre}</span>}
                    </div>

                    <div className="form-grupo">
                        <label htmlFor="email">Correo electrónico <span className="required">*</span></label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={errores.email ? 'input-error' : ''}
                            placeholder="tu@correo.com"
                        />
                        {errores.email && <span className="error-mensaje">{errores.email}</span>}
                    </div>

                    <div className="form-grupo">
                        <label htmlFor="telefono">Teléfono</label>
                        <input
                            id="telefono"
                            name="telefono"
                            type="tel"
                            value={formData.telefono}
                            onChange={handleChange}
                            placeholder="+1 234 567 890"
                        />
                    </div>

                    <div className="form-grupo">
                        <label htmlFor="mensaje">Mensaje <span className="required">*</span></label>
                        <textarea
                            id="mensaje"
                            name="mensaje"
                            rows="5"
                            value={formData.mensaje}
                            onChange={handleChange}
                            className={errores.mensaje ? 'input-error' : ''}
                            placeholder="¿En qué podemos ayudarte?"
                        />
                        {errores.mensaje && <span className="error-mensaje">{errores.mensaje}</span>}
                    </div>

                    <button type="submit" className="btn-enviar" disabled={enviando}>
                        {enviando ? 'Enviando...' : 'Enviar Mensaje'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default Contacto
