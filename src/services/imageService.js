import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Kompresuje i optymalizuje obraz przed przesłaniem
 * @param {string} uri - URI pliku obrazu do optymalizacji
 * @returns {Promise<string>} URI zoptymalizowanego obrazu
 */
export const optimizeImage = async (uri) => {
  try {
    // Pierwsza operacja - zmniejsz wymiary zdjęcia
    const resizedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }], // Ustalamy maksymalną szerokość na 1200px
      { format: ImageManipulator.SaveFormat.JPEG }
    );
    
    // Druga operacja - mocna kompresja dla szybszego przesyłania i ładowania
    const compressedImage = await ImageManipulator.manipulateAsync(
      resizedImage.uri,
      [], // Bez dodatkowych przekształceń
      { 
        compress: 0.6, // Kompresja do 60% jakości
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );
    
    console.log('Zdjęcie zoptymalizowane - oryginał vs kompresja:', {
      oryginalny: uri,
      zoptymalizowany: compressedImage.uri
    });
    
    return compressedImage.uri;
  } catch (error) {
    console.error('Błąd podczas optymalizacji obrazu:', error);
    // W przypadku błędu zwracamy oryginalny URI
    return uri;
  }
};

/**
 * Przesyła obrazek do Firebase Storage i zwraca URL do pobrania
 * @param {string} uri - URI pliku obrazu do przesłania
 * @param {string} path - Ścieżka w Firebase Storage (np. 'recipes/')
 * @param {string} filename - Nazwa pliku (np. ID przepisu + timestamp)
 * @returns {Promise<string>} URL do pobranego obrazu
 */
export const uploadImage = async (uri, path, filename) => {
  try {
    // Optymalizacja obrazu przed przesłaniem
    const optimizedUri = await optimizeImage(uri);
    
    // Pobranie danych obrazu jako blob
    const response = await fetch(optimizedUri);
    const blob = await response.blob();
    
    // Utworzenie referencji do miejsca przechowywania w Firebase Storage
    const storageRef = ref(storage, `${path}${filename}`);
    
    // Przesłanie pliku
    const snapshot = await uploadBytes(storageRef, blob);
    console.log('Przesłano zdjęcie!');
    
    // Pobranie URL do przesłanego pliku
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Błąd podczas przesyłania obrazu:', error);
    throw error;
  }
};

/**
 * Generuje unikalną nazwę pliku dla obrazu
 * @param {string} recipeId - Opcjonalne ID przepisu
 * @returns {string} Unikalna nazwa pliku
 */
export const generateUniqueFilename = (recipeId = null) => {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 10);
  
  if (recipeId) {
    return `${recipeId}_${timestamp}_${randomString}.jpg`;
  }
  
  return `recipe_${timestamp}_${randomString}.jpg`;
}; 