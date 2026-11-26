'use client';

import { useEffect, useState } from 'react';

/**
 * useState sincronizado con localStorage, compatible con SSR.
 * El servidor y el primer render del cliente usan `valorInicial` (mismo HTML → sin
 * error de hidratación); lo guardado se carga justo después de montar.
 */
export function useEstadoPersistente(clave, valorInicial) {
    const [valor, setValor] = useState(valorInicial);
    // Estado (no ref): con el doble montaje de StrictMode el guardado no se adelanta a la carga
    const [cargado, setCargado] = useState(false);

    // Guardar cada cambio, solo después de haber cargado lo guardado
    useEffect(() => {
        if (!cargado) return;
        try {
            localStorage.setItem(clave, JSON.stringify(valor));
        } catch {
            // almacenamiento no disponible (modo privado estricto)
        }
    }, [clave, valor, cargado]);

    // Cargar lo guardado tras montar (localStorage no existe en el servidor)
    useEffect(() => {
        try {
            const guardado = localStorage.getItem(clave);
            // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con un sistema externo tras la hidratación
            if (guardado) setValor(JSON.parse(guardado));
        } catch {
            // dato corrupto o almacenamiento no disponible: se mantiene el valor inicial
        }
        setCargado(true);
    }, [clave]);

    return [valor, setValor];
}
