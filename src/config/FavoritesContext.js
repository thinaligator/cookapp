import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserFavoriteIds, addToFavorites, removeFromFavorites } from '../services/userService';
import { getRecipesByIds } from '../services/recipeService';

// Tworzenie kontekstu
const FavoritesContext = createContext();

// Hook do łatwego używania kontekstu
export const useFavorites = () => useContext(FavoritesContext);

// Provider komponent
export const FavoritesProvider = ({ children }) => {
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const { currentUser } = useAuth();
  
  // Funkcja do pobierania ulubionych przepisów
  const refreshFavorites = async () => {
    if (!currentUser) {
      setFavoriteRecipes([]);
      setFavoriteIds([]);
      return;
    }
    
    try {
      setLoading(true);
      const ids = await getUserFavoriteIds(currentUser.uid);
      setFavoriteIds(ids);
      
      if (ids.length > 0) {
        const recipes = await getRecipesByIds(ids);
        setFavoriteRecipes(recipes);
      } else {
        setFavoriteRecipes([]);
      }
    } catch (error) {
      console.error('Błąd podczas odświeżania ulubionych przepisów:', error);
      setFavoriteRecipes([]);
      setFavoriteIds([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Dodawanie przepisu do ulubionych
  const addFavorite = async (recipeId, recipeData) => {
    if (!currentUser) return false;
    
    try {
      await addToFavorites(currentUser.uid, recipeId);
      
      // Dodajemy przepis do lokalnej listy bez ponownego pobierania wszystkich
      setFavoriteIds(prev => [...prev, recipeId]);
      
      // Jeśli mamy pełne dane przepisu, dodajemy go do listy
      if (recipeData) {
        setFavoriteRecipes(prev => [...prev, recipeData]);
      } else {
        // W przeciwnym razie odświeżamy całą listę
        await refreshFavorites();
      }
      
      return true;
    } catch (error) {
      console.error('Błąd podczas dodawania do ulubionych:', error);
      return false;
    }
  };
  
  // Usuwanie przepisu z ulubionych
  const removeFavorite = async (recipeId) => {
    if (!currentUser) return false;
    
    try {
      await removeFromFavorites(currentUser.uid, recipeId);
      
      // Usuwamy przepis z lokalnej listy
      setFavoriteIds(prev => prev.filter(id => id !== recipeId));
      setFavoriteRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      
      return true;
    } catch (error) {
      console.error('Błąd podczas usuwania z ulubionych:', error);
      return false;
    }
  };
  
  // Sprawdzanie, czy przepis jest ulubiony
  const isFavorite = (recipeId) => {
    return favoriteIds.includes(recipeId);
  };
  
  // Pobieranie ulubionych przy zmianie użytkownika
  useEffect(() => {
    refreshFavorites();
  }, [currentUser]);
  
  // Wartości dostarczane przez kontekst
  const value = {
    favoriteRecipes,
    favoriteIds,
    loading,
    refreshFavorites,
    addFavorite,
    removeFavorite,
    isFavorite
  };
  
  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}; 