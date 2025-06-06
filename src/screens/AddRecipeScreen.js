import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/colors';
import { addRecipe } from '../services/recipeService';
import { useAuth } from '../config/AuthContext';

const AddRecipeScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Dane przepisu
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [category, setCategory] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [tags, setTags] = useState('');

  // Kategorie
  const CATEGORIES = ['Śniadanie', 'Danie główne', 'Zupa', 'Sałatka', 'Kolacja', 'Deser'];
  
  // Obsługa zmiany kategorii
  const handleCategorySelect = (selectedCategory) => {
    setCategory(selectedCategory);
  };
  
  // Walidacja formularza
  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Błąd', 'Podaj tytuł przepisu');
      return false;
    }
    
    if (!category) {
      Alert.alert('Błąd', 'Wybierz kategorię przepisu');
      return false;
    }
    
    if (!ingredients.trim()) {
      Alert.alert('Błąd', 'Dodaj składniki przepisu');
      return false;
    }
    
    if (!instructions.trim()) {
      Alert.alert('Błąd', 'Dodaj instrukcje przygotowania');
      return false;
    }
    
    return true;
  };
  
  // Dodawanie przepisu
  const handleAddRecipe = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Przygotowanie danych przepisu
      const recipeData = {
        title: title.trim(),
        description: description.trim(),
        prepTimeMinutes: parseInt(prepTime) || 0,
        category,
        ingredients: ingredients.trim(),
        instructions: instructions.trim(),
        authorId: currentUser?.uid || 'anonymous',
        authorName: currentUser?.displayName || currentUser?.email || 'Użytkownik',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        imageUrl: '' // Brak obsługi dodawania zdjęć w tej wersji
      };
      
      // Dodanie przepisu do bazy danych
      const recipeId = await addRecipe(recipeData);
      
      if (recipeId) {
        Alert.alert(
          'Sukces', 
          'Przepis został dodany pomyślnie!', 
          [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('Home')
            }
          ]
        );
      } else {
        Alert.alert('Błąd', 'Nie udało się dodać przepisu. Spróbuj ponownie.');
      }
    } catch (error) {
      console.error('Błąd podczas dodawania przepisu:', error);
      Alert.alert('Błąd', 'Wystąpił problem podczas dodawania przepisu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Nagłówek */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Dodaj przepis</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Formularz przepisu */}
        <View style={styles.formSection}>
          {/* Tytuł */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Tytuł*</Text>
            <TextInput
              style={styles.input}
              placeholder="Np. Spaghetti Bolognese"
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />
          </View>
          
          {/* Opis */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Opis</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Krótki opis przepisu..."
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
            />
          </View>
          
          {/* Czas przygotowania */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Czas przygotowania (minuty)</Text>
            <TextInput
              style={styles.input}
              placeholder="Np. 30"
              value={prepTime}
              onChangeText={setPrepTime}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
          
          {/* Kategoria */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Kategoria*</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
              {CATEGORIES.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.categoryButton,
                    category === item ? styles.selectedCategory : null
                  ]}
                  onPress={() => handleCategorySelect(item)}
                >
                  <Text style={[
                    styles.categoryText,
                    category === item ? styles.selectedCategoryText : null
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {/* Składniki */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Składniki*</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Składniki (każdy w nowej linii)"
              value={ingredients}
              onChangeText={setIngredients}
              multiline
              maxLength={1000}
            />
          </View>
          
          {/* Instrukcje */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Instrukcje przygotowania*</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Opisz krok po kroku przygotowanie potrawy"
              value={instructions}
              onChangeText={setInstructions}
              multiline
              maxLength={2000}
            />
          </View>
          
          {/* Tagi */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Tagi (oddzielone przecinkami)</Text>
            <TextInput
              style={styles.input}
              placeholder="Np. wegetariańskie, szybkie, fit"
              value={tags}
              onChangeText={setTags}
              maxLength={100}
            />
          </View>
        </View>
        
        {/* Przycisk dodawania */}
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={handleAddRecipe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.addButtonText}>Dodaj przepis</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    marginRight: 10,
  },
  categoryText: {
    color: COLORS.text,
    fontWeight: '500',
  },
  selectedCategory: {
    backgroundColor: COLORS.primary,
  },
  selectedCategoryText: {
    color: COLORS.white,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddRecipeScreen; 