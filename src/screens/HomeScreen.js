import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import RecipeCard from '../components/RecipeCard';
import { getRecipes, searchRecipesByTitle } from '../services/recipeService';
import { logout } from '../services/authService';
import { COLORS } from '../config/colors';

const HomeScreen = ({ navigation }) => {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);

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

  useEffect(() => {
    fetchRecipes();
  }, []);

  // Pobieranie przepisów z bazy danych
  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const recipeData = await getRecipes();
      
      // Jeśli nie ma danych z Firebase, używamy przykładowych danych
      if (recipeData && recipeData.length > 0) {
        setRecipes(recipeData);
        setFilteredRecipes(recipeData);
      } else {
        setRecipes(sampleRecipes);
        setFilteredRecipes(sampleRecipes);
      }
    } catch (error) {
      console.error("Błąd podczas pobierania przepisów:", error);
      setRecipes(sampleRecipes);
      setFilteredRecipes(sampleRecipes);
    } finally {
      setLoading(false);
    }
  };

  // Obsługa wyszukiwania
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredRecipes(recipes);
      setSearchActive(false);
      return;
    }

    setLoading(true);
    try {
      const results = await searchRecipesByTitle(searchQuery);
      setFilteredRecipes(results);
      setSearchActive(true);
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
  };

  const handleRecipePress = (recipeId) => {
    navigation.navigate('RecipeDetail', { recipeId });
  };

  const handleCategoryPress = (category) => {
    // W przyszłości przekierujemy do listy przepisów z wybranej kategorii
    console.log(`Wybrano kategorię: ${category}`);
    const filtered = recipes.filter(recipe => recipe.category === category);
    setFilteredRecipes(filtered);
    setSearchActive(true);
  };

  // Wylogowanie
  const handleLogout = async () => {
    try {
      await logout();
      navigation.navigate('Auth');
    } catch (error) {
      console.error("Błąd podczas wylogowywania:", error);
      // Nawet jeśli jest błąd, wracamy do ekranu logowania
      navigation.navigate('Auth');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kucharz App</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Wyloguj</Text>
        </TouchableOpacity>
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
            {searchActive && (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsText}>
                  Znaleziono {filteredRecipes.length} przepisów
                </Text>
                <TouchableOpacity onPress={clearSearch}>
                  <Text style={styles.clearText}>Wyczyść filtry</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {searchActive ? 'Wyniki wyszukiwania' : 'Wszystkie przepisy'}
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
            
            {!searchActive && (
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
            )}
          </>
        )}

        <View style={styles.testButtonContainer}>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={() => navigation.navigate('TestDatabase')}
          >
            <Text style={styles.testButtonText}>Test bazy danych</Text>
          </TouchableOpacity>
        </View>
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
  logoutButton: {
    position: 'absolute',
    right: 15,
    top: 50,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 16,
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
  testButtonContainer: {
    padding: 15,
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  }
});

export default HomeScreen; 