import { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
};

// Helper para abstraer fetch y evitar duplicación
const fetchApi = async (endpoint, options = {}) => {
    const response = await fetch(`/api/usuarios${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        credentials: 'include',
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
        throw new Error(data?.error || 'Error en la petición');
    }

    return { response, data };
};

export const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [usuario, setUsuario] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            try {
                // Intento inicial
                const { response, data } = await fetchApi('/me').catch(() => ({ response: { ok: false } }));
                
                if (response?.ok) {
                    setUsuario(data.usuario);
                    return;
                }

                // Intento de refresco
                const refreshRes = await fetchApi('/refresh', { method: 'POST' }).catch(() => ({ response: { ok: false } }));
                if (refreshRes.response?.ok) {
                    const retryRes = await fetchApi('/me').catch(() => ({ response: { ok: false } }));
                    if (retryRes.response?.ok) {
                        setUsuario(retryRes.data.usuario);
                    }
                }
            } catch (error) {
                console.error("Error validando sesión:", error);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = useCallback(async (email, password) => {
        const { data } = await fetchApi('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        setUsuario(data.usuario);
        return data;
    }, []);

    const registro = useCallback(async (nombre, email, password) => {
        const { data } = await fetchApi('/registro', {
            method: 'POST',
            body: JSON.stringify({ nombre, email, password })
        });
        return data;
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetchApi('/logout', { method: 'POST' });
        } catch (e) {
            console.error("Error al cerrar sesión:", e);
        } finally {
            setUsuario(null);
        }
    }, []);

    const actualizarPerfil = useCallback(async (datosPerfil) => {
        const { data } = await fetchApi('/perfil', {
            method: 'PUT',
            body: JSON.stringify(datosPerfil)
        });
        setUsuario(data.usuario);
        return data;
    }, []);

    const value = useMemo(() => ({
        usuario,
        isLoading,
        login,
        registro,
        logout,
        actualizarPerfil
    }), [usuario, isLoading, login, registro, logout, actualizarPerfil]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
