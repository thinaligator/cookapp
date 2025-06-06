import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Switch, 
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/colors';
import { useAuth } from '../config/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PreferencesScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  
  // Preferencje użytkownika
  const [darkMode, setDarkMode] = useState(false);
  const [sortByRating, setSortByRating] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);
  
  // Ładowanie preferencji przy montowaniu komponentu
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedPreferences = await AsyncStorage.getItem('userPreferences');
        if (savedPreferences) {
          const preferences = JSON.parse(savedPreferences);
          setDarkMode(preferences.darkMode || false);
          setSortByRating(preferences.sortByRating || true);
          setNotificationsEnabled(preferences.notificationsEnabled || true);
          setShowRecommendations(preferences.showRecommendations || true);
        }
      } catch (error) {
        console.error('Błąd podczas ładowania preferencji:', error);
      }
    };
    
    loadPreferences();
  }, []);
  
  // Zapisywanie preferencji po zmianie
  const savePreferences = async () => {
    try {
      const preferences = {
        darkMode,
        sortByRating,
        notificationsEnabled,
        showRecommendations
      };
      
      await AsyncStorage.setItem('userPreferences', JSON.stringify(preferences));
      Alert.alert('Sukces', 'Preferencje zostały zapisane');
    } catch (error) {
      console.error('Błąd podczas zapisywania preferencji:', error);
      Alert.alert('Błąd', 'Nie udało się zapisać preferencji');
    }
  };

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
        <Text style={styles.title}>Preferencje</Text>
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
        
        {/* Preferencje */}
        <View style={styles.preferencesSection}>
          <Text style={styles.sectionTitle}>Ustawienia aplikacji</Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceTitle}>Tryb ciemny</Text>
              <Text style={styles.preferenceDescription}>
                Zmień motyw aplikacji na ciemny
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: COLORS.lightGrey, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceTitle}>Sortuj według ocen</Text>
              <Text style={styles.preferenceDescription}>
                Pokaż najpierw najwyżej oceniane przepisy
              </Text>
            </View>
            <Switch
              value={sortByRating}
              onValueChange={setSortByRating}
              trackColor={{ false: COLORS.lightGrey, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceTitle}>Powiadomienia</Text>
              <Text style={styles.preferenceDescription}>
                Otrzymuj powiadomienia o nowych przepisach
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: COLORS.lightGrey, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceTitle}>Rekomendacje</Text>
              <Text style={styles.preferenceDescription}>
                Pokaż rekomendowane przepisy na podstawie twoich upodobań
              </Text>
            </View>
            <Switch
              value={showRecommendations}
              onValueChange={setShowRecommendations}
              trackColor={{ false: COLORS.lightGrey, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>
        
        {/* Przycisk zapisywania */}
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={savePreferences}
        >
          <Text style={styles.saveButtonText}>Zapisz preferencje</Text>
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
    marginBottom: 15,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
  },
  preferenceTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  preferenceDescription: {
    fontSize: 14,
    color: COLORS.lightText,
    marginTop: 4,
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