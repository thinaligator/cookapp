import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import RecipeCard from '../components/RecipeCard';
import { getRecipes, searchRecipesByTitle, getRecipesByTag, updateRecipeTags, getRecipesByCategory, filterRecipesByDietaryPreferences } from '../services/recipeService';
import { getImageFromCache } from '../services/imageCacheService';
import { COLORS } from '../config/colors';
import { useAuth } from '../config/AuthContext';
import { useFavorites } from '../config/FavoritesContext';
import { useReviews } from '../config/ReviewsContext';
import { Ionicons } from '@expo/vector-icons';
import { getUserDietaryPreferences } from '../services/userService';
import { useFocusEffect } from '@react-navigation/native';

// Stałe dla kategorii
const CATEGORIES = ['Śniadanie', 'Danie główne', 'Zupa', 'Sałatka', 'Kolacja', 'Deser'];

// Dostępne tagi (bez kategorii)
const AVAILABLE_TAGS = [
  'wegetariańskie', 'wegańskie', 'bez glutenu', 'bez laktozy', 'keto', 
  'szybkie', 'dietetyczne', 'na ciepło', 'na zimno', 'słodkie', 'słone', 
  'ostre', 'łagodne', 'kuchnia włoska', 'kuchnia azjatycka', 'kuchnia polska', 
  'kuchnia francuska', 'kuchnia meksykańska', 'na imprezę', 'dla dzieci', 
  'fit', 'comfort food', 'fastfood', 'na grilla'
];

// Poziomy trudności
const DIFFICULTY_LEVELS = ['Łatwy', 'Średni', 'Trudny'];

// Mapowanie słów kluczowych z tytułów na tagi
const RECIPE_TAG_MAPPING = {
  'pizza': ['kuchnia włoska', 'fastfood'],
  'makaron': ['kuchnia włoska'],
  'spaghetti': ['kuchnia włoska'],
  'lazania': ['kuchnia włoska'],
  'risotto': ['kuchnia włoska'],
  'sushi': ['kuchnia azjatycka', 'na zimno'],
  'curry': ['kuchnia azjatycka', 'ostre'],
  'ramen': ['kuchnia azjatycka', 'zupa'],
  'pad thai': ['kuchnia azjatycka'],
  'pierogi': ['kuchnia polska'],
  'bigos': ['kuchnia polska'],
  'żurek': ['kuchnia polska', 'zupa'],
  'schabowy': ['kuchnia polska', 'danie główne'],
  'croissant': ['kuchnia francuska', 'śniadanie'],
  'quiche': ['kuchnia francuska'],
  'taco': ['kuchnia meksykańska', 'ostre'],
  'burrito': ['kuchnia meksykańska', 'ostre'],
  'burger': ['fastfood'],
  'frytki': ['fastfood', 'przekąska'],
  'sałatka': ['dietetyczne', 'fit', 'na zimno'],
  'ciasto': ['deser', 'słodkie'],
  'lody': ['deser', 'słodkie'],
  'czekolada': ['deser', 'słodkie'],
  'ciasteczka': ['deser', 'słodkie'],
  'grill': ['na grilla'],
  'wege': ['wegetariańskie'],
  'wegańskie': ['wegańskie'],
  'dieta': ['dietetyczne', 'fit']
};

// Przykładowe mapowanie kategorii na tagi
const CATEGORY_TAG_MAPPING = {
  'Śniadanie': ['na ciepło', 'szybkie'],
  'Danie główne': ['na ciepło', 'comfort food'],
  'Zupa': ['na ciepło', 'rozgrzewające'],
  'Sałatka': ['na zimno', 'fit', 'dietetyczne'],
  'Kolacja': ['lekkie', 'na ciepło'],
  'Deser': ['słodkie']
};

