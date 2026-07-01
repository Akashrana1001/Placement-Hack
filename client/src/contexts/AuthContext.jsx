import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('pp_token');
      const storedUser = localStorage.getItem('pp_user');
      
      if (token && storedUser) {
        try {
          await api.get('/health'); // verify token via interceptor
          setUser(JSON.parse(storedUser));
          connectSocket(token);
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };
    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: userData } = res.data.data;
    localStorage.setItem('pp_token', token);
    localStorage.setItem('pp_user', JSON.stringify(userData));
    setUser(userData);
    connectSocket(token);
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    const { token, user: userData } = res.data.data;
    localStorage.setItem('pp_token', token);
    localStorage.setItem('pp_user', JSON.stringify(userData));
    setUser(userData);
    connectSocket(token);
  };

  const logout = () => {
    localStorage.removeItem('pp_token');
    localStorage.removeItem('pp_user');
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};