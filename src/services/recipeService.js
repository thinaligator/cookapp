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
export const getRecipes = async (limitCount = 20) => {
  try {
    // Uproszczone zapytanie bez filtrowania i sortowania
    const recipesCollection = collection(db, RECIPES_COLLECTION);
    const recipesSnapshot = await getDocs(recipesCollection);
    
    const recipes = recipesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
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
      return {
        id: recipeDoc.id,
        ...recipeDoc.data()
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