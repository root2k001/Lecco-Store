import { useState, useEffect, useMemo } from 'react';


import './Productos.css'

const ProductosList = () => {
    const [productos, setProductos] = useState([])
    const [filtros, setFiltros] = useState({
        hombre: false,
        mujer: false,
        unisex: false
    })
    const [orden, setOrden] = useState('relevante')


    // actualiza los datos (productos) al cargar  el componente 
    useEffect(() => {
        fetch('/data.json') //LLAMDA AL FETCH 
            .then((response) => response.json()) //CONVIERTE A JSON
            .then((data) => setProductos(data)) // CON SETPRODUCTOS GUARDA LA DATA EN Productos
            .catch((err) => console.error('Error cargando productos:', err))
    }, [])

    const handleFiltroChange = (genero) => {
        setFiltros(prev => ({
            ...prev,  // copia del estado de los filtros antes de marcarse  
            [genero]: !prev[genero]     
        }))
    }
            /**
             * recibe el parametro genero  que  depende del checkbox marcado ,
             * prev = el estado anterior de los filtros antes de marcarse ,
             * [genero] propiedad computarizada , que utiliza !prev como interruptor para cambiar su valor a lo contrario
             * que seria true o false dependiente de su valor en la copia de estado 
             */


    const handleOrdenChange = (e) => {
        setOrden(e.target.value)
    }   //camputa el valor del menu desplegable  "select" actualizando el valor en la variable orden




    // use memo se utiliza para optimizar calcuos
    //  FILTRADO Y ORDENAMIENTO (cerebro) : memoriza el resultado del filtrado 
    const productosFiltrados = useMemo(() => {
        let resultado = [...productos]   //copia del array para no modificar el original 

        const generosSeleccionados = Object.keys(filtros).filter(key => filtros[key])  
        
        /*
        
        Convierte en objeto las claves de los filtros ,con filter() recorres el arreglo "filtros"
        y retorna solo las llaves que tengan valor "true" , guardandolas y actualizando en la constante
        generosSeleccionados 
          y la funcion callback "key => filtros[key]" retorna

        */

        
        if (generosSeleccionados.length > 0) {
            resultado = resultado.filter(producto => 
                generosSeleccionados.includes(producto.gender)
            )
        }
        /**
         * un if que  actualiza  el valor de resultado ; que es una copia del array productos;
         * filtrando los valores verdaderos en donde toma de referencia a la constante 
         * generosSelecionados y valida si  incluye el valor de cada producto filtrado ; si no
         * determina que ningun producto.gender coincide  con valores en su arreglo entonces
         * no se actualiza el arreglo resultado 
         */


        //sort retorna -1 si el primer argumente es menor ,0 si son iguales , +1 si el primer argumento es mayor 
        //sort es mulativo , cambia el array original 
        //nunca debemos modificar el estado original directamente (principio de inmutabilidad)
        if (orden === 'menor_mayor') {
            resultado = [...resultado].sort((a, b) => a.price - b.price)
        } else if (orden === 'mayor_menor') {
            resultado = [...resultado].sort((a, b) => b.price - a.price)
        }
            /**
             * este if lo que realiza es que cuando marcamos la opcion ya sea "mayor_menor" o
             * "menor_mayor"  hara un calculo donde  crea una copia del arreglo resultado y 
             * evalua los productos a, b   donde si la condicion del resultado es negativo
             * coloca a A antes que B y si es positvo coloca a b antes que A 
             */



        return resultado
    }, [filtros, orden, productos])

    
    return (
        <section className='contenido'>
            <aside className='filtros'>
                <h2>Filtros</h2>
                <div className='filtros-categoria' id='filtro-categoria'>
                    <h3>Género</h3>
                    <label>
                        <input 
                            type='checkbox' 
                            checked={filtros.hombre}    
                            onChange={() => handleFiltroChange('hombre')}

                            /**
                             *  checked :
                                el estado del checkbox depende de la propiedad hombre 
                                dentro del objeto filtros si estrue el checbox aparecera marcado 
                                si es false lo contrario ,
                                onchange : 
                                propiedad al darle click al checkbox ejecuta la funcion handleFiltroChange(String parametro)
                            * */
                        />
                        <span>Para Él</span>
                    </label>
                    <label>
                        <input 
                            type='checkbox'
                            checked={filtros.mujer}
                            onChange={() => handleFiltroChange('mujer')}
                        />
                        <span>Para Ella</span>
                    </label>
                    <label>
                        <input 
                            type='checkbox'
                            checked={filtros.unisex}
                            onChange={() => handleFiltroChange('unisex')}
                        />
                        <span>Unisex</span>
                    </label>
                </div>
            </aside>

            <main className='collections'>      
                <h2>TODAS LAS COLECCIONES</h2>
                <div className="ordenar">
                    <label id='ordenar-categoria'>
                        Ordenar por:
                        <select value={orden} onChange={handleOrdenChange}>
                            <option value="relevante">Relevante</option>
                            <option value="menor_mayor">Precio: Menor a Mayor</option>
                            <option value="mayor_menor">Precio: Mayor a Menor</option>
                        </select>
                    </label>
                </div>

                <div className="productos" id='productos'>
                    {productosFiltrados.length === 0 ? (
                        <p className="no-resultados">No se encontraron productos</p>
                    ) : (
                        productosFiltrados.map((producto) => (
                            <div className='producto-carta' key={producto.id} >
                                <div className='producto-imagen'>
                                    {producto.img && producto.img !== 'en proceso' ?   
                                        <img src={producto.img} alt={producto.name} /> : 
                                        <div className='imagen-placeholder'>👓</div>
                                    }
                                </div>
                                <span className='genero-tag'>{producto.gender}</span>
                                <h3>{producto.name}</h3>
                                <p className='precio'>{producto.price}</p>
                                <button className='btn-carrito'>Añadir al Carrito</button>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </section>
    )
}

export default ProductosList;
