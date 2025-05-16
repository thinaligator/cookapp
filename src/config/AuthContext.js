import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tworzenie kontekstu uwierzytelniania
const AuthContext = createContext(null);

// Hook do łatwiejszego dostępu do kontekstu uwierzytelniania
export const useAuth = () => useContext(AuthContext);

// Dostawca kontekstu uwierzytelniania
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Nasłuchiwanie na zmiany stanu uwierzytelnienia
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Jeśli jest zalogowany użytkownik, zapisujemy jego podstawowe dane
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
        
        // Zapisujemy dane sesji w AsyncStorage
        try {
          await AsyncStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          }));
        } catch (error) {
          console.error('Błąd podczas zapisywania sesji:', error);
        }
      } else {
        // Brak zalogowanego użytkownika
        setCurrentUser(null);
        // Usuwamy dane sesji
        try {
          await AsyncStorage.removeItem('user');
        } catch (error) {
          console.error('Błąd podczas usuwania sesji:', error);
        }
      }
      setLoading(false);
    });

    // Sprawdzenie, czy jest zapisana sesja
    const checkSavedSession = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        if (savedUser && !currentUser) {
          // Jeśli jest zapisana sesja, ale nie jest zalogowany użytkownik w Firebase
          // To tylko tymczasowe dane, Firebase Auth i tak sprawdzi stan uwierzytelnienia
          setCurrentUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('Błąd podczas odczytu sesji:', error);
      }
    };

    checkSavedSession();

    // Czyszczenie nasłuchiwania przy odmontowywaniu komponentu
    return () => unsubscribe();
  }, []);

  // Wartości udostępniane przez kontekst
  const value = {
    currentUser,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 