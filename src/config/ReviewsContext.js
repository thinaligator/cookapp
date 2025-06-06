import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { addOrUpdateReview, getUserReviewForRecipe, getReviewsForRecipe } from '../services/reviewService';
import { getRecipeById } from '../services/recipeService';

// Tworzenie kontekstu
const ReviewsContext = createContext();

// Hook do łatwego używania kontekstu
export const useReviews = () => useContext(ReviewsContext);

// Provider komponent
export const ReviewsProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [currentRecipeId, setCurrentRecipeId] = useState(null);
  const [recipeReviews, setRecipeReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [lastRatingChange, setLastRatingChange] = useState(null);
  
  // Referencje do funkcji odświeżających przepisy
  const refreshListenersRef = useRef([]);
  
  const { currentUser } = useAuth();
  
  // Rejestracja funkcji odświeżającej przepisy
  const registerRefreshListener = useCallback((listener) => {
    refreshListenersRef.current.push(listener);
    
    // Zwracamy funkcję do wyrejestrowania listenera
    return () => {
      refreshListenersRef.current = refreshListenersRef.current.filter(l => l !== listener);
    };
  }, []);
  
  // Funkcja powiadamiająca wszystkich słuchaczy o zmianie oceny
  const notifyRatingChange = useCallback((recipeId, newRating) => {
    setLastRatingChange({ recipeId, rating: newRating, timestamp: Date.now() });
    
    // Powiadamiamy wszystkie zarejestrowane funkcje odświeżające
    refreshListenersRef.current.forEach(listener => {
      try {
        listener(recipeId, newRating);
      } catch (error) {
        console.error('Błąd podczas powiadamiania o zmianie oceny:', error);
      }
    });
  }, []);
  
  // Ustawienie aktualnego przepisu
  const setCurrentRecipe = (recipeId) => {
    setCurrentRecipeId(recipeId);
  };
  
  // Pobieranie ocen dla aktualnego przepisu
  const fetchReviews = async (recipeId) => {
    if (!recipeId) return;
    
    try {
      setLoading(true);
      const reviews = await getReviewsForRecipe(recipeId);
      setRecipeReviews(reviews);
      
      // Jeśli użytkownik jest zalogowany, pobieramy jego ocenę
      if (currentUser) {
        const userReviewData = await getUserReviewForRecipe(recipeId, currentUser.uid);
        setUserReview(userReviewData);
      }
    } catch (error) {
      console.error('Błąd podczas pobierania ocen:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Dodawanie lub aktualizacja oceny
  const submitReview = async (recipeId, rating, comment) => {
    if (!currentUser || !recipeId) {
      return { success: false, error: 'Użytkownik musi być zalogowany' };
    }
    
    if (!rating || rating < 1 || rating > 5) {
      return { success: false, error: 'Ocena musi być w zakresie 1-5' };
    }
    
    try {
      setLoading(true);
      
      // Przygotowanie danych recenzji
      const reviewData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Użytkownik',
        rating: parseInt(rating, 10),
        comment: comment ? comment.trim() : '',
        createdAt: new Date().toISOString()
      };
      
      // Zapisanie recenzji w bazie danych
      await addOrUpdateReview(recipeId, currentUser.uid, reviewData);
      
      // Aktualizacja stanu
      setUserReview(reviewData);
      
      // Odświeżenie listy ocen
      await fetchReviews(recipeId);
      
      // Powiadamiamy o zmianie oceny
      notifyRatingChange(recipeId, rating);
      
      return { success: true };
    } catch (error) {
      console.error('Błąd podczas dodawania oceny:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };
  
  // Pobieranie ocen przy zmianie przepisu
  useEffect(() => {
    if (currentRecipeId) {
      fetchReviews(currentRecipeId);
    }
  }, [currentRecipeId, currentUser]);
  
  // Wartości dostarczane przez kontekst
  const value = {
    loading,
    recipeReviews,
    userReview,
    lastRatingChange,
    setCurrentRecipe,
    fetchReviews,
    submitReview,
    registerRefreshListener
  };
  
  return (
    <ReviewsContext.Provider value={value}>
      {children}
    </ReviewsContext.Provider>
  );
}; 