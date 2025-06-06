import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getRecipeById } from '../services/recipeService';
import { COLORS } from '../config/colors';
import { useAuth } from '../config/AuthContext';
import { useFavorites } from '../config/FavoritesContext';
import { useReviews } from '../config/ReviewsContext';
import StarRating from '../components/StarRating';
import Icon from 'react-native-vector-icons/Ionicons';

// Komponent pojedynczej recenzji
const ReviewItem = ({ review }) => {
  return (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewUserName}>{review.userName}</Text>
        <StarRating rating={review.rating} size={14} />
      </View>
      {review.comment && (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      )}
    </View>
  );
};

const RecipeDetailScreen = ({ route, navigation }) => {
  const { recipeId } = route.params || {};
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  const { currentUser } = useAuth();
  const { isFavorite: checkFavorite, addFavorite, removeFavorite } = useFavorites();
  const { 
    recipeReviews: reviews, 
    userReview, 
    setCurrentRecipe, 
    submitReview 
  } = useReviews();

  // Przykładowe dane przepisu (normalnie będą pobierane z Firebase)
  const sampleRecipe = {
    id: '1',
    title: "Spaghetti Bolognese",
    prepTime: "20 min",
    cookTime: "30 min",
    servings: 4,
    difficulty: "Średni",
    avgRating: 4.5,
    ratingCount: 12,
    ingredients: [
      "400g mielonego mięsa wołowego",
      "1 cebula",
      "2 ząbki czosnku",
      "1 marchewka",
      "1 łodyga selera naciowego",
      "400g pomidorów z puszki",
      "2 łyżki koncentratu pomidorowego",
      "300g makaronu spaghetti",
      "sól, pieprz, oregano, bazylia",
      "oliwa z oliwek",
      "parmezan do posypania"
    ],
    instructions: [
      "Cebulę i czosnek posiekaj drobno, marchewkę i seler pokrój w małą kostkę.",
      "Na patelni rozgrzej oliwę, zeszklij cebulę i czosnek.",
      "Dodaj mięso i smaż, aż będzie brązowe.",
      "Dodaj marchewkę i seler, smaż przez 2-3 minuty.",
      "Dodaj pomidory, koncentrat i przyprawy. Gotuj na małym ogniu przez 20-25 minut.",
      "W międzyczasie ugotuj makaron al dente według instrukcji na opakowaniu.",
      "Podawaj sos na makaronie, posypany parmezanem."
    ]
  };

  // Pobieramy szczegóły przepisu i sprawdzamy czy jest on w ulubionych
  useEffect(() => {
    const fetchRecipeDetails = async () => {
      if (recipeId) {
        try {
          setLoading(true);
          // Ustawiamy aktualny przepis w ReviewsContext
          setCurrentRecipe(recipeId);
          
          const recipeData = await getRecipeById(recipeId);
          if (recipeData) {
            // Debugowanie - sprawdzenie struktury danych
            console.log('Surowe dane przepisu:', JSON.stringify(recipeData, null, 2));
            console.log('Typ instrukcji:', typeof recipeData.instructions);
            if (recipeData.instructions && recipeData.instructions.length > 0) {
              console.log('Przykładowa instrukcja:', JSON.stringify(recipeData.instructions[0], null, 2));
            }
            
            // Konwertujemy składniki i instrukcje na stringi
            let ingredients = recipeData.ingredients || [];
            let instructions = recipeData.instructions || [];
            
            // Konwersja składników na stringi, jeśli są obiektami
            ingredients = ingredients.map(ingredient => {
              if (ingredient && typeof ingredient === 'object' && ingredient.name) {
                return `${ingredient.name} ${ingredient.amount ? `(${ingredient.amount})` : ''}`;
              }
              return String(ingredient);
            });
            
            // Konwersja instrukcji na stringi, sprawdzając różne możliwe formaty
            instructions = instructions.map(instruction => {
              console.log('Przetwarzanie instrukcji:', JSON.stringify(instruction));
              
              if (instruction === null || instruction === undefined) {
                return '';
              }
              
              if (typeof instruction === 'string') {
                return instruction;
              }
              
              if (typeof instruction === 'object') {
                // Sprawdzamy różne możliwe formaty
                if (instruction.text) {
                  return instruction.text;
                } else if (instruction.step) {
                  return instruction.step;
                } else if (instruction.description) {
                  return instruction.description;
                } else if (instruction.content) {
                  return instruction.content;
                } else {
                  // Jeśli nie możemy określić formatu, zwracamy jako string JSON
                  const keys = Object.keys(instruction);
                  if (keys.length > 0) {
                    // Spróbuj użyć pierwszego klucza
                    return instruction[keys[0]] || JSON.stringify(instruction);
                  }
                  return JSON.stringify(instruction);
                }
              }
              
              return String(instruction);
            });
            
            console.log('Przetworzone instrukcje:', instructions);
            
            // Upewniamy się, że dane mają wymagane pola
            const recipeWithDefaults = {
              ...recipeData,
              ingredients: ingredients,
              instructions: instructions,
              prepTime: recipeData.prepTime || 0,
              cookTime: recipeData.cookTime || 0,
              servings: recipeData.servings || 0,
              difficulty: recipeData.difficulty || 'Nieznany',
              avgRating: recipeData.avgRating || 0,
              ratingCount: recipeData.ratingCount || 0
            };
            
            // Ustawiamy przepis
            setRecipe(recipeWithDefaults);
            
            // Sprawdzamy, czy przepis jest w ulubionych
            setIsFavorite(checkFavorite(recipeId));
          } else {
            // Jeśli nie znaleziono przepisu, używamy danych przykładowych
            setRecipe(sampleRecipe);
          }
        } catch (error) {
          console.error("Błąd podczas pobierania szczegółów przepisu:", error);
          // W przypadku błędu używamy danych przykładowych
          setRecipe(sampleRecipe);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchRecipeDetails();
  }, [recipeId, currentUser, checkFavorite, setCurrentRecipe]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  // Obsługa przycisku serduszka
  const handleFavoriteToggle = async () => {
    if (!currentUser) {
      Alert.alert("Wymagane logowanie", "Musisz być zalogowany, aby dodać przepis do ulubionych.");
      return;
    }
    
    if (!recipe || !recipe.id) {
      return;
    }
    
    try {
      if (isFavorite) {
        await removeFavorite(recipe.id);
        setIsFavorite(false);
        Alert.alert("Usunięto z ulubionych", "Przepis został usunięty z ulubionych.");
      } else {
        await addFavorite(recipe.id, recipe);
        setIsFavorite(true);
        Alert.alert("Dodano do ulubionych", "Przepis został dodany do ulubionych.");
      }
    } catch (error) {
      console.error('Błąd podczas obsługi ulubionych:', error);
      Alert.alert("Błąd", "Wystąpił problem podczas zmiany statusu ulubionego przepisu.");
    }
  };

  // Funkcja do wysyłania oceny
  const handleSubmitReview = async () => {
    if (!currentUser) {
      Alert.alert('Uwaga', 'Musisz być zalogowany, aby oceniać przepisy');
      return;
    }
    
    // Upewniamy się, że rating jest liczbą i jest większy od 0
    const rating = parseInt(userRating, 10) || 0;
    if (rating === 0) {
      Alert.alert('Uwaga', 'Proszę wybrać ocenę (1-5 gwiazdek)');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Używamy funkcji z kontekstu
      const result = await submitReview(recipeId, rating, userComment);
      
      if (result.success) {
        // Aktualizujemy również przepis, aby zaktualizować średnią ocenę
        const updatedRecipe = await getRecipeById(recipeId);
        if (updatedRecipe) {
          // Konwertujemy składniki i instrukcje na stringi podobnie jak w useEffect
          let ingredients = updatedRecipe.ingredients || [];
          let instructions = updatedRecipe.instructions || [];
          
          ingredients = ingredients.map(ingredient => {
            if (ingredient && typeof ingredient === 'object' && ingredient.name) {
              return `${ingredient.name} ${ingredient.amount ? `(${ingredient.amount})` : ''}`;
            }
            return String(ingredient);
          });
          
          instructions = instructions.map(instruction => {
            if (instruction === null || instruction === undefined) {
              return '';
            }
            
            if (typeof instruction === 'string') {
              return instruction;
            }
            
            if (typeof instruction === 'object') {
              if (instruction.text) {
                return instruction.text;
              } else if (instruction.step) {
                return instruction.step;
              } else if (instruction.description) {
                return instruction.description;
              } else if (instruction.content) {
                return instruction.content;
              } else {
                const keys = Object.keys(instruction);
                if (keys.length > 0) {
                  return instruction[keys[0]] || JSON.stringify(instruction);
                }
                return JSON.stringify(instruction);
              }
            }
            
            return String(instruction);
          });
          
          const recipeWithDefaults = {
            ...updatedRecipe,
            ingredients: ingredients,
            instructions: instructions,
            prepTime: updatedRecipe.prepTime || 0,
            cookTime: updatedRecipe.cookTime || 0,
            servings: updatedRecipe.servings || 0,
            difficulty: updatedRecipe.difficulty || 'Nieznany',
            avgRating: updatedRecipe.avgRating || 0,
            ratingCount: updatedRecipe.ratingCount || 0
          };
          
          setRecipe(recipeWithDefaults);
        }
        
        // Resetujemy pole komentarza i zamykamy modal
        setUserComment('');
        setModalVisible(false);
        
        Alert.alert('Sukces', 'Twoja ocena została zapisana');
      } else {
        Alert.alert('Błąd', result.error || 'Nie udało się dodać oceny. Spróbuj ponownie później.');
      }
    } catch (error) {
      console.error("Błąd podczas dodawania recenzji:", error);
      Alert.alert('Błąd', 'Nie udało się dodać oceny. Spróbuj ponownie później.');
    } finally {
      setSubmitting(false);
    }
  };

  // Otwieranie modalu dodawania/edycji oceny
  const openReviewModal = () => {
    if (!currentUser) {
      Alert.alert('Uwaga', 'Musisz być zalogowany, aby oceniać przepisy');
      return;
    }
    
    // Jeśli użytkownik już ocenił przepis, inicjalizujemy formularz jego oceną
    if (userReview) {
      setUserRating(userReview.rating || 0);
      setUserComment(userReview.comment || '');
    } else {
      // W przeciwnym razie resetujemy formularz
      setUserRating(0);
      setUserComment('');
    }
    
    setModalVisible(true);
  };
  
  // Zamykanie modalu
  const closeReviewModal = () => {
    setModalVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Ładowanie przepisu...</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Nie znaleziono przepisu</Text>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Wróć do listy przepisów</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>← Wróć</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{recipe.title}</Text>
          <TouchableOpacity style={styles.favoriteButton} onPress={handleFavoriteToggle}>
            <Text style={[styles.favoriteIcon, isFavorite ? styles.favoriteFilled : styles.favoriteEmpty]}>
              {isFavorite ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>Zdjęcie przepisu</Text>
          {recipe.avgRating > 0 && (
            <View style={styles.ratingBadge}>
              <StarRating rating={recipe.avgRating} size={14} />
              <Text style={styles.ratingCount}>({recipe.ratingCount})</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Czas przygotowania</Text>
              <Text style={styles.infoValue}>{recipe.prepTime}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Czas gotowania</Text>
              <Text style={styles.infoValue}>{recipe.cookTime}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Porcje</Text>
              <Text style={styles.infoValue}>{recipe.servings}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Poziom trudności</Text>
              <Text style={styles.infoValue}>{recipe.difficulty}</Text>
            </View>
          </View>

          {/* Składniki */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Składniki</Text>
            {recipe.ingredients && recipe.ingredients.map((ingredient, index) => (
              <Text key={index} style={styles.ingredientText}>
                • {ingredient}
              </Text>
            ))}
          </View>

          {/* Instrukcje */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instrukcje</Text>
            {recipe.instructions && recipe.instructions.map((instruction, index) => (
              <Text key={index} style={styles.instructionText}>
                {index + 1}. {instruction}
              </Text>
            ))}
          </View>

          {/* Sekcja ocen */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Oceny i opinie</Text>
            
            {/* Przycisk oceny */}
            <TouchableOpacity 
              style={styles.rateButton} 
              onPress={openReviewModal}
            >
              <Text style={styles.rateButtonText}>
                {userReview ? 'Edytuj swoją ocenę' : 'Oceń ten przepis'}
              </Text>
            </TouchableOpacity>
            
            {/* Lista ocen */}
            {reviews.length > 0 ? (
              <View style={styles.reviewsList}>
                {reviews.map((review) => (
                  <ReviewItem key={review.id} review={review} />
                ))}
              </View>
            ) : (
              <Text style={styles.noReviews}>
                Ten przepis nie ma jeszcze ocen. Bądź pierwszy!
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal dodawania/edycji oceny */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeReviewModal}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={closeReviewModal}
            >
              <Icon name="close" size={24} color={COLORS.darkGray} />
            </TouchableOpacity>

            <View style={styles.reviewForm}>
              <Text style={styles.reviewFormTitle}>Twoja ocena</Text>
              <StarRating 
                rating={userRating} 
                interactive={true} 
                onRatingChange={setUserRating} 
              />
              <TextInput
                style={styles.commentInput}
                placeholder="Dodaj komentarz (opcjonalnie)"
                value={userComment}
                onChangeText={setUserComment}
                multiline={true}
                numberOfLines={3}
              />
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handleSubmitReview}
                disabled={submitting || userRating === 0}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Zapisywanie...' : 'Zapisz ocenę'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  backButton: {
    position: 'absolute',
    left: 15,
    top: 50,
    zIndex: 1,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '500',
  },
  favoriteButton: {
    position: 'absolute',
    right: 15,
    top: 50,
    zIndex: 1,
    width: 35,
    height: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 17.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 22,
  },
  favoriteFilled: {
    color: 'red',
  },
  favoriteEmpty: {
    color: 'white',
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: COLORS.lightText,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingCount: {
    fontSize: 12,
    color: COLORS.text,
    marginLeft: 5,
  },
  content: {
    padding: 15,
  },
  infoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  infoItem: {
    width: '48%',
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.lightText,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 5,
    color: COLORS.text,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.text,
  },
  ingredientText: {
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22,
  },
  instructionText: {
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22,
  },
  // Style dla sekcji ocen
  reviewForm: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  reviewFormTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  commentInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  reviewsList: {
    marginTop: 10,
  },
  reviewItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewUserName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  noReviews: {
    fontSize: 14,
    color: COLORS.lightText,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  rateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  rateButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});

export default RecipeDetailScreen; 