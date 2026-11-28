import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from './ToastContext';
import { CarritoProvider, useCarrito } from './CarritoContext';
import { FavoritosProvider, useFavoritos } from './FavoritosContext';

// Reglas de negocio del carrito: nunca superar el stock, cantidad mínima 1 y persistencia local.
const gafa = { id: 1, name: 'Gafa Negra', price: 120, stock: 2 };
const agotada = { id: 2, name: 'Gafa Agotada', price: 90, stock: 0 };

const Carrito = () => {
    const { carrito, agregarAlCarrito, eliminarDelCarrito, incrementarCantidad, decrementarCantidad, vaciarCarrito } = useCarrito();
    const { toggleFavorito, listaFavoritos } = useFavoritos();
    return (
        <div>
            <button onClick={() => agregarAlCarrito(gafa)}>agregar</button>
            <button onClick={() => agregarAlCarrito(agotada)}>agregar-agotada</button>
            <button onClick={() => incrementarCantidad(gafa.id)}>mas</button>
            <button onClick={() => decrementarCantidad(gafa.id)}>menos</button>
            <button onClick={() => eliminarDelCarrito(gafa.id)}>eliminar</button>
            <button onClick={vaciarCarrito}>vaciar</button>
            <button onClick={() => toggleFavorito(gafa)}>favorito</button>
            <ul>
                {carrito.map(p => <li key={p.id} data-testid={`item-${p.id}`}>{p.name} x{p.quantity}</li>)}
            </ul>
            <span data-testid="favoritos">{listaFavoritos.length}</span>
        </div>
    );
};

const renderCarrito = () => render(
    <ToastProvider>
        <FavoritosProvider>
            <CarritoProvider>
                <Carrito />
            </CarritoProvider>
        </FavoritosProvider>
    </ToastProvider>
);

const click = (nombre) => fireEvent.click(screen.getByText(nombre));

describe('Flujo del carrito', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('agrega un producto y acumula cantidad sin superar el stock', () => {
        renderCarrito();
        click('agregar');
        expect(screen.getByTestId('item-1')).toHaveTextContent('Gafa Negra x1');
        expect(screen.getByText('Producto añadido al carrito')).toBeInTheDocument();

        click('agregar');
        expect(screen.getByTestId('item-1')).toHaveTextContent('x2');

        click('agregar'); // stock = 2
        expect(screen.getByTestId('item-1')).toHaveTextContent('x2');
        expect(screen.getByText('No hay más stock disponible')).toBeInTheDocument();
    });

    it('no agrega productos sin stock', () => {
        renderCarrito();
        click('agregar-agotada');
        expect(screen.queryByTestId('item-2')).not.toBeInTheDocument();
        expect(screen.getByText('No hay más stock disponible')).toBeInTheDocument();
    });

    it('incrementar respeta el stock y decrementar no baja de 1', () => {
        renderCarrito();
        click('agregar');
        click('mas');
        click('mas'); // tope de stock
        expect(screen.getByTestId('item-1')).toHaveTextContent('x2');

        click('menos');
        click('menos');
        click('menos');
        expect(screen.getByTestId('item-1')).toHaveTextContent('x1');
    });

    it('eliminar y vaciar quitan los productos', () => {
        renderCarrito();
        click('agregar');
        click('eliminar');
        expect(screen.queryByTestId('item-1')).not.toBeInTheDocument();

        click('agregar');
        click('vaciar');
        expect(screen.queryByTestId('item-1')).not.toBeInTheDocument();
    });

    it('persiste el carrito en localStorage y lo recupera al recargar', () => {
        const { unmount } = renderCarrito();
        click('agregar');
        click('agregar');
        expect(JSON.parse(localStorage.getItem('carrito-lecco'))[0]).toMatchObject({ id: 1, quantity: 2 });

        unmount();
        renderCarrito();
        expect(screen.getByTestId('item-1')).toHaveTextContent('Gafa Negra x2');
    });
});

describe('Favoritos', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('el aviso muestra el nombre del producto del catálogo (campo `name`)', () => {
        renderCarrito();
        click('favorito');
        expect(screen.getByText('"Gafa Negra" guardado en favoritos')).toBeInTheDocument();
        expect(screen.getByTestId('favoritos')).toHaveTextContent('1');

        click('favorito');
        expect(screen.getByText('"Gafa Negra" eliminado de favoritos')).toBeInTheDocument();
        expect(screen.getByTestId('favoritos')).toHaveTextContent('0');
    });

    it('al guardar, quitar y volver a guardar el mismo producto, cada aviso coincide con la acción', () => {
        renderCarrito();
        const avisos = () => screen.getAllByText(/favoritos$/).map(n => n.textContent);

        click('favorito'); // guardar
        click('favorito'); // quitar
        click('favorito'); // volver a guardar
        click('favorito'); // volver a quitar

        expect(avisos()).toEqual([
            '"Gafa Negra" guardado en favoritos',
            '"Gafa Negra" eliminado de favoritos',
            '"Gafa Negra" guardado en favoritos',
            '"Gafa Negra" eliminado de favoritos'
        ]);
        expect(screen.getByTestId('favoritos')).toHaveTextContent('0');
    });
});
