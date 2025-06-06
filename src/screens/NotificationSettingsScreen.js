import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../config/colors';
import { 
  registerForPushNotificationsAsync, 
  setupDailyRecipeNotifications,
  scheduleDailyRecipeNotification,
  cancelScheduledNotifications 
} from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Klucze dla AsyncStorage
const NOTIFICATION_ENABLED_KEY = 'notification_daily_recipes_enabled';
const NOTIFICATION_HOUR_KEY = 'notification_daily_recipes_hour';
const NOTIFICATION_MINUTE_KEY = 'notification_daily_recipes_minute';

const NotificationSettingsScreen = ({ navigation }) => {
  const [dailyRecipesEnabled, setDailyRecipesEnabled] = useState(false);
  const [notificationHour, setNotificationHour] = useState(8);
  const [notificationMinute, setNotificationMinute] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Pobierz ustawienia przy ładowaniu
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        
        // Pobierz ustawienia z AsyncStorage
        const enabledValue = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
        const hourValue = await AsyncStorage.getItem(NOTIFICATION_HOUR_KEY);
        const minuteValue = await AsyncStorage.getItem(NOTIFICATION_MINUTE_KEY);
        
        // Ustaw stan z zapisanych wartości lub domyślnych
        setDailyRecipesEnabled(enabledValue === 'true');
        setNotificationHour(hourValue ? parseInt(hourValue) : 8);
        setNotificationMinute(minuteValue ? parseInt(minuteValue) : 0);
        
        try {
          // Zarejestruj urządzenie do powiadomień
          await registerForPushNotificationsAsync();
        } catch (error) {
          console.log('Używamy tylko lokalnych powiadomień:', error);
        }
      } catch (error) {
        console.error('Błąd podczas ładowania ustawień powiadomień:', error);
        Alert.alert(
          'Informacja',
          'Aplikacja będzie korzystać tylko z lokalnych powiadomień.'
        );
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // Obsługa zmiany ustawień powiadomień codziennych
  const handleDailyRecipesToggle = async (value) => {
    try {
      setDailyRecipesEnabled(value);
      
      // Zapisz ustawienie
      await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, value.toString());
      
      if (value) {
        // Włącz powiadomienia
        const success = await setupDailyRecipeNotifications(
          notificationHour, 
          notificationMinute, 
          true
        );
        
        if (success) {
          Alert.alert(
            'Powiadomienia włączone',
            `Będziesz otrzymywać codzienne powiadomienia o przepisach o ${notificationHour}:${notificationMinute.toString().padStart(2, '0')}.`
          );
        }
      } else {
        // Wyłącz powiadomienia
        await cancelScheduledNotifications('daily-recipe');
        await cancelScheduledNotifications('daily-recipe-repeat');
        
        Alert.alert(
          'Powiadomienia wyłączone',
          'Nie będziesz już otrzymywać codziennych powiadomień o przepisach.'
        );
      }
    } catch (error) {
      console.error('Błąd podczas zmiany ustawień powiadomień:', error);
      Alert.alert('Błąd', 'Nie udało się zmienić ustawień powiadomień.');
    }
  };
  
  // Ustaw czas powiadomień
  const setNotificationTime = async (hour, minute) => {
    try {
      setNotificationHour(hour);
      setNotificationMinute(minute);
      
      // Zapisz ustawienia
      await AsyncStorage.setItem(NOTIFICATION_HOUR_KEY, hour.toString());
      await AsyncStorage.setItem(NOTIFICATION_MINUTE_KEY, minute.toString());
      
      // Jeśli powiadomienia są włączone, zaktualizuj je
      if (dailyRecipesEnabled) {
        await setupDailyRecipeNotifications(hour, minute, true);
        
        Alert.alert(
          'Czas powiadomień zaktualizowany',
          `Będziesz otrzymywać codzienne powiadomienia o przepisach o ${hour}:${minute.toString().padStart(2, '0')}.`
        );
      }
    } catch (error) {
      console.error('Błąd podczas zmiany czasu powiadomień:', error);
      Alert.alert('Błąd', 'Nie udało się zmienić czasu powiadomień.');
    }
  };
  
  // Generowanie opcji czasu (godziny)
  const renderHourOptions = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(
        <TouchableOpacity
          key={`hour-${i}`}
          style={[
            styles.timeOption,
            notificationHour === i && styles.selectedTimeOption
          ]}
          onPress={() => setNotificationTime(i, notificationMinute)}
        >
          <Text style={[
            styles.timeOptionText,
            notificationHour === i && styles.selectedTimeOptionText
          ]}>
            {i.toString().padStart(2, '0')}
          </Text>
        </TouchableOpacity>
      );
    }
    return hours;
  };
  
  // Generowanie opcji czasu (minuty)
  const renderMinuteOptions = () => {
    const minutes = [];
    for (let i = 0; i < 60; i += 5) {
      minutes.push(
        <TouchableOpacity
          key={`minute-${i}`}
          style={[
            styles.timeOption,
            notificationMinute === i && styles.selectedTimeOption
          ]}
          onPress={() => setNotificationTime(notificationHour, i)}
        >
          <Text style={[
            styles.timeOptionText,
            notificationMinute === i && styles.selectedTimeOptionText
          ]}>
            {i.toString().padStart(2, '0')}
          </Text>
        </TouchableOpacity>
      );
    }
    return minutes;
  };
  
  // Wyślij testowe powiadomienie
  const sendTestNotification = async () => {
    try {
      const success = await scheduleDailyRecipeNotification();
      
      if (success) {
        Alert.alert(
          'Powiadomienie testowe',
          'Powiadomienie testowe zostało wysłane. Powinno pojawić się za chwilę.'
        );
      } else {
        Alert.alert(
          'Błąd',
          'Nie udało się wysłać powiadomienia testowego.'
        );
      }
    } catch (error) {
      console.error('Błąd podczas wysyłania powiadomienia testowego:', error);
      Alert.alert('Błąd', 'Nie udało się wysłać powiadomienia testowego.');
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
          <Icon name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Ustawienia powiadomień</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Sekcja codziennych powiadomień o przepisach */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Codzienne powiadomienia o przepisach</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Włącz powiadomienia</Text>
              <Text style={styles.settingDescription}>
                Otrzymuj codziennie powiadomienie z propozycją przepisu
              </Text>
            </View>
            <Switch
              value={dailyRecipesEnabled}
              onValueChange={handleDailyRecipesToggle}
              trackColor={{ false: '#767577', true: COLORS.primary }}
              thumbColor={Platform.OS === 'android' ? COLORS.white : ''}
            />
          </View>
          
          {dailyRecipesEnabled && (
            <View style={styles.timeSettingsContainer}>
              <Text style={styles.settingLabel}>Godzina powiadomień</Text>
              
              <View style={styles.timePickerContainer}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeColumnHeader}>Godzina</Text>
                  <ScrollView 
                    style={styles.timeScroller}
                    showsVerticalScrollIndicator={false}
                  >
                    {renderHourOptions()}
                  </ScrollView>
                </View>
                
                <Text style={styles.timeSeparator}>:</Text>
                
                <View style={styles.timeColumn}>
                  <Text style={styles.timeColumnHeader}>Minuta</Text>
                  <ScrollView 
                    style={styles.timeScroller}
                    showsVerticalScrollIndicator={false}
                  >
                    {renderMinuteOptions()}
                  </ScrollView>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.testButton}
                onPress={sendTestNotification}
              >
                <Text style={styles.testButtonText}>
                  Wyślij testowe powiadomienie
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
  section: {
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
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.text,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 5,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.lightText,
  },
  timeSettingsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  timeColumn: {
    width: 70,
    alignItems: 'center',
  },
  timeColumnHeader: {
    fontSize: 14,
    color: COLORS.lightText,
    marginBottom: 10,
  },
  timeScroller: {
    height: 150,
  },
  timeOption: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    margin: 2,
  },
  selectedTimeOption: {
    backgroundColor: COLORS.primary,
  },
  timeOptionText: {
    fontSize: 18,
    color: COLORS.text,
  },
  selectedTimeOptionText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  testButton: {
    backgroundColor: COLORS.secondary,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 15,
  },
  testButtonText: {
    color: COLORS.white,
    fontWeight: '500',
  },
});

export default NotificationSettingsScreen; 