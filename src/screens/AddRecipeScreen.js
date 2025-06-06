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
  Platform,
  Image,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../config/colors';
import { addRecipe } from '../services/recipeService';
import { useAuth } from '../config/AuthContext';
import { uploadImage, generateUniqueFilename } from '../services/imageService';

const AddRecipeScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Dane przepisu
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState(null);
  
  // Dane timera dla kroków
  const [instructionTimers, setInstructionTimers] = useState([]);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [currentTimerMinutes, setCurrentTimerMinutes] = useState('');
  const [currentTimerSeconds, setCurrentTimerSeconds] = useState('');
  const [addTimerToInstruction, setAddTimerToInstruction] = useState(false);
  const [instructionsList, setInstructionsList] = useState([]);

  // Kategorie
  const CATEGORIES = ['Śniadanie', 'Danie główne', 'Zupa', 'Sałatka', 'Kolacja', 'Deser'];
  
  // Poziomy trudności
  const DIFFICULTIES = ['Łatwy', 'Średni', 'Trudny'];
  
  // Obsługa zmiany kategorii
  const handleCategorySelect = (selectedCategory) => {
    setCategory(selectedCategory);
  };
  
  // Obsługa zmiany poziomu trudności
  const handleDifficultySelect = (selectedDifficulty) => {
    setDifficulty(selectedDifficulty);
  };
  
  // Wybieranie zdjęcia z galerii
  const pickImage = async () => {
    try {
      // Poproś o uprawnienia do galerii
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Brak uprawnień', 'Potrzebujemy dostępu do galerii, aby dodać zdjęcie.');
        return;
      }
      
      // Otwórz galerię i wybierz zdjęcie
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Błąd podczas wybierania zdjęcia:', error);
      Alert.alert('Błąd', 'Nie udało się wybrać zdjęcia. Spróbuj ponownie.');
    }
  };
  
  // Zrobienie zdjęcia aparatem
  const takePhoto = async () => {
    try {
      // Poproś o uprawnienia do aparatu
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Brak uprawnień', 'Potrzebujemy dostępu do aparatu, aby zrobić zdjęcie.');
        return;
      }
      
      // Otwórz aparat
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Błąd podczas robienia zdjęcia:', error);
      Alert.alert('Błąd', 'Nie udało się zrobić zdjęcia. Spróbuj ponownie.');
    }
  };
  
  // Usunięcie wybranego zdjęcia
  const removeImage = () => {
    setImage(null);
  };
  
  // Automatyczne wykrywanie potrzeby timera w instrukcji
  const detectTimerNeeded = (instruction) => {
    if (!instruction) return false;
    
    // Słowa kluczowe, które mogą wskazywać na potrzebę timera
    const timerKeywords = [
      'minut', 'min', 'sekund', 'sek', 'godzin', 'godz',
      'odczekaj', 'poczekaj', 'pozostaw na', 'gotuj przez',
      'smaż przez', 'piecz przez', 'gotować przez', 'smażyć przez', 'piec przez'
    ];
    
    // Wykrywanie liczb w instrukcji (np. "5 minut", "10 sekund")
    const timeRegex = /\b(\d+)\s*(?:minut|min|sekund|sek|godzin|godz)\b/i;
    const match = instruction.match(timeRegex);
    
    if (match) {
      // Znaleziono czas w instrukcji
      const timeValue = parseInt(match[1]);
      
      // Sprawdzamy, czy jest to czas w minutach czy sekundach
      const isMinutes = match[0].toLowerCase().includes('min') || 
                        match[0].toLowerCase().includes('minut') ||
                        match[0].toLowerCase().includes('godzin') ||
                        match[0].toLowerCase().includes('godz');
      
      if (isMinutes) {
        setCurrentTimerMinutes(timeValue.toString());
        setCurrentTimerSeconds('0');
      } else {
        setCurrentTimerMinutes('0');
        setCurrentTimerSeconds(timeValue.toString());
      }
      
      return true;
    }
    
    // Sprawdzamy, czy instrukcja zawiera słowa kluczowe
    return timerKeywords.some(keyword => 
      instruction.toLowerCase().includes(keyword.toLowerCase())
    );
  };
  
  // Modyfikacja obsługi zmiany tekstu instrukcji
  const handleInstructionChange = (text) => {
    setCurrentInstruction(text);
    
    // Jeśli wykryto potrzebę timera, automatycznie zaznaczamy opcję
    if (detectTimerNeeded(text)) {
      setAddTimerToInstruction(true);
    }
  };
  
  // Obsługa dodawania instrukcji z timerem
  const handleAddInstruction = () => {
    if (!currentInstruction.trim()) {
      Alert.alert('Błąd', 'Wprowadź treść instrukcji');
      return;
    }
    
    const newInstruction = {
      text: currentInstruction.trim(),
      hasTimer: addTimerToInstruction,
      timerMinutes: addTimerToInstruction ? (parseInt(currentTimerMinutes) || 0) : 0,
      timerSeconds: addTimerToInstruction ? (parseInt(currentTimerSeconds) || 0) : 0
    };
    
    setInstructionsList([...instructionsList, newInstruction]);
    setCurrentInstruction('');
    setCurrentTimerMinutes('');
    setCurrentTimerSeconds('');
    setAddTimerToInstruction(false);
  };
  
  // Obsługa usuwania instrukcji
  const handleRemoveInstruction = (index) => {
    const updatedInstructions = [...instructionsList];
    updatedInstructions.splice(index, 1);
    setInstructionsList(updatedInstructions);
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
    
    if (instructionsList.length === 0) {
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
      let imageUrl = '';
      
      // Jeśli wybrano zdjęcie, prześlij je do Firebase Storage
      if (image) {
        const filename = generateUniqueFilename();
        imageUrl = await uploadImage(image, 'recipes/', filename);
      }
      
      // Konwersja składników na tablicę
      const ingredientsArray = ingredients
        .split('\n')
        .map(item => item.trim())
        .filter(item => item !== '');
      
      // Przygotowanie danych przepisu
      const recipeData = {
        title: title.trim(),
        description: description.trim(),
        prepTime: parseInt(prepTime) || 0,
        cookTime: parseInt(cookTime) || 0,
        servings: parseInt(servings) || 0,
        difficulty: difficulty || 'Średni',
        category,
        ingredients: ingredientsArray,
        instructions: instructionsList,
        authorId: currentUser?.uid || 'anonymous',
        authorName: currentUser?.displayName || currentUser?.email || 'Użytkownik',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        imageUrl: imageUrl // URL zdjęcia z Firebase Storage
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
          {/* Zdjęcie przepisu */}
          <View style={styles.imageContainer}>
            {image ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={removeImage}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>Dodaj zdjęcie przepisu</Text>
              </View>
            )}
            
            <View style={styles.imageButtonsContainer}>
              <TouchableOpacity 
                style={[styles.imageButton, styles.galleryButton]} 
                onPress={pickImage}
              >
                <Ionicons name="images" size={18} color={COLORS.white} />
                <Text style={styles.imageButtonText}>Galeria</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.imageButton, styles.cameraButton]} 
                onPress={takePhoto}
              >
                <Ionicons name="camera" size={18} color={COLORS.white} />
                <Text style={styles.imageButtonText}>Aparat</Text>
              </TouchableOpacity>
            </View>
          </View>
          
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
          
          {/* Czas gotowania */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Czas gotowania (minuty)</Text>
            <TextInput
              style={styles.input}
              placeholder="Np. 45"
              value={cookTime}
              onChangeText={setCookTime}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
          
          {/* Liczba porcji */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Liczba porcji</Text>
            <TextInput
              style={styles.input}
              placeholder="Np. 4"
              value={servings}
              onChangeText={setServings}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
          
          {/* Poziom trudności */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Poziom trudności</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
              {DIFFICULTIES.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.categoryButton,
                    difficulty === item ? styles.selectedCategory : null
                  ]}
                  onPress={() => handleDifficultySelect(item)}
                >
                  <Text style={[
                    styles.categoryText,
                    difficulty === item ? styles.selectedCategoryText : null
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
          
          {/* Instrukcje przygotowania z timerem */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Instrukcje przygotowania</Text>
            
            {/* Lista dodanych instrukcji */}
            {instructionsList.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <View style={styles.instructionContent}>
                  <Text style={styles.instructionText}>{`${index + 1}. ${instruction.text}`}</Text>
                  {instruction.hasTimer && (
                    <View style={styles.timerInfo}>
                      <Ionicons name="timer-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.timerText}>
                        {`${instruction.timerMinutes} min ${instruction.timerSeconds} sek`}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.removeInstructionButton}
                  onPress={() => handleRemoveInstruction(index)}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
            
            {/* Dodawanie nowej instrukcji */}
            <TextInput
              style={styles.textArea}
              placeholder="Wprowadź krok przygotowania..."
              value={currentInstruction}
              onChangeText={handleInstructionChange}
              multiline
            />
            
            {/* Opcja dodania timera */}
            <View style={styles.timerOptionContainer}>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Dodaj timer do tego kroku</Text>
                <Switch
                  value={addTimerToInstruction}
                  onValueChange={setAddTimerToInstruction}
                  trackColor={{ false: '#767577', true: COLORS.primaryLight }}
                  thumbColor={addTimerToInstruction ? COLORS.primary : '#f4f3f4'}
                />
              </View>
              
              {addTimerToInstruction && (
                <View style={styles.timerInputsContainer}>
                  <View style={styles.timerInputGroup}>
                    <TextInput
                      style={styles.timerInput}
                      placeholder="0"
                      keyboardType="numeric"
                      value={currentTimerMinutes}
                      onChangeText={setCurrentTimerMinutes}
                      maxLength={2}
                    />
                    <Text style={styles.timerUnit}>min</Text>
                  </View>
                  
                  <View style={styles.timerInputGroup}>
                    <TextInput
                      style={styles.timerInput}
                      placeholder="0"
                      keyboardType="numeric"
                      value={currentTimerSeconds}
                      onChangeText={setCurrentTimerSeconds}
                      maxLength={2}
                    />
                    <Text style={styles.timerUnit}>sek</Text>
                  </View>
                </View>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.addInstructionButton}
              onPress={handleAddInstruction}
            >
              <Text style={styles.addInstructionButtonText}>Dodaj krok</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 30,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  formSection: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedCategory: {
    backgroundColor: COLORS.primary,
  },
  selectedCategoryText: {
    color: COLORS.white,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 30,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  imageContainer: {
    marginBottom: 20,
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePlaceholderText: {
    color: COLORS.lightText,
    fontSize: 16,
  },
  imagePreviewContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    padding: 5,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 0.48,
  },
  galleryButton: {
    backgroundColor: COLORS.secondary,
  },
  cameraButton: {
    backgroundColor: COLORS.primary,
  },
  imageButtonText: {
    color: COLORS.white,
    marginLeft: 5,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    color: COLORS.text,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: COLORS.lightGrey,
    borderRadius: 5,
    padding: 10,
  },
  instructionContent: {
    flex: 1,
  },
  instructionText: {
    fontSize: 14,
  },
  removeInstructionButton: {
    padding: 5,
  },
  timerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  timerText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 5,
  },
  timerOptionContainer: {
    marginTop: 10,
    marginBottom: 15,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  timerInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  timerInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  timerInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: 50,
    textAlign: 'center',
    fontSize: 16,
  },
  timerUnit: {
    marginLeft: 5,
    fontSize: 14,
    color: COLORS.text,
  },
  addInstructionButton: {
    backgroundColor: COLORS.secondary,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  addInstructionButtonText: {
    color: COLORS.white,
    fontWeight: '500',
  },
});

export default AddRecipeScreen; 