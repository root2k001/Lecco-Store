'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import './Carrito.css'
import Cabecera from '../Compartidos/cabecera/cabecera.jsx'
import PiePagina from '../Compartidos/footer/Footer.jsx'

import { WHATSAPP_NUMERO } from '../lib/sitio.js'

// Estado que MP pone en la URL de retorno → estado interno (solo como respaldo visual)
const estadoDesdeUrl = (status) => {
    if (status === 'approved') return 'pendiente' // se confirma con el servidor antes de darlo por pagado
    if (status === 'pending' || status === 'in_process') return 'pendiente'
    return 'rechazado'
}

const MENSAJES = {
    aprobado: {
        titulo: '¡Pago aprobado!',
        texto: 'Recibimos tu pago. Ya estamos preparando tu pedido.'
    },
    pendiente: {
        titulo: 'Pago en proceso',
        texto: 'Tu pago está siendo procesado por Mercado Pago. Te avisaremos cuando se confirme.'
    },
    revision: {
        titulo: 'Pago en revisión',
        texto: 'Estamos verificando tu pago. Nos pondremos en contacto contigo.'
    },
    rechazado: {
        titulo: 'No se completó el pago',
        texto: 'Tu pago no fue procesado. Puedes coordinarlo directamente con nosotros por WhatsApp.'
    },
    reembolsado: {
        titulo: 'Pago reembolsado',
        texto: 'Este pago fue devuelto. Si tienes dudas, escríbenos por WhatsApp.'
    }
}

function PagoResultado() {
    const params = useSearchParams()
    const pagoId = params.get('payment_id') || params.get('collection_id')
    const pagoIdValido = /^\d{1,20}$/.test(pagoId || '')
    const pedidoUrl = params.get('external_reference')

    const [resultado, setResultado] = useState(null)
    const [verificando, setVerificando] = useState(pagoIdValido)

    useEffect(() => {
        if (!pagoIdValido) return
        let activo = true
        fetch('/api/pedidos/pago/confirmar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pagoId })
        })
            .then(res => (res.ok ? res.json() : null))
            .then(data => { if (activo && data) setResultado(data) })
            .catch(() => { })
            .finally(() => { if (activo) setVerificando(false) })
        return () => { activo = false }
    }, [pagoId, pagoIdValido])

    const estadoPago = resultado?.estadoPago || estadoDesdeUrl(params.get('status') || params.get('collection_status'))
    const pedidoId = resultado?.pedidoId || (/^\d+$/.test(pedidoUrl || '') ? pedidoUrl : null)
    const mensaje = MENSAJES[estadoPago] || MENSAJES.pendiente

    const urlWhatsApp = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(
        `Hola, quiero coordinar el pago de mi pedido${pedidoId ? ` #${pedidoId}` : ''}.`
    )}`

    return (
        <div className="carrito-pagina">
            <Cabecera />
            <div className="carrito-page">
                <div className="carrito-vacio" style={{ marginTop: '50px' }}>
                    {verificando ? (
                        <p>Verificando tu pago...</p>
                    ) : (
                        <>
                            <h2>{mensaje.titulo}</h2>
                            {pedidoId && <p>Pedido <strong>#{pedidoId}</strong></p>}
                            <p>{mensaje.texto}</p>
                            <br />
                            {(estadoPago === 'rechazado' || estadoPago === 'reembolsado' || estadoPago === 'revision') && (
                                <a href={urlWhatsApp} target="_blank" rel="noopener noreferrer" className="btn-checkout"
                                    style={{ display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box', maxWidth: '320px', margin: '0 auto 12px' }}>
                                    Coordinar por WhatsApp
                                </a>
                            )}
                            <Link href="/Lentes" className="btn-seguir-comprando">
                                Volver a la tienda
                            </Link>
                        </>
                    )}
                </div>
            </div>
            <PiePagina />
        </div>
    )
}

export default PagoResultado
