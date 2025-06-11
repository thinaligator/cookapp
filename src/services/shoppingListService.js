import { db, auth } from '../config/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';

// Pobierz listę zakupów użytkownika
export const getShoppingList = async () => {
  try {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      throw new Error('Użytkownik nie jest zalogowany');
    }
    
    const shoppingListRef = doc(db, 'shoppingLists', userId);
    const shoppingListDoc = await getDoc(shoppingListRef);
    
    if (shoppingListDoc.exists()) {
      return shoppingListDoc.data().items || [];
    } else {
      // Jeśli dokument nie istnieje, utwórz pusty
      await setDoc(shoppingListRef, { items: [] });
      return [];
    }
  } catch (error) {
    console.error('Błąd podczas pobierania listy zakupów:', error);
    throw error;
  }
};

// Dodaj składnik do listy zakupów
export const addToShoppingList = async (ingredient) => {
  try {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      throw new Error('Użytkownik nie jest zalogowany');
    }
    
    const shoppingListRef = doc(db, 'shoppingLists', userId);
    const shoppingListDoc = await getDoc(shoppingListRef);
    
    if (shoppingListDoc.exists()) {
      // Sprawdź, czy składnik już istnieje na liście
      const currentItems = shoppingListDoc.data().items || [];
      const itemExists = currentItems.some(item => 
        item.name.toLowerCase() === ingredient.toLowerCase()
      );
      
      if (!itemExists) {
        // Dodaj nowy składnik do listy
        await updateDoc(shoppingListRef, {
          items: arrayUnion({
            name: ingredient,
            completed: false,
            addedAt: new Date().toISOString()
          })
        });
      }
      
      return !itemExists; // Zwróć true jeśli dodano nowy składnik
    } else {
      // Jeśli dokument nie istnieje, utwórz go z pierwszym składnikiem
      await setDoc(shoppingListRef, {
        items: [{
          name: ingredient,
          completed: false,
          addedAt: new Date().toISOString()
        }]
      });
      return true;
    }
  } catch (error) {
    console.error('Błąd podczas dodawania do listy zakupów:', error);
    throw error;
  }
};

// Dodaj listę składników do listy zakupów
export const addIngredientsToShoppingList = async (ingredients, recipeName) => {
  try {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      throw new Error('Użytkownik nie jest zalogowany');
    }
    
    const shoppingListRef = doc(db, 'shoppingLists', userId);
    const shoppingListDoc = await getDoc(shoppingListRef);
    
    // Przygotuj nowe elementy
    const timestamp = new Date().toISOString();
    const newItems = ingredients.map(ingredient => ({
      name: ingredient,
      completed: false,
      addedAt: timestamp,
      recipeSource: recipeName || 'Nieznany przepis'
    }));
    
    if (shoppingListDoc.exists()) {
      // Pobierz aktualne elementy
      const currentItems = shoppingListDoc.data().items || [];
      
      // Sprawdź które składniki są nowe
      const itemsToAdd = newItems.filter(newItem => 
        !currentItems.some(item => item.name.toLowerCase() === newItem.name.toLowerCase())
      );
      
      // Jeśli są nowe składniki, dodaj je
      if (itemsToAdd.length > 0) {
        // Dla każdego nowego elementu użyj arrayUnion
        for (const item of itemsToAdd) {
          await updateDoc(shoppingListRef, {
            items: arrayUnion(item)
          });
        }
      }
      
      return itemsToAdd.length; // Zwróć liczbę dodanych składników
    } else {
      // Jeśli dokument nie istnieje, utwórz go z nowymi składnikami
      await setDoc(shoppingListRef, {
        items: newItems
      });
      return newItems.length;
    }
  } catch (error) {
    console.error('Błąd podczas dodawania składników do listy zakupów:', error);
    throw error;
  }
};

// Usuń składnik z listy zakupów
export const removeFromShoppingList = async (ingredientName) => {
  try {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      throw new Error('Użytkownik nie jest zalogowany');
    }
    
    const shoppingListRef = doc(db, 'shoppingLists', userId);
    const shoppingListDoc = await getDoc(shoppingListRef);
    
    if (shoppingListDoc.exists()) {
      const currentItems = shoppingListDoc.data().items || [];
      const itemToRemove = currentItems.find(item => 
        item.name.toLowerCase() === ingredientName.toLowerCase()
      );
      
      if (itemToRemove) {
        await updateDoc(shoppingListRef, {
          items: arrayRemove(itemToRemove)
        });
      }
    }
  } catch (error) {
    console.error('Błąd podczas usuwania z listy zakupów:', error);
    throw error;
  }
};

// Zmień status ukończenia składnika
export const toggleItemCompletion = async (ingredientName) => {
  try {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      throw new Error('Użytkownik nie jest zalogowany');
    }
    
    const shoppingListRef = doc(db, 'shoppingLists', userId);
    const shoppingListDoc = await getDoc(shoppingListRef);
    
    if (shoppingListDoc.exists()) {
      const currentItems = shoppingListDoc.data().items || [];
      const updatedItems = currentItems.map(item => {
        if (item.name.toLowerCase() === ingredientName.toLowerCase()) {
          return { ...item, completed: !item.completed };
        }
        return item;
      });
      
      await updateDoc(shoppingListRef, { items: updatedItems });
    }
  } catch (error) {
    console.error('Błąd podczas zmiany statusu składnika:', error);
    throw error;
  }
};

// Wyczyść całą listę zakupów
export const clearShoppingList = async () => {
  try {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      throw new Error('Użytkownik nie jest zalogowany');
    }
    
    const shoppingListRef = doc(db, 'shoppingLists', userId);
    await updateDoc(shoppingListRef, { items: [] });
  } catch (error) {
    console.error('Błąd podczas czyszczenia listy zakupów:', error);
    throw error;
  }
};

// Usuń wszystkie ukończone pozycje
export const clearCompletedItems = async () => {
  try {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      throw new Error('Użytkownik nie jest zalogowany');
    }
    
    const shoppingListRef = doc(db, 'shoppingLists', userId);
    const shoppingListDoc = await getDoc(shoppingListRef);
    
    if (shoppingListDoc.exists()) {
      const currentItems = shoppingListDoc.data().items || [];
      const updatedItems = currentItems.filter(item => !item.completed);
      
      await updateDoc(shoppingListRef, { items: updatedItems });
    }
  } catch (error) {
    console.error('Błąd podczas usuwania ukończonych pozycji:', error);
    throw error;
  }
};