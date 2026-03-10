import {  Routes,Route  } from 'react-router-dom'

import Inicio from './ComponentesPagInicio/Inicio'
import Coleccion from './ComponentePagPrincipal/Coleccion'




function App() {
  return (

  
    //AQUI DECLARAMOS LAS RUTAS 
      <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/Coleccion" element={<Coleccion />} />
      </Routes>
    
  
  )
}

export default App
