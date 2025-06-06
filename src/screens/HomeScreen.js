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
import { getRecipes, searchRecipesByTitle, getRecipesByTag, updateRecipeTags, getRecipesByCategory } from '../services/recipeService';
import { COLORS } from '../config/colors';
import { useAuth } from '../config/AuthContext';
import { useFavorites } from '../config/FavoritesContext';
import { useReviews } from '../config/ReviewsContext';
import { Ionicons } from '@expo/vector-icons';

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

const HomeScreen = ({ navigation }) => {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  
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

  // Dodawanie przykładowych tagów do przepisów
  const addSampleTagsToRecipes = useCallback(async (recipesList) => {
    try {
      const recipesNeedingTags = recipesList.filter(recipe => !recipe.tags || !Array.isArray(recipe.tags) || recipe.tags.length === 0);
      
      if (recipesNeedingTags.length === 0) {
        console.log('Wszystkie przepisy mają już tagi');
        return;
      }
      
      console.log(`Dodawanie tagów do ${recipesNeedingTags.length} przepisów...`);
      
      for (const recipe of recipesNeedingTags) {
        let tags = [];
        
        // Dodaj tagi na podstawie kategorii
        if (recipe.category && CATEGORY_TAG_MAPPING[recipe.category]) {
          tags.push(...CATEGORY_TAG_MAPPING[recipe.category]);
        }
        
        // Dodaj tagi na podstawie tytułu
        if (recipe.title) {
          Object.keys(RECIPE_TAG_MAPPING).forEach(keyword => {
            if (recipe.title.toLowerCase().includes(keyword.toLowerCase())) {
              tags.push(...RECIPE_TAG_MAPPING[keyword]);
            }
          });
        }
        
        // Dodaj domyślne tagi, jeśli nie znaleziono żadnych
        if (tags.length === 0) {
          tags.push(AVAILABLE_TAGS[Math.floor(Math.random() * AVAILABLE_TAGS.length)]);
          tags.push(AVAILABLE_TAGS[Math.floor(Math.random() * AVAILABLE_TAGS.length)]);
        }
        
        // Usuń kategorie z tagów
        tags = removeCategoriesFromTags(tags);
        
        // Usuń duplikaty i ogranicz do 3 tagów
        const uniqueTags = [...new Set(tags)].slice(0, 3);
        
        // Dodaj losowy tag, jeśli po usunięciu kategorii nic nie zostało
        if (uniqueTags.length === 0) {
          uniqueTags.push(AVAILABLE_TAGS[Math.floor(Math.random() * AVAILABLE_TAGS.length)]);
        }
        
        console.log(`Dodawanie tagów do przepisu "${recipe.title}": ${uniqueTags.join(', ')}`);
        
        // Aktualizuj przepis z tagami
        const success = await updateRecipeTags(recipe.id, uniqueTags);
        if (success) {
          console.log(`Pomyślnie dodano tagi do przepisu "${recipe.title}"`);
        } else {
          console.error(`Nie udało się dodać tagów do przepisu "${recipe.title}"`);
        }
      }
      
      console.log('Zakończono dodawanie tagów do przepisów');
      
      // Ponownie pobierz przepisy, aby zobaczyć zaktualizowane tagi
      console.log('Odświeżanie listy przepisów...');
      const updatedRecipes = await getRecipes();
      setRecipes(updatedRecipes);
      setFilteredRecipes(updatedRecipes);
      
    } catch (error) {
      console.error('Błąd podczas dodawania przykładowych tagów:', error);
    }
  }, []);

  // Sortowanie przepisów według ocen (od najwyższej do najniższej)
  const sortRecipesByRating = useCallback((recipesToSort) => {
    console.log('Sortowanie przepisów według ocen...');
    return [...recipesToSort].sort((a, b) => {
      const aRating = a.avgRating || 0;
      const bRating = b.avgRating || 0;
      return bRating - aRating;
    });
  }, []);

  // Pobieranie przepisów z bazy danych
  const fetchRecipes = useCallback(async () => {
      setLoading(true);
    try {
      console.log('Pobieranie przepisów...');
      let recipesData = await getRecipes();
      
      // Upewnij się, że każdy przepis ma poprawny format tagów (tablica)
      recipesData = recipesData.map(recipe => {
        if (!recipe.tags || !Array.isArray(recipe.tags)) {
          console.log(`Naprawianie formatu tagów dla przepisu "${recipe.title}"`);
          return { ...recipe, tags: [] };
        }
        return recipe;
      });
      
      console.log(`Pobrano ${recipesData.length} przepisów`);
      
      // Jeśli nie ma przepisów z tagami, dodaj przykładowe tagi
      const hasAnyTags = recipesData.some(recipe => 
        recipe.tags && Array.isArray(recipe.tags) && recipe.tags.length > 0
      );
      
      if (!hasAnyTags && recipesData.length > 0) {
        console.log('Żaden przepis nie ma tagów, dodawanie przykładowych tagów...');
        await addSampleTagsToRecipes(recipesData);
      } else {
        console.log('Niektóre przepisy już mają tagi');
      }
      
      // Posortuj przepisy według ocen (od najwyższej do najniższej)
      const sortedRecipes = sortRecipesByRating(recipesData);
      
      setRecipes(sortedRecipes);
      setFilteredRecipes(sortedRecipes);
      
    } catch (error) {
      console.error('Błąd podczas pobierania przepisów:', error);
      Alert.alert('Błąd', 'Wystąpił problem podczas ładowania przepisów.');
    } finally {
      setLoading(false);
    }
  }, [addSampleTagsToRecipes, sortRecipesByRating]);

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
    console.log(`\n\n======= KLIKNIĘTO TAG: ${tag} =======`);
    setSelectedTag(tag);
    setSelectedCategory(null);
    setLoading(true);
    
    try {
      // Pobieranie przepisów z wybranym tagiem
      const taggedRecipes = await getRecipesByTag(tag);
      console.log(`Otrzymano ${taggedRecipes.length} przepisów po filtracji tagiem ${tag}`);
      
      // Sprawdź, czy faktycznie mamy przepisy z tym tagiem
      if (taggedRecipes.length === 0) {
        console.log(`Nie znaleziono przepisów z tagiem: ${tag}`);
        setFilteredRecipes([]);
        setSearchActive(true);
        return;
      }
      
      // Sprawdź, które przepisy mają tagi w poprawnym formacie
      console.log("Sprawdzanie formatów tagów w otrzymanych przepisach:");
      taggedRecipes.forEach(recipe => {
        console.log(`Przepis "${recipe.title}":`);
        console.log(`  tagi: ${typeof recipe.tags}, ${Array.isArray(recipe.tags) ? 'jest tablicą' : 'nie jest tablicą'}`);
        if (recipe.tags && Array.isArray(recipe.tags)) {
          console.log(`  zawartość: ${recipe.tags.join(', ')}`);
          const hasTag = recipe.tags.some(t => t.toLowerCase() === tag.toLowerCase());
          console.log(`  czy zawiera tag '${tag}': ${hasTag ? 'TAK' : 'NIE'}`);
        }
      });
      
      // Sprawdzamy, czy każdy przepis faktycznie ma ten tag
      const verifiedRecipes = taggedRecipes.filter(recipe => 
        recipe.tags && 
        Array.isArray(recipe.tags) && 
        recipe.tags.some(t => t.toLowerCase() === tag.toLowerCase())
      );
      
      console.log(`Po dodatkowej weryfikacji: ${verifiedRecipes.length} przepisów ma tag ${tag}`);
      
      if (verifiedRecipes.length === 0) {
        console.log(`Po weryfikacji nie znaleziono przepisów z tagiem: ${tag}`);
        setFilteredRecipes([]);
        setSearchActive(true);
        return;
      }
      
      // Sortowanie przepisów według ocen
      const sortedRecipes = sortRecipesByRating(verifiedRecipes);
      
      // Tworzymy listę przepisów do wyświetlenia
      setFilteredRecipes(sortedRecipes);
      setSearchActive(true);
      console.log(`Wyświetlanie ${sortedRecipes.length} przepisów z tagiem ${tag}`);
      console.log("======= ZAKOŃCZONO FILTROWANIE =======\n\n");
    } catch (error) {
      console.error("Błąd podczas filtrowania po tagu:", error);
      setFilteredRecipes([]);
    } finally {
      setLoading(false);
    }
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
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => navigateToScreen('Preferences')}
            >
              <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
              <Text style={styles.menuItemText}>Zmień preferencje</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => navigateToScreen('Favorites')}
            >
              <Ionicons name="heart-outline" size={24} color={COLORS.primary} />
              <Text style={styles.menuItemText}>Ulubione przepisy</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => navigateToScreen('AddRecipe')}
            >
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
              <Text style={styles.menuItemText}>Dodaj przepis</Text>
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
});

export default HomeScreen; 