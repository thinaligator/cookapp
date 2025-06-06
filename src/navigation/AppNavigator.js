import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importujemy ekrany
import HomeScreen from '../screens/HomeScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import AuthScreen from '../screens/AuthScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import AddRecipeScreen from '../screens/AddRecipeScreen';

// Importujemy kontekst uwierzytelniania
import { useAuth } from '../config/AuthContext';

// Tworzymy stos nawigacyjny
const Stack = createStackNavigator();

// Stos nawigacyjny dla autoryzowanych użytkowników
const AuthenticatedStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'white' }
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
      <Stack.Screen name="AddRecipe" component={AddRecipeScreen} />
    </Stack.Navigator>
  );
};

// Stos nawigacyjny dla nieautoryzowanych użytkowników
const UnauthenticatedStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'white' }
      }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { currentUser, loading } = useAuth();

  // Jeśli trwa ładowanie stanu autoryzacji, możemy pokazać ekran ładowania
  if (loading) {
    return null; // Albo komponent ekranu ładowania
  }

  return (
    <NavigationContainer>
      {currentUser ? <AuthenticatedStack /> : <UnauthenticatedStack />}
    </NavigationContainer>
  );
};

export default AppNavigator; 