import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/colors';
import { useAuth } from '../config/AuthContext';
import { getUserReviewedRecipes } from '../services/reviewService';
import { getRecipeById } from '../services/recipeService';
import RecipeCard from '../components/RecipeCard';

const CookingHistoryScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    loadCookingHistory();
  }, []);

  const loadCookingHistory = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Pobierz ocenione przepisy użytkownika
      const userReviews = await getUserReviewedRecipes(currentUser.uid);
      
      // Dla każdej oceny pobierz szczegóły przepisu
      const reviewedRecipes = [];
      
      for (const review of userReviews) {
        try {
          const recipe = await getRecipeById(review.recipeId);
          if (recipe) {
            // Dodaj informację o ocenie użytkownika do przepisu
            reviewedRecipes.push({
              ...recipe,
              userRating: review.rating,
              reviewDate: review.createdAt || review.updatedAt
            });
          }
        } catch (err) {
          console.error(`Błąd podczas pobierania przepisu ${review.recipeId}:`, err);
        }
      }
      
      // Sortuj przepisy według daty oceny (od najnowszych)
      const sortedRecipes = reviewedRecipes.sort((a, b) => {
        const dateA = a.reviewDate ? new Date(a.reviewDate.seconds * 1000) : new Date(0);
        const dateB = b.reviewDate ? new Date(b.reviewDate.seconds * 1000) : new Date(0);
        return dateB - dateA;
      });
      
      setRecipes(sortedRecipes);
    } catch (error) {
      console.error('Błąd podczas ładowania historii gotowania:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipePress = (recipeId) => {
    navigation.navigate('RecipeDetail', { recipeId });
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={80} color={COLORS.lightGrey} />
      <Text style={styles.emptyText}>Brak historii gotowania</Text>
      <Text style={styles.emptySubText}>
        Oceń przepisy, aby zapisać je w historii gotowania
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
        <Text style={styles.title}>Historia gotowania</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Ładowanie historii...</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.recipeItem}>
              <RecipeCard
                recipe={item}
                onPress={() => handleRecipePress(item.id)}
              />
              <View style={styles.userRatingContainer}>
                <Text style={styles.userRatingLabel}>Twoja ocena:</Text>
                <View style={styles.userRatingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= item.userRating ? "star" : "star-outline"}
                      size={16}
                      color={COLORS.primary}
                      style={styles.starIcon}
                    />
                  ))}
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={renderEmptyList}
          contentContainerStyle={recipes.length === 0 ? { flex: 1 } : { padding: 16 }}
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
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    color: COLORS.text,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    color: COLORS.lightText,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  browseButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  recipeItem: {
    marginBottom: 20,
  },
  userRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: 8,
    marginTop: -8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userRatingLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginRight: 8,
  },
  userRatingStars: {
    flexDirection: 'row',
  },
  starIcon: {
    marginHorizontal: 2,
  }
});

export default CookingHistoryScreen;
 