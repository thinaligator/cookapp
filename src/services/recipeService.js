import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';

// Nazwa kolekcji w Firestore
const RECIPES_COLLECTION = 'recipes';

// Pobieranie wszystkich przepisów - uproszczone zapytanie bez sortowania
export const getRecipes = async (limitCount = 20, dietaryPreferences = []) => {
  try {
    // Uproszczone zapytanie bez filtrowania i sortowania
    const recipesCollection = collection(db, RECIPES_COLLECTION);
    const recipesSnapshot = await getDocs(recipesCollection);
    
    let recipes = recipesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filtrujemy przepisy na podstawie preferencji żywieniowych użytkownika
    if (dietaryPreferences && dietaryPreferences.length > 0) {
      recipes = filterRecipesByDietaryPreferences(recipes, dietaryPreferences);
    }
    
    // Sortujemy przepisy według oceny (od najwyższej do najniższej)
    // Przepisy bez oceny (avgRating undefined lub 0) będą na końcu
    return recipes.sort((a, b) => {
      const ratingA = a.avgRating || 0;
      const ratingB = b.avgRating || 0;
      return ratingB - ratingA;
    });
  } catch (error) {
    console.error('Błąd podczas pobierania przepisów:', error);
    return [];
  }
};

// Pobieranie popularnych przepisów - uproszczone
export const getPopularRecipes = async (limitCount = 10) => {
  try {
    // Pobieramy wszystkie i sortujemy lokalnie
    const recipes = await getRecipes();
    return recipes
      .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
      .slice(0, limitCount);
  } catch (error) {
    console.error('Błąd podczas pobierania popularnych przepisów:', error);
    return [];
  }
};

// Pobieranie pojedynczego przepisu po ID
export const getRecipeById = async (recipeId) => {
  try {
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId);
    const recipeDoc = await getDoc(recipeRef);
    
    if (recipeDoc.exists()) {
      const recipeData = recipeDoc.data();
      
      // Normalizacja składników i instrukcji
      let ingredients = recipeData.ingredients || [];
      let instructions = recipeData.instructions || [];
      
      // Upewnij się, że składniki są tablicą
      if (!Array.isArray(ingredients)) {
        if (typeof ingredients === 'string') {
          // Jeśli to string, podziel na linie
          ingredients = ingredients.split('\n').filter(i => i.trim() !== '');
        } else {
          ingredients = [];
        }
      }
      
      // Upewnij się, że instrukcje są tablicą
      if (!Array.isArray(instructions)) {
        if (typeof instructions === 'string') {
          // Jeśli to string, podziel na linie
          instructions = instructions.split('\n').filter(i => i.trim() !== '');
        } else {
          instructions = [];
        }
      }
      
      return {
        id: recipeDoc.id,
        ...recipeData,
        ingredients,
        instructions
      };
    } else {
      console.log('Przepis o podanym ID nie istnieje');
      return null;
    }
  } catch (error) {
    console.error('Błąd podczas pobierania przepisu:', error);
    return null;
  }
};

// Dodawanie nowego przepisu
export const addRecipe = async (recipeData) => {
  try {
    // Upewnij się, że dane są kompletne
    if (!recipeData.title || !recipeData.ingredients || !recipeData.instructions) {
      console.error('Brak wymaganych danych przepisu');
      return null;
    }
    
    // Upewnij się, że tablica tagów istnieje
    const tags = recipeData.tags || [];
    
    // Przygotuj dane do zapisania
    const recipeWithMetadata = {
      ...recipeData,
      tags: tags,
      prepTime: recipeData.prepTime || 0,
      cookTime: recipeData.cookTime || 0,
      servings: recipeData.servings || 0,
      difficulty: recipeData.difficulty || 'Średni',
      authorId: recipeData.authorId || 'anonymous',
      authorName: recipeData.authorName || 'Użytkownik',
      createdAt: recipeData.createdAt || serverTimestamp(),
      updatedAt: recipeData.updatedAt || serverTimestamp(),
      avgRating: 0,
      ratingCount: 0,
      isPublic: true
    };
    
    const recipesCollection = collection(db, RECIPES_COLLECTION);
    const docRef = await addDoc(recipesCollection, recipeWithMetadata);
    
    console.log(`Dodano nowy przepis: ${recipeData.title} (ID: ${docRef.id})`);
    return docRef.id;
  } catch (error) {
    console.error('Błąd podczas dodawania przepisu:', error);
    return null;
  }
};

