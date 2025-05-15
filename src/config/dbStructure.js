/*
 * Struktura bazy danych Firebase dla aplikacji kucharskiej
 * 
 * Główne kolekcje:
 * 1. users - dane użytkowników
 * 2. recipes - przepisy
 * 3. categories - kategorie przepisów
 * 4. reviews - oceny i komentarze
 */

// Przykładowa struktura dokumentu użytkownika (kolekcja 'users')
const userStructure = {
  uid: "string", // ID użytkownika (z Firebase Authentication)
  email: "string", // Adres email użytkownika
  displayName: "string", // Nazwa wyświetlana
  photoURL: "string | null", // URL zdjęcia profilowego (opcjonalne)
  bio: "string | null", // Krótki opis (opcjonalne)
  createdAt: "timestamp", // Data utworzenia konta
  favoriteRecipes: ["string"], // Lista ID ulubionych przepisów
  myRecipes: ["string"], // Lista ID przepisów utworzonych przez użytkownika
};

// Przykładowa struktura dokumentu przepisu (kolekcja 'recipes')
const recipeStructure = {
  title: "string", // Tytuł przepisu
  description: "string", // Krótki opis
  ingredients: ["string"], // Lista składników jako teksty
  instructions: ["string"], // Kroki przygotowania jako teksty
  prepTime: "number", // Czas przygotowania w minutach
  cookTime: "number", // Czas gotowania w minutach
  servings: "number", // Liczba porcji
  difficulty: "string", // Poziom trudności (Łatwy, Średni, Trudny)
  imageURL: "string | null", // URL głównego zdjęcia przepisu
  additionalImages: ["string"], // Lista URL dodatkowych zdjęć
  authorId: "string", // ID użytkownika, który dodał przepis
  authorName: "string", // Nazwa użytkownika
  createdAt: "timestamp", // Data utworzenia przepisu
  updatedAt: "timestamp", // Data ostatniej aktualizacji
  categories: ["string"], // Lista ID kategorii
  avgRating: "number", // Średnia ocena (1-5)
  ratingCount: "number", // Liczba ocen
  isPublic: "boolean", // Czy przepis jest publiczny
};

// Przykładowa struktura dokumentu kategorii (kolekcja 'categories')
const categoryStructure = {
  name: "string", // Nazwa kategorii
  description: "string", // Opis kategorii
  imageURL: "string | null", // URL zdjęcia kategorii
};

// Przykładowa struktura dokumentu oceny/komentarza (kolekcja 'reviews')
const reviewStructure = {
  recipeId: "string", // ID przepisu
  userId: "string", // ID użytkownika
  userName: "string", // Nazwa użytkownika
  rating: "number", // Ocena (1-5)
  comment: "string", // Treść komentarza
  createdAt: "timestamp", // Data utworzenia
  updatedAt: "timestamp", // Data aktualizacji
};

// Relacje między kolekcjami i sposób pobierania danych
/*
 * Pobieranie przepisów użytkownika:
 * - Najpierw pobieramy dokument użytkownika z kolekcji 'users' po jego ID
 * - Następnie pobieramy wszystkie dokumenty z kolekcji 'recipes' gdzie authorId = ID użytkownika
 * 
 * Pobieranie ulubionych przepisów:
 * - Pobieramy dokument użytkownika z kolekcji 'users'
 * - Wykorzystujemy listę favoriteRecipes do pobrania dokumentów z kolekcji 'recipes'
 * 
 * Pobieranie ocen dla przepisu:
 * - Pobieramy wszystkie dokumenty z kolekcji 'reviews' gdzie recipeId = ID przepisu
 * 
 * Pobieranie przepisów z danej kategorii:
 * - Pobieramy wszystkie dokumenty z kolekcji 'recipes' gdzie categories zawiera ID kategorii
 */

export { userStructure, recipeStructure, categoryStructure, reviewStructure }; 