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
  serverTimestamp,
  runTransaction 
} from 'firebase/firestore';

// Nazwy kolekcji w Firestore
const REVIEWS_COLLECTION = 'reviews';
const RECIPES_COLLECTION = 'recipes';

// Pobieranie wszystkich ocen dla przepisu
export const getReviewsForRecipe = async (recipeId) => {
  try {
    const reviewsQuery = query(
      collection(db, REVIEWS_COLLECTION),
      where("recipeId", "==", recipeId),
      orderBy("createdAt", "desc")
    );
    
    const reviewsSnapshot = await getDocs(reviewsQuery);
    return reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Błąd podczas pobierania ocen przepisu:', error);
    return [];
  }
};

// Pobieranie oceny użytkownika dla przepisu
export const getUserReviewForRecipe = async (recipeId, userId) => {
  try {
    const reviewsQuery = query(
      collection(db, REVIEWS_COLLECTION),
      where("recipeId", "==", recipeId),
      where("userId", "==", userId)
    );
    
    const reviewsSnapshot = await getDocs(reviewsQuery);
    
    if (reviewsSnapshot.docs.length > 0) {
      const reviewDoc = reviewsSnapshot.docs[0];
      return {
        id: reviewDoc.id,
        ...reviewDoc.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Błąd podczas pobierania oceny użytkownika:', error);
    return null;
  }
};

// Dodawanie nowej oceny (lub aktualizacja istniejącej)
export const addOrUpdateReview = async (recipeId, userId, userName, rating, comment) => {
  try {
    // Sprawdzanie czy użytkownik już ocenił ten przepis
    const existingReview = await getUserReviewForRecipe(recipeId, userId);
    
    // Przygotowanie danych oceny
    const reviewData = {
      recipeId,
      userId,
      userName,
      rating,
      comment,
      updatedAt: serverTimestamp()
    };
    
    if (existingReview) {
      // Aktualizacja istniejącej oceny
      const reviewRef = doc(db, REVIEWS_COLLECTION, existingReview.id);
      await updateDoc(reviewRef, reviewData);
      
      // Aktualizacja średniej oceny przepisu
      await updateRecipeRating(recipeId, rating, false);
      
      return existingReview.id;
    } else {
      // Dodanie nowej oceny
      reviewData.createdAt = serverTimestamp();
      
      const reviewsCollection = collection(db, REVIEWS_COLLECTION);
      const docRef = await addDoc(reviewsCollection, reviewData);
      
      // Aktualizacja średniej oceny przepisu
      await updateRecipeRating(recipeId, rating, true);
      
      return docRef.id;
    }
  } catch (error) {
    console.error('Błąd podczas dodawania/aktualizacji oceny:', error);
    return null;
  }
};

// Usuwanie oceny
export const deleteReview = async (reviewId, recipeId, rating) => {
  try {
    const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);
    await deleteDoc(reviewRef);
    
    // Aktualizacja średniej oceny przepisu
    await updateRecipeRatingOnDelete(recipeId, rating);
    
    return true;
  } catch (error) {
    console.error('Błąd podczas usuwania oceny:', error);
    return false;
  }
};

// Pomocnicza funkcja do aktualizacji średniej oceny przepisu przy dodaniu/aktualizacji oceny
const updateRecipeRating = async (recipeId, newRating, isNewReview) => {
  try {
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId);
    
    await runTransaction(db, async (transaction) => {
      const recipeDoc = await transaction.get(recipeRef);
      if (!recipeDoc.exists()) {
        throw "Przepis nie istnieje!";
      }
      
      const recipeData = recipeDoc.data();
      const oldRatingTotal = recipeData.avgRating * recipeData.ratingCount;
      
      let newRatingCount = recipeData.ratingCount;
      if (isNewReview) {
        newRatingCount += 1;
      }
      
      // Obliczanie nowej średniej
      const newAvgRating = (oldRatingTotal + newRating) / newRatingCount;
      
      // Aktualizacja dokumentu przepisu
      transaction.update(recipeRef, {
        avgRating: newAvgRating,
        ratingCount: newRatingCount
      });
    });
    
    return true;
  } catch (error) {
    console.error('Błąd podczas aktualizacji oceny przepisu:', error);
    return false;
  }
};

// Pomocnicza funkcja do aktualizacji średniej oceny przepisu przy usunięciu oceny
const updateRecipeRatingOnDelete = async (recipeId, deletedRating) => {
  try {
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId);
    
    await runTransaction(db, async (transaction) => {
      const recipeDoc = await transaction.get(recipeRef);
      if (!recipeDoc.exists()) {
        throw "Przepis nie istnieje!";
      }
      
      const recipeData = recipeDoc.data();
      const oldRatingTotal = recipeData.avgRating * recipeData.ratingCount;
      const newRatingCount = recipeData.ratingCount - 1;
      
      // Jeśli to była ostatnia ocena, resetujemy średnią do 0
      let newAvgRating = 0;
      if (newRatingCount > 0) {
        newAvgRating = (oldRatingTotal - deletedRating) / newRatingCount;
      }
      
      // Aktualizacja dokumentu przepisu
      transaction.update(recipeRef, {
        avgRating: newAvgRating,
        ratingCount: newRatingCount
      });
    });
    
    return true;
  } catch (error) {
    console.error('Błąd podczas aktualizacji oceny przepisu po usunięciu:', error);
    return false;
  }
}; 