// Aktualizacja istniejącego przepisu
export const updateRecipe = async (recipeId, recipeData) => {
  try {
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId);
    const updatedData = {
      ...recipeData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(recipeRef, updatedData);
    return true;
  } catch (error) {
    console.error('Błąd podczas aktualizacji przepisu:', error);
    return false;
  }
};

// Aktualizacja tagów przepisu
export const updateRecipeTags = async (recipeId, tags) => {
  try {
    console.log(`Aktualizacja tagów dla przepisu ${recipeId}: ${JSON.stringify(tags)}`);
    
    // Upewnij się, że tags jest tablicą
    if (!Array.isArray(tags)) {
      console.error('Tags musi być tablicą');
      return false;
    }
    
    // Upewnij się, że wszystkie tagi są stringami
    const validTags = tags.filter(tag => typeof tag === 'string' && tag.trim() !== '');
    
    if (validTags.length === 0) {
      console.warn('Brak prawidłowych tagów do zaktualizowania');
      return false;
    }
    
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId);
    
    // Najpierw pobierz aktualny przepis
    const recipeDoc = await getDoc(recipeRef);
    if (!recipeDoc.exists()) {
      console.error(`Nie znaleziono przepisu o ID: ${recipeId}`);
      return false;
    }
    
    // Aktualizuj tylko pole tags
    await updateDoc(recipeRef, {
      tags: validTags
    });
    
    console.log(`Tagi zaktualizowane pomyślnie dla przepisu ${recipeId}`);
    return true;
  } catch (error) {
    console.error('Błąd podczas aktualizacji tagów:', error);
    return false;
  }
};

// Usuwanie przepisu
export const deleteRecipe = async (recipeId) => {
  try {
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId);
    await deleteDoc(recipeRef);
    
    // Tu możemy usunąć ID przepisu z listy "moich przepisów" użytkownika
    // oraz usunąć wszystkie powiązane oceny

    return true;
  } catch (error) {
    console.error('Błąd podczas usuwania przepisu:', error);
    return false;
  }
};

// Pobieranie przepisów danego użytkownika - uproszczone
export const getUserRecipes = async (userId) => {
  try {
    const recipesCollection = collection(db, RECIPES_COLLECTION);
    const recipesSnapshot = await getDocs(recipesCollection);
    
    // Filtrujemy lokalnie zamiast używać złożonych zapytań
    return recipesSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(recipe => recipe.authorId === userId);
  } catch (error) {
    console.error('Błąd podczas pobierania przepisów użytkownika:', error);
    return [];
  }
};

// Filtrowanie przepisów według kategorii
export const getRecipesByCategory = async (category) => {
  try {
    console.log(`Wyszukiwanie przepisów z kategorii: "${category}"`);
    const recipes = await getRecipes();
    
    // Filtrujemy lokalnie
    const filteredRecipes = recipes.filter(recipe => 
      recipe.category && recipe.category.toLowerCase() === category.toLowerCase()
    );
    
    console.log(`Znaleziono ${filteredRecipes.length} przepisów z kategorii "${category}"`);
    return filteredRecipes;
  } catch (error) {
    console.error('Błąd podczas filtrowania przepisów po kategorii:', error);
    return [];
  }
};

