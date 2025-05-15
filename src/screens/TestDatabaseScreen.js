import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../config/colors';

// Importujemy nasze serwisy
import { addCategory, getAllCategories } from '../services/categoryService';
import { addRecipe, getRecipes } from '../services/recipeService';

const TestDatabaseScreen = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  // Funkcja do dodania nowego wpisu do logów wyników
  const addLog = (message) => {
    // Używamy timestamp jako klucza
    const timestamp = Date.now() + Math.floor(Math.random() * 1000); // Dodajemy losowy element dla unikatowości
    setResults((prevResults) => [...prevResults, { id: timestamp.toString(), message }]);
  };

  // Testowanie dodania kategorii
  const testAddCategory = async () => {
    try {
      setLoading(true);
      addLog('Rozpoczynanie testu dodawania kategorii...');

      const testCategory = {
        name: 'Test Kategoria ' + Date.now(),
        description: 'To jest kategoria testowa',
        imageURL: null
      };

      const categoryId = await addCategory(testCategory);
      
      if (categoryId) {
        addLog(`✅ Kategoria dodana pomyślnie! ID: ${categoryId}`);
      } else {
        addLog('❌ Błąd podczas dodawania kategorii');
      }
    } catch (err) {
      setError(err.message);
      addLog(`❌ Błąd: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Testowanie pobierania kategorii
  const testGetCategories = async () => {
    try {
      setLoading(true);
      addLog('Pobieranie wszystkich kategorii...');

      const categories = await getAllCategories();
      
      addLog(`✅ Pobrano ${categories.length} kategorii`);
      if (categories.length > 0) {
        addLog(`Pierwsza kategoria: ${categories[0].name}`);
      }
    } catch (err) {
      setError(err.message);
      addLog(`❌ Błąd: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Testowanie dodania przepisu
  const testAddRecipe = async () => {
    try {
      setLoading(true);
      addLog('Rozpoczynanie testu dodawania przepisu...');

      const testRecipe = {
        title: 'Testowy Przepis ' + Date.now(),
        description: 'To jest testowy przepis',
        ingredients: ['Składnik 1', 'Składnik 2', 'Składnik 3'],
        instructions: ['Krok 1: Zrób coś', 'Krok 2: Zrób coś jeszcze'],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: 'Średni',
        imageURL: null,
        additionalImages: [],
        categories: []
      };

      // Używamy tymczasowego ID użytkownika i nazwy dla testu
      const userId = 'test-user-id';
      const userName = 'Test User';

      const recipeId = await addRecipe(testRecipe, userId, userName);
      
      if (recipeId) {
        addLog(`✅ Przepis dodany pomyślnie! ID: ${recipeId}`);
      } else {
        addLog('❌ Błąd podczas dodawania przepisu');
      }
    } catch (err) {
      setError(err.message);
      addLog(`❌ Błąd: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Testowanie pobierania przepisów
  const testGetRecipes = async () => {
    try {
      setLoading(true);
      addLog('Pobieranie wszystkich przepisów...');

      const recipes = await getRecipes();
      
      addLog(`✅ Pobrano ${recipes.length} przepisów`);
      if (recipes.length > 0) {
        addLog(`Pierwszy przepis: ${recipes[0].title}`);
      }
    } catch (err) {
      setError(err.message);
      addLog(`❌ Błąd: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Wykonanie wszystkich testów
  const runAllTests = async () => {
    setResults([]);
    addLog('Uruchamianie wszystkich testów...');
    
    // Wykonujemy testy sekwencyjnie, z małym opóźnieniem między nimi
    await testAddCategory();
    await new Promise(resolve => setTimeout(resolve, 500)); // Dodajemy opóźnienie
    
    await testGetCategories();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testAddRecipe();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testGetRecipes();
    
    addLog('Zakończono wszystkie testy!');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Test Bazy Danych</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={runAllTests}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Uruchom wszystkie testy</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={testAddCategory}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Dodaj testową kategorię</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={testGetCategories}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Pobierz kategorie</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={testAddRecipe}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Dodaj testowy przepis</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={testGetRecipes}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Pobierz przepisy</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Wykonywanie operacji...</Text>
        </View>
      )}

      <ScrollView style={styles.resultContainer}>
        <Text style={styles.resultTitle}>Wyniki testów:</Text>
        {results.map((item) => (
          <Text key={item.id} style={styles.resultText}>{item.message}</Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  buttonContainer: {
    padding: 15,
  },
  button: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.lightText,
  },
  resultContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: COLORS.white,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.text,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingLeft: 10,
  },
});

export default TestDatabaseScreen; 