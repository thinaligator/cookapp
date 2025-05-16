import { auth } from '../config/firebase';
import { createUser } from './userService';

// W tym pliku będziemy używać firebase/auth, ale na razie jest to tylko szkielet
// Faktyczna implementacja będzie możliwa po rozwiązaniu problemów z inicjalizacją auth

// Ponieważ mamy problem z komponentem auth, funkcje zwracają tylko placeholder
// Te funkcje będą musiały być odpowiednio zaktualizowane po prawidłowej inicjalizacji Firebase Auth

// Rejestracja nowego użytkownika
export const registerWithEmail = async (email, password, displayName) => {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Aktualizacja profilu użytkownika
    await user.updateProfile({ displayName });
    
    // Tworzenie dodatkowych danych użytkownika w Firestore
    await createUser(user.uid, { email, displayName });
    
    return { success: true, user };
  } catch (error) {
    console.error('Błąd podczas rejestracji:', error);
    return { success: false, error: error.message };
  }
};

// Logowanie użytkownika
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Błąd podczas logowania:', error);
    return { success: false, error: error.message };
  }
};

// Wylogowywanie użytkownika
export const logout = async () => {
  try {
    console.log("Wywołanie funkcji logout");
    console.log("Stan auth przed wylogowaniem:", auth.currentUser?.email || "brak zalogowanego użytkownika");
    
    await auth.signOut();
    console.log("Wylogowanie zakończone, aktualny użytkownik:", auth.currentUser?.email || "brak użytkownika");
    
    return { success: true };
  } catch (error) {
    console.error('Błąd podczas wylogowania:', error);
    return { success: false, error: error.message };
  }
};

// Resetowanie hasła
export const resetPassword = async (email) => {
  try {
    await auth.sendPasswordResetEmail(email);
    return { success: true };
  } catch (error) {
    console.error('Błąd podczas resetowania hasła:', error);
    return { success: false, error: error.message };
  }
};

// Aktualizacja adresu email
export const updateUserEmail = async (newEmail) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await user.updateEmail(newEmail);
      return { success: true };
    }
    return { success: false, error: 'Użytkownik nie jest zalogowany' };
  } catch (error) {
    console.error('Błąd podczas aktualizacji email:', error);
    return { success: false, error: error.message };
  }
};

// Aktualizacja hasła
export const updateUserPassword = async (newPassword) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await user.updatePassword(newPassword);
      return { success: true };
    }
    return { success: false, error: 'Użytkownik nie jest zalogowany' };
  } catch (error) {
    console.error('Błąd podczas aktualizacji hasła:', error);
    return { success: false, error: error.message };
  }
};

// Usuwanie konta użytkownika
export const deleteUserAccount = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      await user.delete();
      return { success: true };
    }
    return { success: false, error: 'Użytkownik nie jest zalogowany' };
  } catch (error) {
    console.error('Błąd podczas usuwania konta:', error);
    return { success: false, error: error.message };
  }
};

// Pobranie aktualnego użytkownika
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Nasłuchiwanie na zmiany stanu uwierzytelnienia
export const subscribeToAuthChanges = (callback) => {
  return auth.onAuthStateChanged(callback);
}; 