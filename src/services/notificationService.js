import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getRecipes } from './recipeService';

// Konfiguracja zachowania powiadomień
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Sprawdzenie, czy aplikacja ma uprawnienia do wyświetlania powiadomień
export async function checkNotificationPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  console.log('Status uprawnień powiadomień:', status);
  return status === 'granted';
}

// Funkcja do rejestracji tokena powiadomień
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    
    // Dodajemy specjalny kanał dla timerów
    await Notifications.setNotificationChannelAsync('kitchen-timers', {
      name: 'Timery kuchenne',
      description: 'Powiadomienia o zakończeniu timerów kuchennych',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Aby otrzymywać powiadomienia, musisz przyznać odpowiednie uprawnienia!');
      return null;
    }
    
    // Używamy lokalnych powiadomień zamiast Expo Push Tokens
    return 'local-notifications-only';
  } else {
    alert('Do testowania powiadomień push potrzebujesz fizycznego urządzenia');
  }

  return null;
}

// Funkcja do losowania przepisu na dziś
export async function getRandomRecipeForToday() {
  try {
    const recipes = await getRecipes();
    if (!recipes || recipes.length === 0) {
      return null;
    }
    
    // Losuj przepis
    const randomIndex = Math.floor(Math.random() * recipes.length);
    return recipes[randomIndex];
  } catch (error) {
    console.error('Błąd podczas losowania przepisu:', error);
    return null;
  }
}

// Funkcja do zaplanowania powiadomienia o dzisiejszym przepisie
export async function scheduleDailyRecipeNotification(hour = 8, minute = 0) {
  try {
    // Anuluj poprzednie powiadomienia tego typu
    await cancelScheduledNotifications('daily-recipe');
    
    // Uzyskaj losowy przepis
    const recipe = await getRandomRecipeForToday();
    if (!recipe) {
      console.log('Brak przepisów do zaplanowania powiadomienia');
      return false;
    }
    
    // Ustaw czas powiadomienia na dzisiaj o wybranej godzinie
    const now = new Date();
    const notificationTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute
    );
    
    // Jeśli czas już minął, zaplanuj na jutro
    if (notificationTime < now) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }
    
    // Oblicz opóźnienie w sekundach
    const seconds = Math.floor((notificationTime.getTime() - now.getTime()) / 1000);
    
    // Zaplanuj powiadomienie
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Przepis na dziś',
        body: `Proponujemy dziś: ${recipe.title}`,
        data: { recipeId: recipe.id, type: 'daily-recipe' },
      },
      trigger: {
        seconds: seconds,
        repeats: false,
      },
    });
    
    console.log(`Zaplanowano powiadomienie o przepisie na ${notificationTime.toLocaleTimeString()}`);
    return true;
  } catch (error) {
    console.error('Błąd podczas planowania powiadomienia:', error);
    return false;
  }
}

// Funkcja do ustawienia codziennych powiadomień o przepisach
export async function setupDailyRecipeNotifications(hour = 8, minute = 0, enabled = true) {
  try {
    // Jeśli wyłączone, anuluj wszystkie zaplanowane powiadomienia
    if (!enabled) {
      await cancelScheduledNotifications('daily-recipe');
      return true;
    }
    
    // Zaplanuj pierwsze powiadomienie
    await scheduleDailyRecipeNotification(hour, minute);
    
    // Zaplanuj powtarzające się powiadomienie
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Przepis na dziś',
        body: 'Sprawdź dzisiejszą propozycję kulinarną!',
        data: { type: 'daily-recipe-repeat' },
      },
      trigger: {
        hour: hour,
        minute: minute,
        repeats: true,
      },
    });
    
    return true;
  } catch (error) {
    console.error('Błąd podczas ustawiania codziennych powiadomień:', error);
    return false;
  }
}

// Anuluj zaplanowane powiadomienia określonego typu
export async function cancelScheduledNotifications(type) {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of scheduledNotifications) {
    if (notification.content.data?.type === type) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

// Funkcja do planowania timera kuchennego
export async function scheduleKitchenTimer(minutes, seconds, title = 'Timer kuchenny') {
  try {
    const totalSeconds = (minutes * 60) + seconds;
    if (totalSeconds <= 0) {
      console.error('Nieprawidłowy czas timera (mniejszy lub równy 0)');
      return null;
    }
    
    console.log(`Planowanie powiadomienia timera za ${totalSeconds} sekund`);
    
    // Dla bezpieczeństwa upewnijmy się, że totalSeconds jest dodatnie
    if (totalSeconds < 1) {
      console.error('Nieprawidłowy czas timera (mniejszy niż 1 sekunda)');
      return null;
    }
    
    // Sprawdź, czy mamy uprawnienia do wyświetlania powiadomień
    const hasPermissions = await checkNotificationPermissions();
    if (!hasPermissions) {
      console.warn('Brak uprawnień do wyświetlania powiadomień');
      return null;
    }
    
    // Tworzymy trigger z określonym czasem
    const trigger = { 
      seconds: Math.max(1, totalSeconds), // Minimum 1 sekunda
      repeats: false 
    };
    
    console.log('Konfiguracja triggera powiadomienia:', trigger);

    // Zaplanuj powiadomienie
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: `Twój timer na ${minutes} min ${seconds} sek zakończył odliczanie!`,
        sound: 'default',
        vibrate: [0, 250, 250, 250],
        data: { type: 'kitchen-timer' },
        channelId: Platform.OS === 'android' ? 'kitchen-timers' : undefined,
      },
      trigger: trigger,
    });
    
    console.log(`Zaplanowano powiadomienie z ID: ${identifier} za ${totalSeconds} sekund`);
    
    // Sprawdź, czy powiadomienie zostało zaplanowane
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const found = scheduled.find(n => n.identifier === identifier);
    console.log('Znaleziono zaplanowane powiadomienie:', found ? 'Tak' : 'Nie');
    
    return identifier;
  } catch (error) {
    console.error('Błąd podczas ustawiania timera:', error);
    return null;
  }
}

// Anuluj konkretny timer
export async function cancelKitchenTimer(identifier) {
  if (!identifier) return;
  
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    return true;
  } catch (error) {
    console.error('Błąd podczas anulowania timera:', error);
    return false;
  }
} 