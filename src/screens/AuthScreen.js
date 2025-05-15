import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { loginWithEmail, registerWithEmail } from '../services/authService';
import { COLORS } from '../config/colors';

const AuthScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setIsLogin(!isLogin);
    // Czyścimy pola przy zmianie trybu
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
  };

  const handleAuth = async () => {
    // Walidacja
    if (!email || !password) {
      Alert.alert('Błąd', 'Email i hasło są wymagane');
      return;
    }
    
    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Błąd', 'Hasła muszą być takie same');
      return;
    }
    
    if (!isLogin && !displayName) {
      Alert.alert('Błąd', 'Nazwa użytkownika jest wymagana');
      return;
    }

    setLoading(true);

    try {
      let result;
      
      if (isLogin) {
        result = await loginWithEmail(email, password);
      } else {
        result = await registerWithEmail(email, password, displayName);
      }

      if (result.success) {
        // Zapisujemy dane użytkownika w jakiś sposób (można użyć globalnego stanu, AsyncStorage, itd.)
        // Na razie przechodzimy bezpośrednio do ekranu głównego
        navigation.navigate('Home');
      } else {
        Alert.alert('Błąd', result.error || 'Wystąpił problem z autoryzacją');
      }
    } catch (error) {
      Alert.alert('Błąd', 'Wystąpił nieoczekiwany błąd podczas autoryzacji');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja do szybkiego logowania (dla celów testowych)
  const handleTestLogin = () => {
    // Symulujemy logowanie bez faktycznego procesu autoryzacji
    navigation.navigate('Home');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Kucharz App</Text>
          {/* Tu można dodać logo aplikacji */}
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>{isLogin ? 'Logowanie' : 'Rejestracja'}</Text>
          
          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Nazwa użytkownika"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="none"
            />
          )}
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Hasło"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Potwierdź hasło"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          )}

          <TouchableOpacity
            style={[styles.authButton, loading && styles.disabledButton]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.authButtonText}>
                {isLogin ? 'Zaloguj się' : 'Zarejestruj się'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchModeButton} onPress={toggleMode}>
            <Text style={styles.switchModeText}>
              {isLogin ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
            </Text>
          </TouchableOpacity>

          {/* Przycisk testowy do szybkiego logowania (bez autoryzacji) */}
          <TouchableOpacity
            style={[styles.testButton, loading && styles.disabledButton]}
            onPress={handleTestLogin}
            disabled={loading}
          >
            <Text style={styles.testButtonText}>
              Szybkie logowanie (do testów)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  formContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  authButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  authButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  switchModeButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  switchModeText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  testButton: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  testButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AuthScreen; 