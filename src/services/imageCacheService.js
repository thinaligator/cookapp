import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Katalog na cachowane zdjęcia
const IMAGE_CACHE_DIRECTORY = `${FileSystem.cacheDirectory}images/`;

// Utwórz katalog cache jeśli nie istnieje
const setupCacheDirectory = async () => {
  const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIRECTORY, {
      intermediates: true
    });
  }
};

// Funkcja generująca nazwę pliku cache na podstawie URL
const getCacheFileName = (url) => {
  // Tworzymy hash z URL, aby używać go jako nazwy pliku
  let filename = url.substring(url.lastIndexOf('/') + 1);
  
  // Jeśli URL nie ma konkretnej nazwy pliku, generujemy hash
  if (!filename || filename.indexOf('?') === 0) {
    const hash = url.split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0) | 0;
    }, 0);
    filename = `image_${Math.abs(hash)}`;
  }
  
  // Usuwamy znaki zapytania z URL
  const queryIndex = filename.indexOf('?');
  if (queryIndex !== -1) {
    filename = filename.substring(0, queryIndex);
  }
  
  return `${IMAGE_CACHE_DIRECTORY}${filename}`;
};

// Główna funkcja do pobierania zdjęcia z cache lub z sieci
export const getCachedImage = async (url) => {
  try {
    // Jeśli nie mamy URL, zwracamy null
    if (!url) {
      return null;
    }
    
    // Jeśli jesteśmy na webie, zwracamy oryginalny URL
    if (Platform.OS === 'web') {
      return url;
    }
    
    // Upewnij się, że katalog cache istnieje
    await setupCacheDirectory();
    
    // Generuj nazwę pliku dla cache
    const cacheFilePath = getCacheFileName(url);
    
    // Sprawdź, czy plik istnieje w cache
    const cacheFileInfo = await FileSystem.getInfoAsync(cacheFilePath);
    
    if (cacheFileInfo.exists) {
      // Zwróć URL do pliku w cache
      return cacheFilePath;
    }
    
    // Pobierz plik z internetu i zapisz w cache
    console.log(`Pobieranie i cachowanie obrazu: ${url}`);
    const downloadResult = await FileSystem.downloadAsync(url, cacheFilePath);
    
    if (downloadResult.status === 200) {
      return cacheFilePath;
    }
    
    // Jeśli pobranie nie powiodło się, zwróć oryginalny URL
    return url;
  } catch (error) {
    console.error('Błąd podczas cachowania obrazu:', error);
    // W przypadku błędu, zwróć oryginalny URL
    return url;
  }
};

// Funkcja czyszcząca cache zdjęć
export const clearImageCache = async () => {
  try {
    const cacheInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIRECTORY);
    if (cacheInfo.exists) {
      await FileSystem.deleteAsync(IMAGE_CACHE_DIRECTORY);
      console.log('Cache zdjęć wyczyszczony');
    }
    await setupCacheDirectory();
  } catch (error) {
    console.error('Błąd podczas czyszczenia cache zdjęć:', error);
  }
};

// Funkcja do przechowywania już załadowanych zdjęć w pamięci
const memoryCache = new Map();

// Funkcja do pobierania zdjęcia z pamięci cache lub z dysku
export const getImageFromCache = async (url) => {
  if (!url) return null;
  
  // Najpierw sprawdź cache w pamięci
  if (memoryCache.has(url)) {
    return memoryCache.get(url);
  }
  
  // Jeśli nie ma w pamięci, sprawdź na dysku
  const cachedImage = await getCachedImage(url);
  
  // Zapisz w pamięci dla szybszego dostępu w przyszłości
  if (cachedImage) {
    memoryCache.set(url, cachedImage);
  }
  
  return cachedImage;
};

// Limit rozmiaru pamięci cache (w MB)
const MAX_MEMORY_CACHE_SIZE_MB = 50;

// Funkcja do czyszczenia pamięci cache, gdy staje się zbyt duża
export const cleanupMemoryCache = () => {
  // Jeśli cache jest mały, nie rób nic
  if (memoryCache.size < 20) return;
  
  // Usuń 25% najstarszych wpisów
  const entriesToRemove = Math.floor(memoryCache.size * 0.25);
  const entries = Array.from(memoryCache.entries());
  
  for (let i = 0; i < entriesToRemove; i++) {
    const [key] = entries[i];
    memoryCache.delete(key);
  }
  
  console.log(`Wyczyszczono ${entriesToRemove} wpisów z pamięci cache`);
}; 