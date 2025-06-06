import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import RecipeCard from '../components/RecipeCard';
import { getRecipes, searchRecipesByTitle } from '../services/recipeService';
import { COLORS } from '../config/colors';
import { useAuth } from '../config/AuthContext';
import { useFavorites } from '../config/FavoritesContext';
import { useReviews } from '../config/ReviewsContext';

const HomeScreen = ({ navigation }) => {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
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

  // Pobieranie przepisów z bazy danych
  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const recipeData = await getRecipes();
      
      // Jeśli nie ma danych z Firebase, używamy przykładowych danych
      const recipesToUse = recipeData && recipeData.length > 0 ? recipeData : sampleRecipes;
      
      setRecipes(recipesToUse);
      
      // Jeśli mamy aktywne wyszukiwanie lub kategorię, aktualizujemy również filtrowane przepisy
      if (selectedCategory) {
        handleCategoryPress(selectedCategory, recipesToUse);
      } else if (searchActive && searchQuery) {
        const filtered = recipesToUse.filter(recipe => 
          recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredRecipes(filtered);
      } else {
        setFilteredRecipes(recipesToUse);
      }
    } catch (error) {
      console.error("Błąd podczas pobierania przepisów:", error);
      setRecipes(sampleRecipes);
      setFilteredRecipes(sampleRecipes);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchActive, searchQuery]);

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
    fetchRecipes();
  }, [fetchRecipes]);

  // Odświeżanie po zmianie oceny
  useEffect(() => {
    if (lastRatingChange) {
      console.log('Wykryto zmianę oceny, odświeżam przepisy...');
      fetchRecipes();
    }
  }, [lastRatingChange, fetchRecipes]);

  // Obsługa wyszukiwania
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredRecipes(recipes);
      setSearchActive(false);
      setSelectedCategory(null);
      return;
    }

    setLoading(true);
    try {
      const results = await searchRecipesByTitle(searchQuery);
      setFilteredRecipes(results);
      setSearchActive(true);
      setSelectedCategory(null);
    } catch (error) {
      console.error("Błąd podczas wyszukiwania:", error);
      // Wyszukiwanie lokalne jako fallback
      const filtered = recipes.filter(recipe => 
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRecipes(filtered);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredRecipes(recipes);
    setSearchActive(false);
    setSelectedCategory(null);
  };

  const handleRecipePress = (recipeId) => {
    navigation.navigate('RecipeDetail', { recipeId });
  };

  const handleCategoryPress = (category, recipesList = recipes) => {
    setSelectedCategory(category);
    
    // Filtrujemy przepisy z wybranej kategorii
    const categoryRecipes = recipesList.filter(recipe => recipe.category === category);
    
    // Pobieramy ulubione przepisy z tej kategorii
    const categoryFavorites = favoriteRecipes.filter(recipe => recipe.category === category);
    
    // Tworzymy nową listę, która najpierw zawiera ulubione z kategorii, a następnie pozostałe
    const filteredIds = categoryFavorites.map(recipe => recipe.id);
    const nonFavorites = categoryRecipes.filter(recipe => !filteredIds.includes(recipe.id));
    
    // Łączymy obie listy
    const combined = [...categoryFavorites, ...nonFavorites];
    setFilteredRecipes(combined);
    
    setSearchActive(true);
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

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kucharz App</Text>
        <View style={styles.userInfo}>
          <Text style={styles.userText}>
            Witaj, {currentUser?.displayName || currentUser?.email || 'Gość'}
          </Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Wyloguj</Text>
          </TouchableOpacity>
        </View>
      </View>
      
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
          onPress={searchQuery ? handleSearch : clearSearch}
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
                  <TouchableOpacity onPress={clearSearch} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Wróć</Text>
                  </TouchableOpacity>
                  <Text style={styles.resultsText}>
                    {selectedCategory 
                      ? `Kategoria: ${selectedCategory}` 
                      : `Znaleziono ${filteredRecipes.length} przepisów`}
                  </Text>
                  <TouchableOpacity onPress={clearSearch}>
                    <Text style={styles.clearText}>Wyczyść filtry</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {searchQuery 
                      ? 'Wyniki wyszukiwania' 
                      : selectedCategory 
                        ? `Przepisy z kategorii: ${selectedCategory}` 
                        : 'Wyniki kategorii'}
                  </Text>
                  
                  {filteredRecipes.length > 0 ? (
                    <View style={styles.recipeList}>
                      {filteredRecipes.map((recipe) => (
                        <RecipeCard 
                          key={recipe.id}
                          recipe={recipe}
                          onPress={() => handleRecipePress(recipe.id)}
                        />
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
              </>
            ) : (
              <>
                {/* Kategorie - teraz zawsze na górze */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Kategorie</Text>
                  <View style={styles.categoryList}>
                    <TouchableOpacity 
                      style={styles.categoryItem}
                      onPress={() => handleCategoryPress('Desery')}
                    >
                      <Text style={styles.categoryText}>Desery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.categoryItem}
                      onPress={() => handleCategoryPress('Dania główne')}
                    >
                      <Text style={styles.categoryText}>Dania główne</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.categoryItem}
                      onPress={() => handleCategoryPress('Zupy')}
                    >
                      <Text style={styles.categoryText}>Zupy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.categoryItem}
                      onPress={() => handleCategoryPress('Sałatki')}
                    >
                      <Text style={styles.categoryText}>Sałatki</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Ulubione przepisy - pomiędzy kategoriami a wszystkimi przepisami */}
                {currentUser && favoriteRecipes.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Twoje ulubione przepisy</Text>
                    <View style={styles.recipeList}>
                      {favoriteRecipes.map((recipe) => (
                        <RecipeCard 
                          key={recipe.id}
                          recipe={recipe}
                          onPress={() => handleRecipePress(recipe.id)}
                        />
                      ))}
                    </View>
                  </View>
                )}
                
                {/* Wszystkie przepisy - teraz poniżej kategorii i ulubionych */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Wszystkie przepisy</Text>
                  
                  {recipes.length > 0 ? (
                    <View style={styles.recipeList}>
                      {recipes.map((recipe) => (
                        <RecipeCard 
                          key={recipe.id}
                          recipe={recipe}
                          onPress={() => handleRecipePress(recipe.id)}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.noRecipes}>
                      <Text style={styles.noRecipesText}>
                        Brak przepisów do wyświetlenia.
                      </Text>
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
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userInfo: {
    position: 'absolute',
    right: 15,
    top: 35,
    alignItems: 'flex-end',
  },
  userText: {
    color: COLORS.white,
    fontSize: 12,
    marginBottom: 5,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
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
  },
  recipeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '48%',
    marginBottom: 10,
    padding: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  categoryText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default HomeScreen; 