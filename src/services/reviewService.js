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
    // Używamy prostego zapytania bez sortowania, żeby uniknąć problemów z indeksami
    const reviewsQuery = query(
      collection(db, REVIEWS_COLLECTION),
      where("recipeId", "==", recipeId)
    );
    
    const reviewsSnapshot = await getDocs(reviewsQuery);
    const reviews = reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sortujemy lokalnie po dacie (od najnowszych)
    return reviews.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.seconds - a.createdAt.seconds;
    });
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
export const addOrUpdateReview = async (recipeId, userId, reviewDataOrUserName, ratingOrNull, commentOrNull) => {
  try {
    console.log('Dodawanie/aktualizacja oceny:', recipeId, userId);
    
    // Sprawdzanie czy użytkownik już ocenił ten przepis
    const existingReview = await getUserReviewForRecipe(recipeId, userId);
    
    let reviewData;
    
    // Sprawdzamy, czy przekazano obiekt reviewData czy pojedyncze parametry
    if (typeof reviewDataOrUserName === 'object') {
      // Jeśli przekazano obiekt, używamy go bezpośrednio
      console.log('Otrzymano obiekt oceny:', reviewDataOrUserName);
      reviewData = {
        recipeId,
        userId,
        userName: reviewDataOrUserName.userName || 'Użytkownik',
        rating: parseInt(reviewDataOrUserName.rating, 10) || 0,
        comment: reviewDataOrUserName.comment || '',
        updatedAt: serverTimestamp()
      };
    } else {
      // Jeśli przekazano pojedyncze parametry (stary format)
      console.log('Otrzymano pojedyncze parametry oceny:', reviewDataOrUserName, ratingOrNull);
      reviewData = {
      recipeId,
      userId,
        userName: reviewDataOrUserName || 'Użytkownik',
        rating: parseInt(ratingOrNull, 10) || 0,
        comment: commentOrNull || '',
      updatedAt: serverTimestamp()
    };
    }
    
    console.log('Zapisuję dane oceny:', reviewData);
    
    if (existingReview) {
      // Aktualizacja istniejącej oceny
      console.log('Aktualizacja istniejącej oceny:', existingReview.id);
      const reviewRef = doc(db, REVIEWS_COLLECTION, existingReview.id);
      await updateDoc(reviewRef, reviewData);
      
      // Aktualizacja średniej oceny przepisu
      await updateRecipeRating(recipeId);
      
      return existingReview.id;
    } else {
      // Dodanie nowej oceny
      console.log('Dodawanie nowej oceny');
      reviewData.createdAt = serverTimestamp();
      
      const reviewsCollection = collection(db, REVIEWS_COLLECTION);
      const docRef = await addDoc(reviewsCollection, reviewData);
      
      // Aktualizacja średniej oceny przepisu
      await updateRecipeRating(recipeId);
      
      return docRef.id;
    }
  } catch (error) {
    console.error('Błąd podczas dodawania/aktualizacji oceny:', error);
    return null;
  }
};

// Usuwanie oceny
export const deleteReview = async (reviewId, recipeId) => {
  try {
    const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);
    await deleteDoc(reviewRef);
    
    // Aktualizacja średniej oceny przepisu
    await updateRecipeRating(recipeId);
    
    return true;
  } catch (error) {
    console.error('Błąd podczas usuwania oceny:', error);
    return false;
  }
};

// Funkcja do aktualizacji średniej oceny przepisu
const updateRecipeRating = async (recipeId) => {
  try {
    console.log('Aktualizacja oceny przepisu:', recipeId);
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId);
    
    // Pobieramy wszystkie oceny przepisu
    const reviews = await getReviewsForRecipe(recipeId);
    
    if (reviews.length === 0) {
      // Jeśli nie ma ocen, ustawiamy średnią na 0
      console.log('Brak ocen, ustawiam avgRating=0');
      await updateDoc(recipeRef, {
        avgRating: 0,
        ratingCount: 0
      });
      return true;
    }
    
    // Obliczamy średnią ocenę
    const totalRating = reviews.reduce((sum, review) => {
      const rating = review.rating || 0;
      return sum + rating;
    }, 0);
    
    const avgRating = totalRating / reviews.length;
    console.log(`Nowa średnia ocena: ${avgRating.toFixed(2)} (${reviews.length} ocen)`);
      
    // Aktualizujemy dokument przepisu
    await updateDoc(recipeRef, {
      avgRating,
      ratingCount: reviews.length
    });
    
    return true;
  } catch (error) {
    console.error('Błąd podczas aktualizacji oceny przepisu:', error);
    return false;
  }
}; 