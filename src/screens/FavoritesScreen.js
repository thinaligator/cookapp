import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFavorites } from '../config/FavoritesContext';
import RecipeCard from '../components/RecipeCard';
import { COLORS } from '../config/colors';

const FavoritesScreen = ({ navigation }) => {
  const { favoriteRecipes } = useFavorites();
  const [loading, setLoading] = useState(true);
  const [sortedRecipes, setSortedRecipes] = useState([]);

  useEffect(() => {
    // Sortowanie przepisów według ocen (avgRating) zawartych w obiekcie przepisu
    const sorted = [...favoriteRecipes].sort((a, b) => {
      const aRating = a.avgRating || 0;
      const bRating = b.avgRating || 0;
      return bRating - aRating;
    });
    
    setSortedRecipes(sorted);
    setLoading(false);
  }, [favoriteRecipes]);

  const handleRecipePress = (recipeId) => {
    navigation.navigate('RecipeDetail', { recipeId });
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={80} color={COLORS.lightGrey} />
      <Text style={styles.emptyText}>Nie masz jeszcze ulubionych przepisów</Text>
      <Text style={styles.emptySubText}>
        Dodawaj przepisy do ulubionych, klikając ikonę serca na karcie przepisu
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.browseButtonText}>Przeglądaj przepisy</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Nagłówek */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Ulubione przepisy</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Zawartość */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={sortedRecipes}
          renderItem={({ item }) => (
            <View style={styles.recipeCardContainer}>
              <RecipeCard
                recipe={item}
                onPress={() => handleRecipePress(item.id)}
              />
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.recipeList}
          numColumns={2}
          ListEmptyComponent={renderEmptyList}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
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
  backButton: {
    padding: 10,
    marginBottom: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  placeholder: {
    width: 34, // Taka sama szerokość jak backButton, aby tytuł był wycentrowany
  },
  recipeList: {
    padding: 15,
    paddingBottom: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.lightText,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  browseButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  recipeCardContainer: {
    width: '48%',
  },
});

export default FavoritesScreen; 