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
export const addRecipe = async (recipeData, userId, userName) => {
  try {
    const recipeWithMetadata = {
      ...recipeData,
      authorId: userId,
      authorName: userName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      avgRating: 0,
      ratingCount: 0,
      isPublic: true
    };
    
    const recipesCollection = collection(db, RECIPES_COLLECTION);
    const docRef = await addDoc(recipesCollection, recipeWithMetadata);
    
    // Możemy tutaj wywołać dodanie ID przepisu do listy "moich przepisów" użytkownika
    // Można to zrobić przy użyciu userService
    // await addToMyRecipes(userId, docRef.id);
    
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

// Filtrowanie przepisów według kategorii - uproszczone
export const getRecipesByCategory = async (categoryId) => {
  try {
    const recipes = await getRecipes();
    
    // Filtrujemy lokalnie
    return recipes.filter(recipe => 
      recipe.categories && recipe.categories.includes(categoryId)
    );
  } catch (error) {
    console.error('Błąd podczas filtrowania przepisów:', error);
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