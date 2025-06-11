import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal, Vibration, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../config/colors';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Konfiguracja zachowania powiadomień
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const KitchenTimer = ({ visible, onClose, initialTitle = '', initialMinutes = 0, initialSeconds = 0, autoStart = false, editable = true }) => {
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const intervalRef = useRef(null);
  const firstRenderRef = useRef(true);
  const notificationIdRef = useRef(null);
  const isFromRecipe = initialMinutes > 0 || initialSeconds > 0;
  
  // Sprawdzenie uprawnień do powiadomień
  useEffect(() => {
    const checkNotificationPermissions = async () => {
      if (Platform.OS === 'android') {
        // Dla Androida ustawiamy kanał powiadomień
        await Notifications.setNotificationChannelAsync('timer-channel', {
          name: 'Timery kuchenne',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: true,
        });
      }
      
      // Sprawdzamy uprawnienia
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        // Jeśli nie mamy uprawnień, prosimy o nie
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        setHasNotificationPermission(newStatus === 'granted');
      } else {
        setHasNotificationPermission(true);
      }
    };
    
    checkNotificationPermissions();
  }, []);

  // Resetowanie stanu przy otwarciu modala
  useEffect(() => {
    if (visible) {
      setMinutes(initialMinutes ? initialMinutes.toString() : '');
      setSeconds(initialSeconds ? initialSeconds.toString() : '');
      setIsRunning(false);
      setTimeLeft(0);
      
      // Jeśli podano początkowe wartości i autoStart jest true, automatycznie uruchom timer
      if (autoStart && (initialMinutes > 0 || initialSeconds > 0) && firstRenderRef.current === false) {
        // Używamy setTimeout, aby dać komponentowi czas na pełne załadowanie
        setTimeout(() => {
          startTimer();
        }, 300);
      }
      
      // Po pierwszym renderze ustawiamy flagę na false
      firstRenderRef.current = false;
    }
  }, [visible, initialTitle, initialMinutes, initialSeconds, autoStart]);

  // Zatrzymanie timera przy zamknięciu komponentu
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Anuluj zaplanowane powiadomienie, jeśli istnieje
      if (notificationIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(notificationIdRef.current)
          .catch(err => console.error('Błąd anulowania powiadomienia:', err));
        notificationIdRef.current = null;
      }
    };
  }, []);

  // Funkcja do wysyłania powiadomienia natychmiast
  const sendImmediateNotification = async (title, message) => {
    if (!hasNotificationPermission) {
      console.log('Brak uprawnień do powiadomień');
      return;
    }
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: message,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // null oznacza natychmiastowe powiadomienie
      });
      
      console.log('Wysłano natychmiastowe powiadomienie');
    } catch (error) {
      console.error('Błąd podczas wysyłania powiadomienia:', error);
    }
  };

  // Funkcja do powiadomienia użytkownika po zakończeniu timera
  const notifyTimerEnd = async () => {
    try {
      console.log('Timer zakończony - powiadamianie użytkownika');
      
      // Wibracja telefonu w sekwencji
      Vibration.vibrate([0, 500, 200, 500]);
      
      // Powiadomienie w aplikacji
      Alert.alert(
        'Timer',
        'Czas minął!',
        [{ text: 'OK', onPress: () => {} }]
      );
      
      // Wysyłamy natychmiastowe powiadomienie
      const timerTitle = initialTitle || 'Timer kuchenny';
      await sendImmediateNotification('Timer zakończony', `${timerTitle} - czas upłynął!`);
    } catch (error) {
      console.error('Błąd podczas powiadamiania o zakończeniu timera:', error);
    }
  };

  // Walidacja wprowadzonych danych
  const validateInput = () => {
    const min = parseInt(minutes) || 0;
    const sec = parseInt(seconds) || 0;
    
    if (min === 0 && sec === 0) {
      Alert.alert('Błąd', 'Ustaw czas większy niż 0');
      return false;
    }
    
    if (min < 0 || sec < 0 || sec >= 60) {
      Alert.alert('Błąd', 'Nieprawidłowe wartości czasu');
      return false;
    }
    
    return true;
  };

  // Uruchomienie timera
  const startTimer = async () => {
    // Jeśli timer jest z przepisu, używamy początkowych wartości
    const min = isFromRecipe ? initialMinutes : (parseInt(minutes) || 0);
    const sec = isFromRecipe ? initialSeconds : (parseInt(seconds) || 0);
    
    // Walidacja tylko dla ręcznie wprowadzonych wartości
    if (!isFromRecipe && !validateInput()) return;
    
    const totalSeconds = (min * 60) + sec;
    if (totalSeconds <= 0) return;
    
    console.log(`Timer uruchomiony: ${min} min, ${sec} sek, łącznie ${totalSeconds} sekund`);
    
    // Ustaw czas pozostały
    setTimeLeft(totalSeconds);
    setIsRunning(true);
    
    // Anuluj poprzednie powiadomienie, jeśli istnieje
    if (notificationIdRef.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
        notificationIdRef.current = null;
      } catch (error) {
        console.error('Błąd podczas anulowania powiadomienia:', error);
      }
    }
    
    // Uruchom timer lokalnie
    intervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          // Timer zakończony
          clearInterval(intervalRef.current);
          setIsRunning(false);
          
          // Powiadom użytkownika, ale tylko jeśli rzeczywiście zakończył się timer
          // (prevTime === 1 oznacza ostatni tick przed zerem)
          if (prevTime === 1) {
            setTimeout(() => {
              notifyTimerEnd();
            }, 100);
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  // Zatrzymanie timera
  const stopTimer = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Anuluj zaplanowane powiadomienie
    if (notificationIdRef.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
        console.log(`Anulowano powiadomienie z ID: ${notificationIdRef.current}`);
        notificationIdRef.current = null;
      } catch (error) {
        console.error('Błąd podczas anulowania powiadomienia:', error);
      }
    }
    
    setIsRunning(false);
    setTimeLeft(0);
  };

  // Formatowanie czasu do wyświetlenia
  const formatTime = (totalSeconds) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Timer</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          {!isRunning ? (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Czas:</Text>
              {isFromRecipe && !editable ? (
                // Tylko wyświetlanie czasu dla timera z przepisu
                <View style={styles.timerPreview}>
                  <Text style={styles.timerPreviewText}>
                    {initialMinutes} min {initialSeconds} sek
                  </Text>
                </View>
              ) : (
                // Edytowalny czas dla zwykłego timera
                <View style={styles.timeInputContainer}>
                  <TextInput
                    style={styles.timeInput}
                    value={minutes}
                    onChangeText={setMinutes}
                    placeholder="00"
                    keyboardType="numeric"
                    maxLength={2}
                    editable={!isFromRecipe || editable}
                  />
                  <Text style={styles.timeSeparator}>min</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={seconds}
                    onChangeText={setSeconds}
                    placeholder="00"
                    keyboardType="numeric"
                    maxLength={2}
                    editable={!isFromRecipe || editable}
                  />
                  <Text style={styles.timeSeparator}>sek</Text>
                </View>
              )}
              
              <TouchableOpacity style={styles.startButton} onPress={startTimer}>
                <Text style={styles.buttonText}>Start</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timerContainer}>
              <Text style={styles.timerDisplay}>{formatTime(timeLeft)}</Text>
              <TouchableOpacity style={styles.stopButton} onPress={stopTimer}>
                <Text style={styles.buttonText}>Zatrzymaj</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 5,
  },
  inputContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: COLORS.text,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'center',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 18,
    width: 70,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 16,
    marginHorizontal: 10,
    color: COLORS.text,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  timerDisplay: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginVertical: 20,
  },
  timerPreview: {
    marginVertical: 15,
    alignItems: 'center',
    backgroundColor: COLORS.lightGrey,
    padding: 12,
    borderRadius: 5,
  },
  timerPreviewText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
  },
});

export default KitchenTimer; 