import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Image, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getRecipeById } from '../services/recipeService';
import { COLORS } from '../config/colors';
import { useAuth } from '../config/AuthContext';
import { useFavorites } from '../config/FavoritesContext';
import { useReviews } from '../config/ReviewsContext';
import StarRating from '../components/StarRating';
import Icon from 'react-native-vector-icons/Ionicons';
import { getImageFromCache } from '../services/imageCacheService';
import KitchenTimer from '../components/KitchenTimer';
import { addIngredientsToShoppingList } from '../services/shoppingListService';
import { useFocusEffect } from '@react-navigation/native';

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

// Używamy React.memo do zapobiegania niepotrzebnym renderom
const RecipeDetailScreen = React.memo(({ route, navigation }) => {
  const { recipeId } = route.params || {};
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [cachedImageUri, setCachedImageUri] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Timer state
  const [timerVisible, setTimerVisible] = useState(false);
  const [timerTitle, setTimerTitle] = useState('');
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  
  // Ref do śledzenia, czy dane zostały już załadowane
  const dataLoadedRef = useRef(false);
  
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

  // Używamy useFocusEffect zamiast useEffect dla lepszej kontroli nad cyklem życia ekranu
  useFocusEffect(
    useCallback(() => {
      // Pobieramy dane tylko raz po wejściu na ekran
      if (!dataLoadedRef.current) {
        const fetchRecipeDetails = async () => {
          if (recipeId) {
            try {
              setLoading(true);
              // Ustawiamy aktualny przepis w ReviewsContext
              setCurrentRecipe(recipeId);
              
              const recipeData = await getRecipeById(recipeId);
              
              if (recipeData) {
                // Konwertujemy składniki i instrukcje na odpowiedni format
                let ingredients = recipeData.ingredients || [];
                let instructions = recipeData.instructions || [];
                
                if (!Array.isArray(ingredients)) {
                  ingredients = [];
                  if (typeof recipeData.ingredients === 'string') {
                    ingredients = recipeData.ingredients.split('\n').filter(line => line.trim() !== '');
                  }
                }
                
                if (!Array.isArray(instructions)) {
                  instructions = [];
                  if (typeof recipeData.instructions === 'string') {
                    instructions = recipeData.instructions.split('\n').filter(line => line.trim() !== '');
                  }
                }
                
                ingredients = ingredients.map(ingredient => {
                  if (ingredient && typeof ingredient === 'object' && ingredient.name) {
                    return `${ingredient.name} ${ingredient.amount ? `(${ingredient.amount})` : ''}`;
                  }
                  return String(ingredient);
                });
                
                const processedInstructions = [];
                for (const instruction of instructions) {
                  if (instruction === null || instruction === undefined) {
                    processedInstructions.push({ text: '' });
                    continue;
                  }
                  
                  if (typeof instruction === 'object' && instruction.hasTimer) {
                    // Dodaję sprawdzenie parametrów timera
                    const timerMinutes = instruction.timerMinutes || 0;
                    const timerSeconds = instruction.timerSeconds || 0;
                    processedInstructions.push({
                      text: instruction.text || '',
                      hasTimer: true,
                      timerMinutes: timerMinutes,
                      timerSeconds: timerSeconds
                    });
                    continue;
                  }
                  
                  if (typeof instruction === 'object' && instruction.text) {
                    processedInstructions.push(instruction);
                    continue;
                  }
                  
                  if (typeof instruction === 'string') {
                    processedInstructions.push({ text: instruction });
                    continue;
                  }
                  
                  if (typeof instruction === 'object') {
                    let instructionText = '';
                    
                    if (instruction.step) {
                      instructionText = instruction.step;
                    } else if (instruction.description) {
                      instructionText = instruction.description;
                    } else if (instruction.content) {
                      instructionText = instruction.content;
                    } else {
                      const keys = Object.keys(instruction);
                      if (keys.length > 0) {
                        instructionText = instruction[keys[0]] || JSON.stringify(instruction);
                      } else {
                        instructionText = JSON.stringify(instruction);
                      }
                    }
                    
                    processedInstructions.push({ text: instructionText });
                  } else {
                    processedInstructions.push({ text: String(instruction) });
                  }
                }
                
                const recipeWithDefaults = {
                  ...recipeData,
                  ingredients: ingredients,
                  instructions: processedInstructions,
                  prepTime: recipeData.prepTime || 0,
                  cookTime: recipeData.cookTime || 0,
                  servings: recipeData.servings || 0,
                  difficulty: recipeData.difficulty || 'Nieznany',
                  avgRating: recipeData.avgRating || 0,
                  ratingCount: recipeData.ratingCount || 0
                };
                
                setRecipe(recipeWithDefaults);
                setIsFavorite(checkFavorite(recipeId));
                
                // Ładujemy obrazek jeśli istnieje
                if (recipeWithDefaults.imageUrl) {
                  try {
                    const cachedUri = await getImageFromCache(recipeWithDefaults.imageUrl);
                    setCachedImageUri(cachedUri);
                  } catch (error) {
                    console.error('Błąd podczas ładowania zdjęcia z cache:', error);
                    setCachedImageUri(recipeWithDefaults.imageUrl);
                  }
                }
              } else {
                setRecipe(sampleRecipe);
              }
            } catch (error) {
              console.error("Błąd podczas pobierania szczegółów przepisu:", error);
    setRecipe(sampleRecipe);
            } finally {
    setLoading(false);
              // Oznaczamy, że dane zostały załadowane
              dataLoadedRef.current = true;
            }
          }
        };

        fetchRecipeDetails();
      }
      
      // Funkcja czyszcząca, gdy ekran traci fokus
      return () => {
        // Możemy zresetować flagę, jeśli chcemy załadować dane ponownie po powrocie
        // dataLoadedRef.current = false;
      };
    }, [recipeId, setCurrentRecipe, checkFavorite])
  );

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
  
  // Funkcja do dodawania wszystkich składników do listy zakupów
  const handleAddAllIngredientsToShoppingList = async () => {
    try {
      if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
        Alert.alert('Informacja', 'Ten przepis nie zawiera składników do dodania do listy zakupów.');
        return;
      }
      
      const addedCount = await addIngredientsToShoppingList(recipe.ingredients, recipe.title);
      
      if (addedCount > 0) {
        Alert.alert(
          'Dodano do listy zakupów',
          `Dodano ${addedCount} składników do Twojej listy zakupów.`,
          [
            {
              text: 'OK',
              style: 'default'
            },
            {
              text: 'Przejdź do listy',
              onPress: () => navigation.navigate('ShoppingList')
            }
          ]
        );
      } else {
        Alert.alert(
          'Informacja',
          'Wszystkie składniki z tego przepisu są już na Twojej liście zakupów.'
        );
      }
    } catch (error) {
      console.error('Błąd podczas dodawania składników do listy zakupów:', error);
      Alert.alert(
        'Błąd',
        'Nie udało się dodać składników do listy zakupów. Spróbuj ponownie.'
      );
    }
  };

  // Obsługa otwarcia timera
  const handleOpenTimer = (title, minutes, seconds) => {
    try {
      console.log(`Otwieranie timera: ${title}, ${minutes} min, ${seconds} sek`);
      
      // Upewnij się, że parametry są prawidłowe
      const safeTitle = title || 'Timer';
      const safeMinutes = !isNaN(minutes) ? parseInt(minutes, 10) : 0;
      const safeSeconds = !isNaN(seconds) ? parseInt(seconds, 10) : 0;
      
      console.log(`Wartości po konwersji: ${safeTitle}, ${safeMinutes} min, ${safeSeconds} sek`);
      
      // Ustaw stan timera
      setTimerTitle(safeTitle);
      setTimerMinutes(safeMinutes);
      setTimerSeconds(safeSeconds);
      setTimerVisible(true);
    } catch (error) {
      console.error('Błąd podczas otwierania timera:', error);
      // Fallback w przypadku błędu
      setTimerTitle('Timer');
      setTimerMinutes(0);
      setTimerSeconds(0);
      setTimerVisible(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Ładowanie przepisu...</Text>
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

  // Renderowanie instrukcji z przyciskiem timera jeśli instrukcja ma timer
  const renderInstructions = () => {
    if (!recipe || !recipe.instructions) return null;
    
    // Funkcja czyszcząca tekst instrukcji z ewentualnych znaczników specjalnych
    const cleanInstructionText = (text) => {
      if (!text) return '';
      
      // Usuwamy tylko specjalne znaczniki formatowania, zachowując informacje o czasie
      return text
        .replace(/\[TIMER:(\d+):(\d+)\]/g, 'przez $1 min $2 sek') // zamiana [TIMER:5:30] na "przez 5 min 30 sek"
        .replace(/\(TIMER:\s*(\d+)\s*min\)/g, 'przez $1 min')     // zamiana (TIMER: 5 min) na "przez 5 min"
        .replace(/\[\s*(\d+)\s*min\]/g, 'przez $1 min')           // zamiana [5 min] na "przez 5 min"
        .trim();
    };
    
    // Funkcja wykrywająca czas w tekście kroku (np. "15 minut", "10 min")
    const extractTimeFromStep = (stepText) => {
      if (!stepText) return null;
      
      // Wzorce do wyszukiwania czasu
      const patterns = [
        /(\d+)\s*min(ut)?/i,         // 15 minut, 15 min
        /(\d+)\s*minut[y]?/i,        // 15 minut, 2 minuty
        /(\d+)\s*godz/i,             // 1 godz, 2 godziny
        /przez\s+(\d+)\s*min/i,      // przez 15 min
        /około\s+(\d+)\s*min/i,      // około 15 min
        /(\d+)-(\d+)\s*min/i,        // 10-15 min
        /na\s+(\d+)\s*min/i,         // na 5 min
        /po\s+(\d+)\s*min/i,         // po 10 min
        /(\d+)\s*sekund/i,           // 30 sekund
        /(\d+)\s*sek/i,              // 30 sek
        /odczekaj\s+(\d+)\s*min/i,   // odczekaj 5 min
        /odczekać\s+(\d+)\s*min/i,   // odczekać 5 min
        /czekaj\s+(\d+)\s*min/i,     // czekaj 5 min
        /poczekaj\s+(\d+)\s*min/i,   // poczekaj 5 min
        /zostaw\s+na\s+(\d+)\s*min/i, // zostaw na 10 min
        /zostaw\s+(\d+)\s*min/i,     // zostaw 10 min
        /odstaw\s+na\s+(\d+)\s*min/i, // odstaw na 10 min
        /gotuj\s+przez\s+(\d+)\s*min/i, // gotuj przez 15 min
        /gotować\s+przez\s+(\d+)\s*min/i, // gotować przez 15 min
        /smaż\s+przez\s+(\d+)\s*min/i, // smaż przez 10 min
        /smażyć\s+przez\s+(\d+)\s*min/i, // smażyć przez 10 min
        /piecz\s+przez\s+(\d+)\s*min/i, // piecz przez 20 min
        /piec\s+przez\s+(\d+)\s*min/i, // piec przez 20 min
        /piec\s+(\d+)\s*min/i,       // piec 20 min
        /podgrzewaj\s+przez\s+(\d+)\s*min/i, // podgrzewaj przez 5 min
        /podgrzewać\s+przez\s+(\d+)\s*min/i  // podgrzewać przez 5 min
      ];
      
      try {
        for (const pattern of patterns) {
          const match = stepText.match(pattern);
          if (match) {
            // Jeśli mamy zakres (np. 10-15 min), bierzemy większą wartość
            if (match[2] && !isNaN(match[2]) && pattern.toString().includes('-')) {
              const upperRange = parseInt(match[2], 10);
              return { minutes: upperRange, seconds: 0 };
            }
            
            // W przeciwnym razie bierzemy znaleziony czas
            const minutes = parseInt(match[1], 10);
            
            // Jeśli znaleźliśmy godziny, konwertujemy na minuty
            if (pattern.toString().includes('godz')) {
              return { minutes: minutes * 60, seconds: 0 };
            }
            
            // Jeśli znaleźliśmy sekundy, konwertujemy na minuty i sekundy
            if (pattern.toString().includes('sekund') || pattern.toString().includes('sek')) {
              if (minutes >= 60) {
                return { minutes: Math.floor(minutes / 60), seconds: minutes % 60 };
              } else {
                return { minutes: 0, seconds: minutes };
              }
            }
            
            return { minutes, seconds: 0 };
          }
        }
      } catch (error) {
        console.error('Błąd podczas wykrywania czasu w kroku:', error);
      }
      
      return null;
    };
    
    // Sprawdzamy czy mamy nowy format instrukcji z timerami
    const hasStructuredInstructions = recipe.instructions.some(
      instr => typeof instr === 'object' && instr.hasTimer === true
    );

    if (hasStructuredInstructions) {
      // Używamy struktury z timerami
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instrukcje przygotowania</Text>
          
          {recipe.instructions.map((instruction, index) => {
            // Bezpośrednio używamy informacji o timerze z obiektu
            const hasTimer = instruction.hasTimer === true;
            const timerMinutes = instruction.timerMinutes || 0;
            const timerSeconds = instruction.timerSeconds || 0;
            const instructionText = instruction.text || '';
            
            return (
              <View key={index} style={styles.instructionStep}>
                <View style={styles.instructionStepContent}>
                  <Text style={styles.instructionStepNumber}>{index + 1}</Text>
                  <Text style={styles.instructionStepText}>{instructionText}</Text>
                </View>
                
                {/* Przycisk timera jeśli instrukcja ma timer */}
                {hasTimer && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: COLORS.white,
                      borderRadius: 15,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: COLORS.primary,
                      marginLeft: 8,
                    }}
                    onPress={() => handleOpenTimer(`Krok ${index + 1}`, timerMinutes, timerSeconds)}
                  >
                    <Icon name="timer-outline" size={16} color={COLORS.primary} />
                    <Text style={{fontSize: 12, color: COLORS.primary, marginLeft: 4, fontWeight: '500'}}>
                      {timerMinutes} min {timerSeconds > 0 ? `${timerSeconds} sek` : ''}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      );
    }
    
    // Stara logika dla instrukcji bez struktury z timerami
    // Połącz wszystkie instrukcje w jeden tekst
    const allInstructionsText = recipe.instructions
      .map(instruction => {
        if (typeof instruction === 'string') {
          return cleanInstructionText(instruction);
        } else if (instruction && typeof instruction === 'object' && instruction.text) {
          return cleanInstructionText(instruction.text);
        } else {
          return '';
        }
      })
      .join('\n');
    
    // Podziel tekst na linie i odfiltruj puste linie
    const steps = allInstructionsText
      .split('\n')
      .map(step => step.trim())
      .filter(step => step !== '');
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instrukcje przygotowania</Text>
        
        {steps.map((step, index) => {
          // Wykryj czas w kroku
          const timeInfo = extractTimeFromStep(step);
          
          return (
            <View key={index} style={styles.instructionStep}>
              <View style={styles.instructionStepContent}>
                <Text style={styles.instructionStepNumber}>{index + 1}</Text>
                <Text style={styles.instructionStepText}>{step}</Text>
              </View>
              
              {/* Przycisk timera tylko jeśli krok zawiera informację o czasie */}
              {timeInfo && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: COLORS.white,
                    borderRadius: 15,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: COLORS.primary,
                    marginLeft: 8,
                  }}
                  onPress={() => handleOpenTimer(`Krok ${index + 1}`, timeInfo.minutes, timeInfo.seconds)}
                >
                  <Icon name="timer-outline" size={16} color={COLORS.primary} />
                  <Text style={{fontSize: 12, color: COLORS.primary, marginLeft: 4, fontWeight: '500'}}>
                    {timeInfo.minutes} min
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Ładowanie przepisu...</Text>
        </View>
      ) : recipe ? (
        <ScrollView>
          {/* Ukrywamy stary header, który już nie jest potrzebny */}
          
          {/* Zdjęcie przepisu lub placeholder z nakładką */}
          <View style={styles.recipeImageSection}>
            {cachedImageUri ? (
              <View style={styles.imageContainer}>
                {imageLoading && (
                  <View style={styles.imagePlaceholder}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.imagePlaceholderText}>Ładowanie zdjęcia...</Text>
                  </View>
                )}
                <Image 
                  source={{ uri: cachedImageUri }} 
                  style={[
                    styles.recipeImage,
                    imageLoading && { opacity: 0 } // Ukryj obraz podczas ładowania
                  ]}
                  resizeMode="cover"
                  onLoadStart={() => setImageLoading(true)}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
                {imageError && (
                  <View style={[styles.imagePlaceholder, { position: 'absolute' }]}>
                    <Text style={styles.imagePlaceholderText}>Nie udało się załadować zdjęcia</Text>
                  </View>
                )}
              </View>
            ) : (
        <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>Brak zdjęcia</Text>
              </View>
            )}
            
            {/* Przycisk powrotu */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleGoBack}
            >
              <Text style={styles.backButtonText}>Wróć</Text>
            </TouchableOpacity>
            
            {/* Przycisk ulubione */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleFavoriteToggle}
            >
              <Text style={[
                styles.favoriteIcon,
                isFavorite ? styles.favoriteFilled : styles.favoriteEmpty
              ]}>
                {isFavorite ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
            
            {/* Znaczek oceny */}
            {recipe.avgRating > 0 && (
              <View style={styles.ratingBadge}>
                <StarRating rating={recipe.avgRating} size={12} />
                <Text style={styles.ratingCount}>({recipe.ratingCount})</Text>
              </View>
            )}
        </View>

          {/* Informacje o przepisie */}
          <View style={styles.recipeContent}>
            {/* Tytuł przepisu */}
            <Text style={styles.recipeTitle}>{recipe.title}</Text>
            
            {/* Kategoria */}
            <View style={styles.categoryContainer}>
              <Text style={styles.categoryLabel}>Kategoria:</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{recipe.category}</Text>
              </View>
            </View>
            
            {/* Tagi */}
            {recipe.tags && Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                <Text style={styles.tagsHeader}>Tagi:</Text>
                <View style={styles.tagsList}>
                  {recipe.tags.map((tag, index) => (
                    <View key={`${tag}-${index}`} style={styles.tagItem}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.recipeInfo}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Czas przygotowania</Text>
                  <Text style={styles.infoValue}>{recipe.prepTime || 'Brak informacji'}</Text>
                </View>
                
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Czas gotowania</Text>
                  <Text style={styles.infoValue}>{recipe.cookTime || 'Brak informacji'}</Text>
                </View>
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
            <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Składniki</Text>
              <TouchableOpacity
                style={styles.addAllToCartButton}
                onPress={handleAddAllIngredientsToShoppingList}
              >
                <Icon name="cart-outline" size={18} color={COLORS.white} />
                <Text style={styles.addAllToCartButtonText}>Dodaj do listy zakupów</Text>
              </TouchableOpacity>
            </View>
            {recipe.ingredients && recipe.ingredients.map((ingredient, index) => (
              <Text key={index} style={styles.ingredientItem}>• {ingredient}</Text>
            ))}
          </View>

            {/* Instrukcje */}
            {renderInstructions()}

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
      ) : (
        <View style={styles.loadingContainer}>
          <Text>Nie znaleziono przepisu</Text>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Wróć do listy przepisów</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Timer Modal */}
      <KitchenTimer
        visible={timerVisible}
        onClose={() => setTimerVisible(false)}
        initialTitle={timerTitle}
        initialMinutes={timerMinutes}
        initialSeconds={timerSeconds}
        autoStart={false}
        editable={false}
      />

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
});

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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    paddingTop: 50,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 10,
    zIndex: 10,
  },
  backButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  favoriteButton: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  favoriteIcon: {
    fontSize: 22,
  },
  favoriteFilled: {
    color: 'red',
  },
  favoriteEmpty: {
    color: COLORS.primary,
  },
  imageContainer: {
    position: 'relative',
    height: 250,
    width: '100%',
  },
  imagePlaceholder: {
    height: 250,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: COLORS.white,
  },
  recipeInfo: {
    padding: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoItem: {
    width: '48%',
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.lightText,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 5,
    color: COLORS.text,
  },
  mainTimerButton: {
    padding: 5,
    marginLeft: 5,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sectionTimerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  sectionTimerText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  ingredientItem: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 10,
  },
  addAllToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  addAllToCartButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
    paddingHorizontal: 5,
  },
  instructionStepContent: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  instructionStepNumber: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
    marginRight: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  instructionStepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
    paddingTop: 2,
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: 100,
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
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    color: COLORS.text,
  },
  categoryBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
  },
  tagItem: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  tagText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  tagsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.text,
  },
  tagsList: {
    flexDirection: 'row',
  },
  recipeImage: {
    height: 250,
    width: '100%',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  ratingBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingCount: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  recipeContent: {
    padding: 15,
  },
  recipeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.text,
  },
  recipeImageSection: {
    position: 'relative',
    width: '100%',
    height: 250,
  },
  reviewForm: {
    width: '100%',
    alignItems: 'center',
  },
  reviewFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.text,
  },
  commentInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    marginTop: 20,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default RecipeDetailScreen; 