import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  serverTimestamp 
} from 'firebase/firestore';

// Nazwa kolekcji w Firestore
const USERS_COLLECTION = 'users';

// Tworzenie nowego użytkownika w bazie danych po rejestracji
export const createUser = async (uid, userData) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    
    // Podstawowe dane użytkownika
    const newUser = {
      uid,
      email: userData.email,
      displayName: userData.displayName || userData.email.split('@')[0],
      photoURL: userData.photoURL || null,
      bio: null,
      createdAt: serverTimestamp(),
      favoriteRecipes: [],
      myRecipes: [],
    };
    
    await setDoc(userRef, newUser);
    return true;
  } catch (error) {
    console.error('Błąd podczas tworzenia użytkownika:', error);
    return false;
  }
};

// Pobieranie danych użytkownika
export const getUserData = async (uid) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    } else {
      console.log('Użytkownik nie istnieje w bazie danych');
      return null;
    }
  } catch (error) {
    console.error('Błąd podczas pobierania danych użytkownika:', error);
    return null;
  }
};

// Aktualizacja danych użytkownika
export const updateUserProfile = async (uid, userData) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, userData);
    return true;
  } catch (error) {
    console.error('Błąd podczas aktualizacji danych użytkownika:', error);
    return false;
  }
};

// Dodawanie przepisu do ulubionych
export const addToFavorites = async (uid, recipeId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      favoriteRecipes: arrayUnion(recipeId)
    });
    return true;
  } catch (error) {
    console.error('Błąd podczas dodawania do ulubionych:', error);
    return false;
  }
};

// Usuwanie przepisu z ulubionych
export const removeFromFavorites = async (uid, recipeId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      favoriteRecipes: arrayRemove(recipeId)
    });
    return true;
  } catch (error) {
    console.error('Błąd podczas usuwania z ulubionych:', error);
    return false;
  }
};

// Dodawanie przepisu do listy moich przepisów
export const addToMyRecipes = async (uid, recipeId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      myRecipes: arrayUnion(recipeId)
    });
    return true;
  } catch (error) {
    console.error('Błąd podczas dodawania do moich przepisów:', error);
    return false;
  }
};

// Sprawdzenie czy przepis jest w ulubionych
export const isRecipeFavorite = async (uid, recipeId) => {
  try {
    const userData = await getUserData(uid);
    if (userData && userData.favoriteRecipes) {
      return userData.favoriteRecipes.includes(recipeId);
    }
    return false;
  } catch (error) {
    console.error('Błąd podczas sprawdzania ulubionych:', error);
    return false;
  }
}; 

// Pobieranie listy ID ulubionych przepisów użytkownika
export const getUserFavoriteIds = async (uid) => {
  try {
    const userData = await getUserData(uid);
    if (userData && userData.favoriteRecipes) {
      return userData.favoriteRecipes;
    }
    return [];
  } catch (error) {
    console.error('Błąd podczas pobierania ID ulubionych przepisów:', error);
    return [];
  }
}; 

// Pobieranie preferencji żywieniowych użytkownika
export const getUserDietaryPreferences = async (uid) => {
  try {
    const userData = await getUserData(uid);
    if (userData && userData.dietaryPreferences) {
      return userData.dietaryPreferences;
    }
    return [];
  } catch (error) {
    console.error('Błąd podczas pobierania preferencji żywieniowych:', error);
    return [];
  }
};

// Aktualizacja preferencji żywieniowych użytkownika
export const updateDietaryPreferences = async (uid, preferences) => {
  try {
    console.log(`Aktualizacja preferencji żywieniowych dla użytkownika ${uid}: ${JSON.stringify(preferences)}`);
    const userRef = doc(db, USERS_COLLECTION, uid);
    
    // Upewniamy się, że preferencje są tablicą
    const validPreferences = Array.isArray(preferences) ? preferences : [];
    
    await updateDoc(userRef, {
      dietaryPreferences: validPreferences
    });
    
    console.log('Preferencje żywieniowe zaktualizowane pomyślnie');
    return true;
  } catch (error) {
    console.error('Błąd podczas aktualizacji preferencji żywieniowych:', error);
    throw error; // Rzucamy błąd, aby móc go obsłużyć w komponencie
  }
};