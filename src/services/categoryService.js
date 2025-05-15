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
  orderBy 
} from 'firebase/firestore';

// Nazwa kolekcji w Firestore
const CATEGORIES_COLLECTION = 'categories';

// Pobieranie wszystkich kategorii
export const getAllCategories = async () => {
  try {
    const categoriesQuery = query(
      collection(db, CATEGORIES_COLLECTION),
      orderBy("name")
    );
    
    const categoriesSnapshot = await getDocs(categoriesQuery);
    return categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Błąd podczas pobierania kategorii:', error);
    return [];
  }
};

// Pobieranie pojedynczej kategorii po ID
export const getCategoryById = async (categoryId) => {
  try {
    const categoryRef = doc(db, CATEGORIES_COLLECTION, categoryId);
    const categoryDoc = await getDoc(categoryRef);
    
    if (categoryDoc.exists()) {
      return {
        id: categoryDoc.id,
        ...categoryDoc.data()
      };
    } else {
      console.log('Kategoria o podanym ID nie istnieje');
      return null;
    }
  } catch (error) {
    console.error('Błąd podczas pobierania kategorii:', error);
    return null;
  }
};

// Dodawanie nowej kategorii (tylko dla administratorów)
export const addCategory = async (categoryData) => {
  try {
    const categoriesCollection = collection(db, CATEGORIES_COLLECTION);
    const docRef = await addDoc(categoriesCollection, categoryData);
    return docRef.id;
  } catch (error) {
    console.error('Błąd podczas dodawania kategorii:', error);
    return null;
  }
};

// Aktualizacja kategorii (tylko dla administratorów)
export const updateCategory = async (categoryId, categoryData) => {
  try {
    const categoryRef = doc(db, CATEGORIES_COLLECTION, categoryId);
    await updateDoc(categoryRef, categoryData);
    return true;
  } catch (error) {
    console.error('Błąd podczas aktualizacji kategorii:', error);
    return false;
  }
};

// Usuwanie kategorii (tylko dla administratorów)
export const deleteCategory = async (categoryId) => {
  try {
    const categoryRef = doc(db, CATEGORIES_COLLECTION, categoryId);
    await deleteDoc(categoryRef);
    
    // Uwaga: w pełnej implementacji należałoby zaktualizować wszystkie przepisy,
    // które miały tę kategorię, aby ją usunąć z ich listy kategorii
    
    return true;
  } catch (error) {
    console.error('Błąd podczas usuwania kategorii:', error);
    return false;
  }
}; 