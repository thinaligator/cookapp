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
    console.log(`Rozpoczynam upload obrazu. URI: ${uri}, ścieżka: ${path}, nazwa pliku: ${filename}`);
    
    // Sprawdź konfigurację Firebase Storage
    console.log('Firebase Storage config:', JSON.stringify({
      storageBucket: storage._bucket ? storage._bucket.bucket : 'Nie znaleziono bucketa'
    }));
    
    // Optymalizacja obrazu przed przesłaniem
    const optimizedUri = await optimizeImage(uri);
    console.log('Zoptymalizowano obraz, nowe URI:', optimizedUri);
    
    // Pobranie danych obrazu jako blob
    const response = await fetch(optimizedUri);
    if (!response.ok) {
      throw new Error(`Błąd podczas pobierania obrazu: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(`Utworzono blob o rozmiarze: ${blob.size} bajtów`);
    
    // Utworzenie referencji do miejsca przechowywania w Firebase Storage
    const storagePath = `${path}${filename}`;
    console.log(`Tworzę referencję do Firebase Storage: ${storagePath}`);
    const storageRef = ref(storage, storagePath);
    
    // Przesłanie pliku
    console.log('Rozpoczynam przesyłanie pliku...');
    const snapshot = await uploadBytes(storageRef, blob);
    console.log('Przesłano zdjęcie!', snapshot);
    
    // Pobranie URL do przesłanego pliku
    console.log('Pobieram URL do przesłanego pliku...');
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('URL do pobrania obrazu:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Błąd podczas przesyłania obrazu:', error);
    console.error('Stack trace:', error.stack);
    
    // Wypisz szczegóły błędu Firebase jeśli dostępne
    if (error.code) {
      console.error('Kod błędu Firebase:', error.code);
    }
    if (error.message) {
      console.error('Komunikat błędu:', error.message);
    }
    if (error.serverResponse) {
      console.error('Odpowiedź serwera:', error.serverResponse);
    }
    
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