// Wyszukiwanie przepisów po tytule - uproszczone
export const searchRecipesByTitle = async (searchTerm) => {
  try {
    const recipes = await getRecipes();
    
    // Filtrujemy lokalnie
    return recipes.filter(recipe => 
      recipe.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    console.error('Błąd podczas wyszukiwania przepisów:', error);
    return [];
  }
};

// Pobieranie przepisów po ID
export const getRecipesByIds = async (recipeIds) => {
  try {
    if (!recipeIds || recipeIds.length === 0) {
      return [];
    }

    const recipesCollection = collection(db, RECIPES_COLLECTION);
    const recipesSnapshot = await getDocs(recipesCollection);
    
    // Filtrujemy lokalnie, aby znaleźć przepisy o podanych ID
    const recipes = recipesSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(recipe => recipeIds.includes(recipe.id));
    
    // Sortujemy przepisy według oceny (od najwyższej do najniższej)
    return recipes.sort((a, b) => {
      const ratingA = a.avgRating || 0;
      const ratingB = b.avgRating || 0;
      return ratingB - ratingA;
    });
  } catch (error) {
    console.error('Błąd podczas pobierania przepisów po ID:', error);
    return [];
  }
};

// Filtrowanie przepisów według tagów - uproszczone
export const getRecipesByTag = async (tag) => {
  try {
    console.log(`===== WYSZUKIWANIE PRZEPISÓW Z TAGIEM "${tag}" =====`);
    const recipes = await getRecipes();
    
    console.log(`Liczba wszystkich przepisów: ${recipes.length}`);
    
    // Sprawdź, jakie typy danych mają tagi dla wszystkich przepisów
    recipes.forEach((recipe, index) => {
      if (index < 5) { // Wyświetl tylko pierwsze 5 dla czytelności logów
        console.log(`Przepis "${recipe.title}" - tagi: ${typeof recipe.tags}, ${Array.isArray(recipe.tags) ? 'jest tablicą' : 'nie jest tablicą'}`);
        if (recipe.tags) {
          console.log(`  Zawartość: ${JSON.stringify(recipe.tags)}`);
        }
      }
    });
    
    // Filtrujemy lokalnie
    const filteredRecipes = recipes.filter(recipe => {
      // Sprawdzamy, czy przepis ma tagi i czy są one tablicą
      if (!recipe.tags || !Array.isArray(recipe.tags)) {
        return false;
      }
      
      // Sprawdzamy, czy tag jest na liście (bez uwzględniania wielkości liter)
      const hasTag = recipe.tags.some(recipeTag => 
        recipeTag.toLowerCase() === tag.toLowerCase()
      );
      
      if (hasTag) {
        console.log(`Przepis "${recipe.title}" ma tag "${tag}"`);
      }
      
      return hasTag;
    });
    
    console.log(`===== ZNALEZIONO ${filteredRecipes.length} PRZEPISÓW Z TAGIEM "${tag}" =====`);
    
    // Wypisz szczegóły znalezionych przepisów
    filteredRecipes.forEach(recipe => {
      console.log(`- ${recipe.title}, tagi: ${recipe.tags ? recipe.tags.join(', ') : 'brak'}`);
    });
    
    return filteredRecipes;
  } catch (error) {
    console.error('Błąd podczas filtrowania przepisów po tagu:', error);
    return [];
  }
};

// Filtrowanie przepisów na podstawie preferencji żywieniowych
export const filterRecipesByDietaryPreferences = (recipes, dietaryPreferences) => {
  if (!dietaryPreferences || dietaryPreferences.length === 0) {
    console.log("Brak preferencji żywieniowych do filtrowania");
    return recipes;
  }
  
  console.log(`Filtrowanie ${recipes.length} przepisów według preferencji: ${dietaryPreferences.join(', ')}`);
  
  // Przygotuj preferencje do prostszego dopasowania
  const cleanedPreferences = dietaryPreferences.map(pref => 
    pref.toLowerCase().trim()
  );
  
  console.log("Przygotowane preferencje do dopasowania:", JSON.stringify(cleanedPreferences));
  
  // Normalizuj tekst do sprawdzania dopasowań (usuń spacje, przyimki, itp.)
  const normalizeText = (text) => {
    let normalized = text.toLowerCase().trim();
    
    // Usuń przyimki
    normalized = normalized.replace(/\s+z\s+/g, ' ');
    normalized = normalized.replace(/\s+w\s+/g, ' ');
    normalized = normalized.replace(/\s+na\s+/g, ' ');
    normalized = normalized.replace(/\s+ze\s+/g, ' ');
    normalized = normalized.replace(/\s+do\s+/g, ' ');
    
    // Normalizuj spacje
    normalized = normalized.replace(/\s+/g, ' ');
    
    return normalized;
  };
  
  // Funkcja pomocnicza do sprawdzania dopasowań
  const containsUnwantedIngredient = (ingredientText, preferences) => {
    if (!ingredientText) return false;
    
    const normalizedIngredient = normalizeText(ingredientText);
    
    // Szczegółowe logowanie dla debugowania
    console.log(`Sprawdzanie składnika: "${ingredientText}" (znormalizowany: "${normalizedIngredient}")`);
    
    // Sprawdź każdą preferencję
    for (const pref of preferences) {
      const normalizedPref = normalizeText(pref);
      
      // Metoda 1: Bezpośrednie zawieranie preferencji w składniku
      if (normalizedIngredient.includes(normalizedPref)) {
        console.log(`DOPASOWANO: Składnik "${ingredientText}" zawiera niechciany składnik "${pref}"`);
        return true;
      }
      
      // Metoda 2: Pełne dopasowanie (dokładnie ten sam składnik)
      if (normalizedIngredient === normalizedPref) {
        console.log(`DOPASOWANO DOKŁADNIE: Składnik "${ingredientText}" to dokładnie niechciany składnik "${pref}"`);
        return true;
      }
      
      // Metoda 3: Dopasowanie początku słowa (dla podstawowych form składników)
      // Np. "cebula" powinno dopasować "cebulę", "cebuli", "cebulka", itp.
      const ingredientWords = normalizedIngredient.split(' ');
      for (const word of ingredientWords) {
        if (word.startsWith(normalizedPref) || normalizedPref.startsWith(word)) {
          if (word.length >= 3 && normalizedPref.length >= 3) { // Unikaj krótkich słów
            console.log(`DOPASOWANO CZĘŚĆ SŁOWA: Składnik "${ingredientText}" zawiera słowo "${word}" dopasowane do "${pref}"`);
            return true;
          }
        }
      }
      
      // Specjalne sprawdzenie dla "kurczaka" i podobnych
      if ((pref.includes("kurczak") || pref.includes("kur")) && 
          (normalizedIngredient.includes("kurcz") || 
           normalizedIngredient.includes("kurz") || 
           normalizedIngredient.includes("drób") || 
           normalizedIngredient.includes("drob"))) {
        console.log(`DOPASOWANO SPECJALNE: Składnik "${ingredientText}" to rodzaj kurczaka - pasuje do "${pref}"`);
        return true;
      }
      
      // Sprawdź czy "cebula" pasuje do różnych form
      if ((pref.includes("cebul") && normalizedIngredient.includes("cebul")) ||
          (pref === "cebula" && (normalizedIngredient.includes("cebul") || 
                               normalizedIngredient.includes("cebulow")))) {
        console.log(`DOPASOWANO CEBULĘ: Składnik "${ingredientText}" zawiera cebulę - pasuje do "${pref}"`);
        return true;
      }
    }
    
    return false;
  };
  
  const filteredRecipes = recipes.filter(recipe => {
    // Jeśli przepis nie ma składników, nie możemy go filtrować
    if (!recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      console.log(`Przepis ${recipe.title} nie ma składników lub nie są tablicą`);
      return true; // Zwracamy true, bo nie możemy stwierdzić, że zawiera niechciane składniki
    }
    
    // Sprawdź czy nazwa przepisu zawiera niechciany składnik
    for (const pref of cleanedPreferences) {
      if (normalizeText(recipe.title).includes(normalizeText(pref))) {
        console.log(`Przepis "${recipe.title}" zawiera niechciany składnik "${pref}" w tytule - odfiltrowany`);
        return false;
      }
    }
    
    // Sprawdzamy każdy składnik przepisu
    for (const ingredient of recipe.ingredients) {
      // Konwertujemy składnik na string jeśli to obiekt
      const ingredientText = typeof ingredient === 'object' ? 
        (ingredient.name || JSON.stringify(ingredient)) : String(ingredient);
      
      // Sprawdź czy składnik zawiera niechciany element
      if (containsUnwantedIngredient(ingredientText, cleanedPreferences)) {
        console.log(`Przepis ${recipe.title} zawiera niechciany składnik "${ingredientText}" - odfiltrowany`);
        return false;
      }
    }
    
    console.log(`Przepis ${recipe.title} przeszedł filtrację - nie zawiera niechcianych składników`);
    return true; // Przepis nie zawiera żadnych niechcianych składników
  });
  
  console.log(`Po filtrowaniu zostało ${filteredRecipes.length} przepisów z ${recipes.length}`);
  return filteredRecipes;
}; 