const HomeScreen = ({ navigation, route }) => {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dietaryPreferences, setDietaryPreferences] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  
  const { currentUser, logout } = useAuth();
  const { favoriteRecipes, loading: favoritesLoading } = useFavorites();
  const { registerRefreshListener, lastRatingChange } = useReviews();

  // Przykładowe dane do wyświetlenia przed integracją z Firebase
  const sampleRecipes = [
    {
      id: '1',
      title: 'Spaghetti Bolognese',
      prepTime: 20, 
      cookTime: 30,
      difficulty: 'Średni',
      category: 'Dania główne'
    },
    {
      id: '2',
      title: 'Sałatka Grecka',
      prepTime: 15,
      cookTime: 0,
      difficulty: 'Łatwy',
      category: 'Sałatki'
    },
    {
      id: '3',
      title: 'Tiramisu',
      prepTime: 30,
      cookTime: 0,
      difficulty: 'Średni',
      category: 'Desery'
    },
    {
      id: '4',
      title: 'Zupa Pomidorowa',
      prepTime: 10,
      cookTime: 30,
      difficulty: 'Łatwy',
      category: 'Zupy'
    },
  ];

  // Pobieranie przepisów z Firebase
  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true);
      
      // Pobierz preferencje żywieniowe użytkownika, jeśli jest zalogowany
      let userDietaryPreferences = [];
      if (currentUser) {
        userDietaryPreferences = await getUserDietaryPreferences(currentUser.uid);
        console.log("Pobrane preferencje żywieniowe dla użytkownika", currentUser.displayName || currentUser.email, ":", JSON.stringify(userDietaryPreferences));
      
        // Sprawdź, czy zawierają "pierś z kurczaka" lub podobne
        const chickenRelated = userDietaryPreferences.filter(pref => 
          pref.toLowerCase().includes('kurczak') || 
          pref.toLowerCase().includes('drób') ||
          pref.toLowerCase().includes('filet')
        );
        
        if (chickenRelated.length > 0) {
          console.log("Znaleziono preferencje związane z kurczakiem:", chickenRelated);
        } else {
          console.log("Nie znaleziono preferencji związanych z kurczakiem");
        }
        
        setDietaryPreferences(userDietaryPreferences);
      }
      
      // Jeśli wybrano kategorię, pobierz przepisy z tej kategorii
      let fetchedRecipes;
      if (selectedCategory) {
        const categoryRecipes = await getRecipesByCategory(selectedCategory);
        console.log(`Znaleziono ${categoryRecipes.length} przepisów w kategorii ${selectedCategory}`);
        
        // Filtrujemy lokalnie zgodnie z preferencjami
        if (userDietaryPreferences && userDietaryPreferences.length > 0) {
          console.log(`Filtrowanie ${categoryRecipes.length} przepisów według preferencji: ${userDietaryPreferences.join(', ')}`);
          
          // Używamy zaimplementowanej funkcji zamiast filtrowania ręcznie
          fetchedRecipes = filterRecipesByDietaryPreferences(categoryRecipes, userDietaryPreferences);
        } else {
          fetchedRecipes = categoryRecipes;
        }
      } else {
        // Pobierz wszystkie przepisy i użyj ulepszonego filtrowania
        console.log("Pobieranie wszystkich przepisów z uwzględnieniem preferencji");
        const allRecipes = await getRecipes(50);
        
        // Filtrujemy z użyciem ulepszonego algorytmu
        if (userDietaryPreferences && userDietaryPreferences.length > 0) {
          fetchedRecipes = filterRecipesByDietaryPreferences(allRecipes, userDietaryPreferences);
        } else {
          fetchedRecipes = allRecipes;
        }
      }
      
      // Ustaw pobrane przepisy
      setRecipes(fetchedRecipes);
      setFilteredRecipes(fetchedRecipes);
      
      // Zbierz unikalne kategorie
      const uniqueCategories = Array.from(
        new Set(fetchedRecipes.map(recipe => recipe.category).filter(Boolean))
      );
      setCategories(uniqueCategories);
      
      setLoading(false);
    } catch (error) {
      console.error('Błąd podczas pobierania przepisów:', error);
      setLoading(false);
    }
  }, [currentUser, selectedCategory]);

  // Sortowanie przepisów według ocen (od najwyższej do najniższej)
  const sortRecipesByRating = useCallback((recipesToSort) => {
    console.log('Sortowanie przepisów według ocen...');
    return [...recipesToSort].sort((a, b) => {
      const aRating = a.avgRating || 0;
      const bRating = b.avgRating || 0;
      return bRating - aRating;
    });
  }, []);

  // Nasłuchiwanie zmian ocen
  useEffect(() => {
    // Funkcja wywoływana po zmianie oceny
    const handleRatingChange = (recipeId, newRating) => {
      console.log(`Ocena zmieniona: ${recipeId}, nowa ocena: ${newRating}`);
      fetchRecipes();
    };
    
    // Rejestrujemy nasłuchiwanie
    const unregister = registerRefreshListener(handleRatingChange);
    
    // Czyszczenie nasłuchiwania przy odmontowaniu komponentu
    return () => unregister();
  }, [registerRefreshListener, fetchRecipes]);

  // Początkowe pobieranie przepisów
  useEffect(() => {
    const loadAndDebugRecipes = async () => {
      await fetchRecipes();
      
      // Debug - sprawdź tagi wszystkich przepisów
      console.log("=== DEBUGGING TAGS ===");
      recipes.forEach(recipe => {
        console.log(`Przepis "${recipe.title}":`);
        console.log(`  Kategoria: ${recipe.category || 'brak'}`);
        
        if (recipe.tags && Array.isArray(recipe.tags)) {
          // Sprawdź, czy tagi zawierają kategorie
          const tagsWithCategories = recipe.tags.filter(tag => 
            CATEGORIES.some(cat => tag.toLowerCase().includes(cat.toLowerCase()))
          );
          
          if (tagsWithCategories.length > 0) {
            console.log(`  UWAGA: Znaleziono tagi zawierające kategorie: ${tagsWithCategories.join(', ')}`);
          }
          
          // Pokaż oczyszczone tagi
          const cleanTags = removeCategoriesFromTags(recipe.tags);
          console.log(`  Tagi (${recipe.tags.length}): ${recipe.tags.join(', ')}`);
          console.log(`  Oczyszczone tagi (${cleanTags.length}): ${cleanTags.join(', ')}`);
        } else {
          console.log("  Brak tagów lub nieprawidłowy format");
          console.log("  Wartość tags:", recipe.tags);
        }
      });
      console.log("=== END DEBUGGING ===");
      
      // Czyścimy tagi ze wszystkich przepisów, aby nie zawierały kategorii
      await cleanAllRecipeTags();
    };
    
    loadAndDebugRecipes();
  }, [fetchRecipes, cleanAllRecipeTags]);

  // Funkcja do czyszczenia tagów wszystkich przepisów
  const cleanAllRecipeTags = useCallback(async () => {
    try {
      console.log("=== CZYSZCZENIE TAGÓW Z KATEGORII ===");
      let updatedCount = 0;
      
      for (const recipe of recipes) {
        if (recipe.tags && Array.isArray(recipe.tags)) {
          // Sprawdź, czy tagi zawierają kategorie
          const tagsWithCategories = recipe.tags.filter(tag => 
            CATEGORIES.some(cat => tag.toLowerCase().includes(cat.toLowerCase()))
          );
          
          if (tagsWithCategories.length > 0) {
            console.log(`Przepis "${recipe.title}" ma tagi zawierające kategorie: ${tagsWithCategories.join(', ')}`);
            
            // Czyścimy tagi
            const cleanTags = removeCategoriesFromTags(recipe.tags);
            
            // Dodaj losowy tag, jeśli po usunięciu kategorii nic nie zostało
            if (cleanTags.length === 0) {
              const randomTag = AVAILABLE_TAGS[Math.floor(Math.random() * AVAILABLE_TAGS.length)];
              cleanTags.push(randomTag);
              console.log(`  Dodano losowy tag: ${randomTag}`);
            }
            
            console.log(`  Oczyszczone tagi: ${cleanTags.join(', ')}`);
            
            // Aktualizuj tagi przepisu
            const success = await updateRecipeTags(recipe.id, cleanTags);
            if (success) {
              console.log(`  Pomyślnie zaktualizowano tagi dla przepisu "${recipe.title}"`);
              updatedCount++;
            } else {
              console.error(`  Nie udało się zaktualizować tagów dla przepisu "${recipe.title}"`);
            }
          }
        }
      }
      
      console.log(`=== ZAKOŃCZONO CZYSZCZENIE TAGÓW. ZAKTUALIZOWANO ${updatedCount} PRZEPISÓW ===`);
      
      if (updatedCount > 0) {
        // Odśwież przepisy, jeśli były aktualizacje
        console.log('Odświeżanie listy przepisów po czyszczeniu tagów...');
        const updatedRecipes = await getRecipes();
        setRecipes(updatedRecipes);
        setFilteredRecipes(updatedRecipes);
      }
    } catch (error) {
      console.error('Błąd podczas czyszczenia tagów:', error);
    }
  }, [recipes]);

  // Odświeżanie po zmianie oceny
  useEffect(() => {
    if (lastRatingChange) {
      console.log('Wykryto zmianę oceny, odświeżam przepisy...');
      fetchRecipes();
    }
  }, [lastRatingChange, fetchRecipes]);

  // Obsługa filtrowania po kategorii
  const handleCategoryPress = async (category) => {
    console.log(`Kliknięto kategorię: ${category}`);
    setSelectedCategory(category);
    setSelectedTag(null);
    setSelectedDifficulty(null);
    setLoading(true);
    
    try {
      // Pobieranie przepisów z wybraną kategorią
      const categoryRecipes = await getRecipesByCategory(category);
      console.log(`Otrzymano ${categoryRecipes.length} przepisów z kategorii ${category}`);
      
      if (categoryRecipes.length === 0) {
        console.log(`Nie znaleziono przepisów w kategorii: ${category}`);
        setFilteredRecipes([]);
        setSearchActive(true);
        return;
      }
      
      // Sortowanie przepisów według ocen
      const sortedRecipes = sortRecipesByRating(categoryRecipes);
      
      // Aktualizacja filtrowanych przepisów
      setFilteredRecipes(sortedRecipes);
      setSearchActive(true);
    } catch (error) {
      console.error('Błąd podczas filtrowania po kategorii:', error);
      setFilteredRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  // Obsługa filtrowania po tagu
  const handleTagPress = async (tag) => {
    console.log(`Filtrowanie według tagu: ${tag}`);
    setSelectedTag(tag);
    setSelectedCategory(null);
    setSelectedDifficulty(null);
    setSearchActive(true);
    
    try {
      setLoading(true);
      const tagRecipes = await getRecipesByTag(tag);
      console.log(`Znaleziono ${tagRecipes.length} przepisów z tagiem "${tag}"`);
      setFilteredRecipes(tagRecipes);
      setLoading(false);
    } catch (error) {
      console.error(`Błąd podczas filtrowania według tagu "${tag}":`, error);
      setFilteredRecipes([]);
      setLoading(false);
    }
  };

  // Obsługa filtrowania według trudności
  const handleDifficultyPress = (difficulty) => {
    console.log(`Filtrowanie według trudności: ${difficulty}`);
    
    // Jeśli wybrano już ten poziom trudności, wyczyść filtr
    if (selectedDifficulty === difficulty) {
      setSelectedDifficulty(null);
      setFilteredRecipes(recipes);
      setSearchActive(false);
      return;
    }
    
    // Ustaw wybrany poziom trudności i wyczyść inne filtry
    setSelectedDifficulty(difficulty);
    setSelectedTag(null);
    setSelectedCategory(null);
    setSearchActive(true);
    
    // Filtruj przepisy według trudności
    const filtered = recipes.filter(recipe => recipe.difficulty === difficulty);
    console.log(`Znaleziono ${filtered.length} przepisów o trudności "${difficulty}"`);
    setFilteredRecipes(filtered);
  };

  // Obsługa wyszukiwania
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSelectedCategory(null);
    setSelectedTag(null);
    
    try {
      const searchResults = await searchRecipesByTitle(searchQuery);
      
      // Sortowanie wyników wyszukiwania według ocen
      const sortedResults = sortRecipesByRating(searchResults);
      
      setFilteredRecipes(sortedResults);
      setSearchActive(true);
    } catch (error) {
      console.error('Błąd podczas wyszukiwania:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipePress = (recipeId) => {
    navigation.navigate('RecipeDetail', { recipeId });
  };

  // Czyszczenie filtrów
  const clearFilters = () => {
    console.log('Czyszczenie filtrów');
    setSelectedCategory(null);
    setSelectedTag(null);
    setSelectedDifficulty(null);
    setFilteredRecipes(recipes);
    setSearchActive(false);
  };

  // Wylogowanie używając funkcji z kontekstu uwierzytelniania
  const handleLogout = async () => {
    try {
      console.log("Rozpoczynam wylogowywanie poprzez kontekst uwierzytelniania...");
      
      const result = await logout();
      
      if (result.success) {
        console.log("Wylogowanie zakończone pomyślnie");
      } else {
        console.error("Błąd podczas wylogowywania:", result.error);
      Alert.alert(
          "Błąd wylogowania",
          "Nie udało się wylogować: " + result.error
      );
      }
    } catch (error) {
      console.error("Nieoczekiwany błąd podczas wylogowywania:", error);
      Alert.alert(
        "Błąd wylogowania",
        "Nie udało się wylogować: " + error.message
      );
    }
  };

  // Funkcja usuwająca kategorie z listy tagów
  const removeCategoriesFromTags = (tags) => {
    if (!tags || !Array.isArray(tags)) return [];
    
    // Zamień kategorie na małe litery dla porównania
    const categoriesLower = CATEGORIES.map(cat => cat.toLowerCase());
    
    // Filtruj tagi, usuwając te, które są kategoriami
    return tags.filter(tag => 
      !categoriesLower.includes(tag.toLowerCase()) && 
      // Usuń również tagi zawierające słowa "danie główne", "zupa" itp.
      !categoriesLower.some(cat => tag.toLowerCase().includes(cat))
    );
  };

  // Otwieranie menu
  const [menuVisible, setMenuVisible] = useState(false);
  
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };
  
  const navigateToScreen = (screenName, params = {}) => {
    setMenuVisible(false);
    navigation.navigate(screenName, params);
  };

  // Po pobraniu przepisów, preloaduj zdjęcia
  useEffect(() => {
    const preloadImages = async () => {
      if (!recipes || recipes.length === 0) return;
      
      console.log('Preloadowanie zdjęć przepisów...');
      
      // Preloaduj tylko pierwszych 10 zdjęć, aby nie przeciążać pamięci
      const recipesToPreload = recipes.slice(0, 10);
      
      // Rozpocznij preloadowanie w tle
      const preloadPromises = recipesToPreload
        .filter(recipe => recipe.imageUrl)
        .map(recipe => getImageFromCache(recipe.imageUrl));
      
      // Czekaj na załadowanie wszystkich zdjęć
      try {
        await Promise.all(preloadPromises);
        console.log('Preloadowanie zdjęć zakończone');
      } catch (error) {
        console.error('Błąd podczas preloadowania zdjęć:', error);
      }
    };
    
    // Wywołaj preloadowanie jeśli mamy przepisy
    if (recipes && recipes.length > 0) {
      preloadImages();
    }
  }, [recipes]);

  // Odświeżanie przepisów za każdym razem gdy ekran jest w fokusie
  useFocusEffect(
    useCallback(() => {
      console.log('HomeScreen uzyskał fokus - odświeżam przepisy...');
      fetchRecipes();
    }, [fetchRecipes])
  );

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Nagłówek */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Wyloguj</Text>
          </TouchableOpacity>
        <Text style={styles.title}>Kucharz</Text>
        <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="menu" size={28} color={COLORS.primary} />
        </View>
        </TouchableOpacity>
      </View>
      
      {/* Menu boczne */}
      {menuVisible && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuBackground} onPress={toggleMenu} />
          <View style={styles.sideMenu}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={toggleMenu} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            {/* Ulubione przepisy */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigateToScreen('Favorites')}
            >
              <Ionicons name="heart-outline" size={24} color={COLORS.primary} />
              <Text style={styles.menuItemText}>Ulubione przepisy</Text>
            </TouchableOpacity>

            {/* Dodaj przepis */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigateToScreen('AddRecipe')}
            >
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
              <Text style={styles.menuItemText}>Dodaj przepis</Text>
            </TouchableOpacity>
            
            {/* Lista zakupów */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigateToScreen('ShoppingList')}
            >
              <Ionicons name="cart-outline" size={24} color={COLORS.primary} />
              <Text style={styles.menuItemText}>Lista zakupów</Text>
            </TouchableOpacity>

            {/* Historia gotowania */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigateToScreen('CookingHistory')}
            >
              <Ionicons name="time-outline" size={24} color={COLORS.primary} />
              <Text style={styles.menuItemText}>Historia gotowania</Text>
            </TouchableOpacity>

            {/* Zmień preferencje */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigateToScreen('Preferences')}
            >
              <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
              <Text style={styles.menuItemText}>Zmień preferencje</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj przepisu..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={searchQuery ? handleSearch : clearFilters}
        >
          <Text style={styles.searchButtonText}>
            {searchQuery ? "Szukaj" : "Wyczyść"}
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Ładowanie przepisów...</Text>
          </View>
        ) : (
          <>
            {searchActive ? (
              <>
              <View style={styles.resultsHeader}>
                  <TouchableOpacity onPress={clearFilters} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Wróć</Text>
                  </TouchableOpacity>
                <Text style={styles.resultsText}>
                    {selectedCategory 
                      ? `Kategoria: ${selectedCategory}` 
                      : selectedTag
                        ? `Tag: ${selectedTag}`
                        : selectedDifficulty
                          ? `Trudność: ${selectedDifficulty}`
                          : `Znaleziono ${filteredRecipes.length} przepisów`}
                </Text>
                  <TouchableOpacity onPress={clearFilters}>
                  <Text style={styles.clearText}>Wyczyść filtry</Text>
                </TouchableOpacity>
              </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                    {searchQuery 
                      ? 'Wyniki wyszukiwania' 
                      : selectedCategory 
                        ? `Przepisy z kategorii: ${selectedCategory}`
                        : selectedTag
                          ? `Przepisy z tagiem: ${selectedTag}`
                          : selectedDifficulty
                            ? `Przepisy o trudności: ${selectedDifficulty}`
                            : 'Wyniki wyszukiwania'}
              </Text>
              
              {filteredRecipes.length > 0 ? (
                <View style={styles.recipeList}>
                  {filteredRecipes.map((recipe) => (
                        <View key={recipe.id} style={styles.recipeCardContainer}>
                    <RecipeCard 
                      recipe={recipe}
                      onPress={() => handleRecipePress(recipe.id)}
                    />
                        </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noRecipes}>
                  <Text style={styles.noRecipesText}>
                    Nie znaleziono przepisów odpowiadających kryteriom.
                  </Text>
                </View>
              )}
            </View>
            
                {/* Wyświetlanie informacji o aktualnie wybranym filtrze */}
                <View style={styles.activeFilterContainer}>
                  {selectedCategory ? (
                    <Text style={styles.activeFilterText}>
                      Kategoria: <Text style={styles.filterHighlight}>{selectedCategory}</Text>
                    </Text>
                  ) : selectedTag ? (
                    <Text style={styles.activeFilterText}>
                      Tag: <Text style={styles.filterHighlight}>{selectedTag}</Text>
                    </Text>
                  ) : selectedDifficulty ? (
                    <Text style={styles.activeFilterText}>
                      Trudność: <Text style={styles.filterHighlight}>{selectedDifficulty}</Text>
                    </Text>
                  ) : null}
                  <TouchableOpacity onPress={clearFilters} style={styles.clearFilterButton}>
                    <Text style={styles.clearFilterText}>Wyczyść filtr</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Kategorie */}
                <View style={styles.categoriesContainer}>
                  <Text style={styles.sectionTitle}>Kategorie</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {CATEGORIES.map((category, index) => (
                  <TouchableOpacity 
                        key={index}
                        style={[
                          styles.categoryButton,
                          selectedCategory === category ? styles.selectedCategory : null
                        ]}
                        onPress={() => handleCategoryPress(category)}
                  >
                        <Text style={[
                          styles.categoryText,
                          selectedCategory === category ? styles.selectedCategoryText : null
                        ]}>
                          {category}
                        </Text>
                  </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                {/* Popularne tagi */}
                <View style={styles.tagsContainer}>
                  <Text style={styles.sectionTitle}>Popularne tagi</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {AVAILABLE_TAGS.map((tag, index) => (
                  <TouchableOpacity 
                        key={index}
                        style={[
                          styles.tagButton,
                          selectedTag === tag ? styles.selectedTag : null
                        ]}
                        onPress={() => handleTagPress(tag)}
                  >
                        <Text style={[
                          styles.tagText,
                          selectedTag === tag ? styles.selectedTagText : null
                        ]}>
                          {tag}
                        </Text>
                  </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                {/* Poziomy trudności */}
                <View style={styles.difficultyContainer}>
                  <Text style={styles.sectionTitle}>Trudność</Text>
                  <View style={styles.difficultyButtonsContainer}>
                    {DIFFICULTY_LEVELS.map((difficulty, index) => (
                      <TouchableOpacity 
                        key={index}
                        style={[
                          styles.difficultyButton,
                          selectedDifficulty === difficulty ? styles.selectedDifficulty : null
                        ]}
                        onPress={() => handleDifficultyPress(difficulty)}
                      >
                        <Text style={[
                          styles.difficultyText,
                          selectedDifficulty === difficulty ? styles.selectedDifficultyText : null
                        ]}>
                          {difficulty}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                {/* Wszystkie przepisy - teraz poniżej kategorii, tagów i ulubionych */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Wszystkie przepisy</Text>
                  {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} />
                  ) : recipes.length === 0 ? (
                    <View style={styles.noRecipes}>
                      <Text style={styles.noRecipesText}>
                        Brak przepisów do wyświetlenia
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.recipeList}>
                      {filteredRecipes.map((recipe) => (
                        <View key={recipe.id} style={styles.recipeCardContainer}>
                          <RecipeCard
                            recipe={recipe}
                            onPress={() => handleRecipePress(recipe.id)}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}
          </>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
    paddingTop: 50,
  },
  logoutButton: {
    padding: 10,
    marginBottom: 5,
  },
  logoutText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  menuButton: {
    padding: 10,
    marginBottom: 5,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  
  // Style dla menu
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: 'row',
  },
  menuBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sideMenu: {
    width: '70%',
    backgroundColor: COLORS.white,
    paddingTop: 50,
    paddingHorizontal: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
  },
  menuItemText: {
    fontSize: 18,
    marginLeft: 15,
    color: COLORS.text,
  },
  searchContainer: {
    padding: 15,
    flexDirection: 'row',
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  searchButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  resultsText: {
    color: COLORS.lightText,
  },
  clearText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.lightText,
  },
  section: {
    marginBottom: 25,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.text,
    paddingLeft: 5,
  },
  recipeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  recipeCardContainer: {
    width: '48%', // Szerokość karty z uwzględnieniem odstępu
    marginBottom: 20, // Odstęp pionowy między kartami
  },
  noRecipes: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    alignItems: 'center',
  },
  noRecipesText: {
    color: COLORS.lightText,
    fontSize: 16,
  },
  categoriesContainer: {
    marginBottom: 20,
    paddingLeft: 16,
  },
  categoryButton: {
    padding: 10,
    marginRight: 10,
    backgroundColor: COLORS.secondary,
    borderRadius: 5,
  },
  categoryText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectedCategory: {
    backgroundColor: COLORS.primary,
  },
  selectedCategoryText: {
    fontWeight: 'bold',
    color: COLORS.white,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  tagScrollView: {
    marginBottom: 10,
  },
  tagContainer: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  tagItem: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  tagText: {
    color: COLORS.white,
    fontWeight: '500',
    fontSize: 14,
  },
  activeFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 10,
  },
  activeFilterText: {
    fontSize: 14,
    color: COLORS.text,
  },
  filterHighlight: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  clearFilterButton: {
    padding: 5,
  },
  clearFilterText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  tagsContainer: {
    marginBottom: 20,
    paddingLeft: 16,
  },
  tagButton: {
    padding: 10,
    marginRight: 10,
    backgroundColor: COLORS.secondary,
    borderRadius: 5,
  },
  selectedTag: {
    backgroundColor: COLORS.primary,
  },
  selectedTagText: {
    fontWeight: 'bold',
    color: COLORS.white,
  },
  difficultyContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  difficultyButtonsContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    justifyContent: 'flex-start',
  },
  difficultyButton: {
    padding: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  difficultyText: {
    color: COLORS.white,
    fontWeight: '500',
    fontSize: 16,
  },
  selectedDifficulty: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  selectedDifficultyText: {
    fontWeight: 'bold',
    color: COLORS.white,
  },
  centeredTitle: {
    textAlign: 'center',
  },
});

export default HomeScreen; 