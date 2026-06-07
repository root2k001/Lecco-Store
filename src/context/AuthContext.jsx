import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [token, setToken] = useState(null);

    // Cargar sesión guardada al abrir la aplicación
    useEffect(() => {
        const storedUser = localStorage.getItem('lecco_usuario');
        const storedToken = localStorage.getItem('lecco_token');
        if (storedUser && storedToken) {
            setUsuario(JSON.parse(storedUser));
            setToken(storedToken);
        }
    }, []);

    const guardarSesion = (user, jwtToken) => {
        setUsuario(user);
        setToken(jwtToken);
        localStorage.setItem('lecco_usuario', JSON.stringify(user));
        localStorage.setItem('lecco_token', jwtToken);
    };

    const login = async (email, password) => {
        const response = await fetch('http://localhost:3000/api/usuarios/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al iniciar sesión');
        }

        guardarSesion(data.usuario, data.token);
        return data;
    };

    const registro = async (nombre, email, password) => {
        const response = await fetch('http://localhost:3000/api/usuarios/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al registrarse');
        }
        
        return data;
    };

    const logout = () => {
        setUsuario(null);
        setToken(null);
        localStorage.removeItem('lecco_usuario');
        localStorage.removeItem('lecco_token');
    };

    const actualizarPerfil = async (datosPerfil) => {
        const response = await fetch('http://localhost:3000/api/usuarios/perfil', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(datosPerfil)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al actualizar el perfil');
        }
        
        // Actualizar la sesión con el nuevo nombre/email
        guardarSesion(data.usuario, token);
        return data;
    };

    return (
        <AuthContext.Provider value={{ usuario, token, login, registro, logout, actualizarPerfil }}>
            {children}
        </AuthContext.Provider>
    );
};
