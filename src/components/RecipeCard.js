import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../config/colors';
import { useAuth } from '../config/AuthContext';
import { useFavorites } from '../config/FavoritesContext';
import StarRating from './StarRating';

const RecipeCard = ({ recipe, onPress }) => {
  const { currentUser } = useAuth();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const [isRecipeFavorite, setIsRecipeFavorite] = useState(false);
  
  // Sprawdzamy, czy przepis jest w ulubionych przy ładowaniu
  useEffect(() => {
    if (recipe && recipe.id) {
      setIsRecipeFavorite(isFavorite(recipe.id));
    }
  }, [recipe?.id, isFavorite]);

  // Obsługa przycisku serduszka
  const handleFavoriteToggle = async (event) => {
    // Zatrzymujemy propagację, aby nie wywołać onPress całego kafelka
    event.stopPropagation();
    
    if (!currentUser || !recipe || !recipe.id) {
      return;
    }
    
    try {
      if (isRecipeFavorite) {
        await removeFavorite(recipe.id);
      } else {
        await addFavorite(recipe.id, recipe);
      }
      
      // Przełączamy stan lokalny
      setIsRecipeFavorite(!isRecipeFavorite);
    } catch (error) {
      console.error('Błąd podczas obsługi ulubionych:', error);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.imagePlaceholder}>
        <Text style={styles.placeholderText}>Zdjęcie przepisu</Text>
        <TouchableOpacity 
          style={styles.favoriteButton} 
          onPress={handleFavoriteToggle}
        >
          <Text style={styles.favoriteIcon}>
            {isRecipeFavorite ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>
        
        {/* Tagi przepisu - maksymalnie 2 */}
        {recipe.tags && Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {recipe.tags.slice(0, 2).map((tag, index) => (
              <View key={`${tag}-${index}`} style={styles.tagItem}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {recipe.tags.length > 2 && (
              <Text style={styles.moreTagsText}>+{recipe.tags.length - 2}</Text>
            )}
          </View>
        )}
        
        <View style={styles.detailsContainer}>
          <View style={styles.timeAndDifficultyContainer}>
            <Text style={styles.time}>
              {typeof recipe.prepTime === 'number' && typeof recipe.cookTime === 'number'
                ? `${recipe.prepTime + recipe.cookTime} min`
                : `${recipe.prepTime || 0} + ${recipe.cookTime || 0} min`}
            </Text>
            <Text style={styles.difficulty}>{recipe.difficulty}</Text>
          </View>
          
          {recipe && recipe.avgRating > 0 && (
            <StarRating 
              rating={recipe.avgRating || 0} 
              size={14} 
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  placeholderText: {
    color: COLORS.white,
    fontWeight: '500',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  favoriteIcon: {
    fontSize: 18,
  },
  infoContainer: {
    padding: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: COLORS.text,
  },
  detailsContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  timeAndDifficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: COLORS.lightText,
  },
  difficulty: {
    fontSize: 12,
    color: COLORS.lightText,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  tagItem: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 5,
  },
  tagText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '500',
  },
  moreTagsText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default RecipeCard; 