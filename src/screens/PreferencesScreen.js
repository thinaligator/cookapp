import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  TextInput,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/colors';
import { useAuth } from '../config/AuthContext';
import { getUserDietaryPreferences, updateDietaryPreferences } from '../services/userService';

const PreferencesScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [dietaryPreferences, setDietaryPreferences] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Ładowanie preferencji przy montowaniu komponentu
  useEffect(() => {
    loadDietaryPreferences();
  }, []);
  
  // Funkcja ładująca preferencje żywieniowe
  const loadDietaryPreferences = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const preferences = await getUserDietaryPreferences(currentUser.uid);
      setDietaryPreferences(preferences || []);
    } catch (error) {
      console.error('Błąd podczas ładowania preferencji żywieniowych:', error);
      Alert.alert('Błąd', 'Nie udało się załadować preferencji żywieniowych');
    } finally {
      setLoading(false);
    }
  };
  
  // Zapisywanie preferencji po zmianie
  const savePreferences = async () => {
    if (!currentUser) {
      Alert.alert('Błąd', 'Musisz być zalogowany, aby zapisać preferencje');
      return;
    }
    
    try {
      setLoading(true);
      await updateDietaryPreferences(currentUser.uid, dietaryPreferences);
      
      // Krótki alert informujący o zapisaniu preferencji
      Alert.alert(
        'Sukces', 
        'Preferencje żywieniowe zostały zapisane. Przepisy zostaną odfiltrowane.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Resetujemy nawigację do ekranu głównego, co wymusi jego pełne przeładowanie
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            }
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Błąd podczas zapisywania preferencji:', error);
      Alert.alert('Błąd', 'Nie udało się zapisać preferencji');
      setLoading(false);
    }
  };
  
  // Dodawanie nowego składnika do preferencji
  const addIngredient = () => {
    if (!newIngredient.trim()) {
      Alert.alert('Błąd', 'Proszę wprowadzić nazwę składnika');
      return;
    }
    
    // Sprawdzamy, czy składnik już istnieje
    const ingredient = newIngredient.trim().toLowerCase();
    if (dietaryPreferences.some(item => item.toLowerCase() === ingredient)) {
      Alert.alert('Informacja', 'Ten składnik już znajduje się na liście');
      return;
    }
    
    setDietaryPreferences([...dietaryPreferences, ingredient]);
    setNewIngredient('');
  };
  
  // Usuwanie składnika z preferencji
  const removeIngredient = (index) => {
    const newPreferences = [...dietaryPreferences];
    newPreferences.splice(index, 1);
    setDietaryPreferences(newPreferences);
  };

  return (
    <View style={styles.container}>
      {/* Nagłówek */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.title}>Preferencje żywieniowe</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Informacje o użytkowniku */}
        <View style={styles.userInfoSection}>
          <Ionicons name="person-circle-outline" size={80} color={COLORS.primary} />
          <Text style={styles.userName}>
            {currentUser?.displayName || currentUser?.email || 'Użytkownik'}
          </Text>
          <Text style={styles.userEmail}>{currentUser?.email || ''}</Text>
        </View>
        
        {/* Preferencje żywieniowe */}
        <View style={styles.preferencesSection}>
          <Text style={styles.sectionTitle}>Składniki, których nie lubisz</Text>
          <Text style={styles.sectionDescription}>
            Dodaj produkty, których nie chcesz widzieć w przepisach. Przepisy zawierające te składniki 
            będą ukryte na liście przepisów.
          </Text>
          
          {/* Dodawanie nowego składnika */}
          <View style={styles.addIngredientContainer}>
            <TextInput 
              style={styles.input}
              placeholder="Wpisz nazwę składnika..."
              value={newIngredient}
              onChangeText={setNewIngredient}
              onSubmitEditing={addIngredient}
            />
            <TouchableOpacity 
              style={styles.addButton}
              onPress={addIngredient}
            >
              <Ionicons name="add" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          
          {/* Lista składników */}
          {dietaryPreferences.length > 0 ? (
            <View style={styles.ingredientsList}>
              {dietaryPreferences.map((item, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <Text style={styles.ingredientText}>{item}</Text>
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => removeIngredient(index)}
                  >
                    <Ionicons name="close" size={22} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyListText}>
              Brak składników na liście. Dodaj składniki, których nie lubisz.
            </Text>
          )}
        </View>
        
        {/* Przycisk zapisywania */}
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={savePreferences}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Zapisywanie...' : 'Zapisz i wróć'}
          </Text>
        </TouchableOpacity>
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
  placeholder: {
    width: 34,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userInfoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 10,
  },
  userEmail: {
    fontSize: 16,
    color: COLORS.lightText,
    marginTop: 5,
  },
  preferencesSection: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.lightText,
    marginBottom: 20,
    lineHeight: 20,
  },
  addIngredientContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingredientsList: {
    marginBottom: 10,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  ingredientText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  removeButton: {
    backgroundColor: COLORS.error || '#FF6B6B',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
    color: COLORS.lightText,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PreferencesScreen; 