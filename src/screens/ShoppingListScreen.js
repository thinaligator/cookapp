import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Share
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../config/colors';
import { 
  getShoppingList, 
  toggleItemCompletion, 
  removeFromShoppingList,
  clearShoppingList,
  clearCompletedItems
} from '../services/shoppingListService';

const ShoppingListScreen = ({ navigation }) => {
  const [shoppingList, setShoppingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Funkcja do pobierania listy zakupów
  const fetchShoppingList = async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await getShoppingList();
      
      // Sortowanie: najpierw nieukończone, następnie według daty dodania (od najnowszych)
      const sortedItems = [...items].sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return new Date(b.addedAt) - new Date(a.addedAt);
      });
      
      setShoppingList(sortedItems);
    } catch (err) {
      console.error('Błąd podczas pobierania listy zakupów:', err);
      setError('Nie udało się pobrać listy zakupów');
    } finally {
      setLoading(false);
    }
  };

  // Pobieranie listy przy wejściu na ekran
  useFocusEffect(
    useCallback(() => {
      fetchShoppingList();
    }, [])
  );

  // Obsługa przełączania statusu ukończenia
  const handleToggleCompletion = async (item) => {
    try {
      await toggleItemCompletion(item.name);
      // Odświeżamy listę
      fetchShoppingList();
    } catch (err) {
      console.error('Błąd podczas zmiany statusu:', err);
      Alert.alert('Błąd', 'Nie udało się zmienić statusu elementu');
    }
  };

  // Obsługa usuwania elementu
  const handleRemoveItem = async (item) => {
    try {
      await removeFromShoppingList(item.name);
      // Odświeżamy listę
      fetchShoppingList();
    } catch (err) {
      console.error('Błąd podczas usuwania elementu:', err);
      Alert.alert('Błąd', 'Nie udało się usunąć elementu z listy');
    }
  };

  // Potwierdzenie usunięcia elementu
  const confirmRemoveItem = (item) => {
    Alert.alert(
      'Usunąć element',
      `Czy na pewno chcesz usunąć "${item.name}" z listy zakupów?`,
      [
        {
          text: 'Anuluj',
          style: 'cancel',
        },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: () => handleRemoveItem(item),
        },
      ]
    );
  };

  // Potwierdzenie wyczyszczenia całej listy
  const confirmClearList = () => {
    Alert.alert(
      'Wyczyść listę',
      'Czy na pewno chcesz wyczyścić całą listę zakupów?',
      [
        {
          text: 'Anuluj',
          style: 'cancel',
        },
        {
          text: 'Wyczyść',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearShoppingList();
              fetchShoppingList();
            } catch (err) {
              console.error('Błąd podczas czyszczenia listy:', err);
              Alert.alert('Błąd', 'Nie udało się wyczyścić listy zakupów');
            }
          },
        },
      ]
    );
  };

  // Usuwanie ukończonych elementów
  const handleClearCompleted = async () => {
    try {
      await clearCompletedItems();
      fetchShoppingList();
    } catch (err) {
      console.error('Błąd podczas usuwania ukończonych elementów:', err);
      Alert.alert('Błąd', 'Nie udało się usunąć ukończonych elementów');
    }
  };

  // Potwierdzenie usunięcia ukończonych elementów
  const confirmClearCompleted = () => {
    const completedCount = shoppingList.filter(item => item.completed).length;
    
    if (completedCount === 0) {
      Alert.alert('Informacja', 'Brak ukończonych elementów do usunięcia');
      return;
    }
    
    Alert.alert(
      'Usuń ukończone',
      `Czy na pewno chcesz usunąć wszystkie ukończone elementy (${completedCount})?`,
      [
        {
          text: 'Anuluj',
          style: 'cancel',
        },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: handleClearCompleted,
        },
      ]
    );
  };
  
  // Formatuje listę zakupów do tekstu
  const formatShoppingListAsText = () => {
    if (!shoppingList || shoppingList.length === 0) {
      return 'Lista zakupów jest pusta';
    }
    
    // Pogrupuj składniki według źródła (przepisu)
    const groupedByRecipe = {};
    shoppingList.forEach(item => {
      const source = item.recipeSource || 'Inne';
      if (!groupedByRecipe[source]) {
        groupedByRecipe[source] = [];
      }
      groupedByRecipe[source].push(item);
    });
    
    // Tworzenie tekstu
    let text = '📝 LISTA ZAKUPÓW 📝\n\n';
    
    Object.keys(groupedByRecipe).forEach(recipeName => {
      text += `${recipeName}:\n`;
      groupedByRecipe[recipeName].forEach(item => {
        text += `- ${item.name}${item.completed ? ' ✓' : ''}\n`;
      });
      text += '\n';
    });
    
    return text;
  };
  
  // Udostępnianie listy zakupów
  const shareShoppingList = async () => {
    if (!shoppingList || shoppingList.length === 0) {
      Alert.alert('Informacja', 'Nie ma żadnych składników do udostępnienia');
      return;
    }
    
    const message = formatShoppingListAsText();
    
    try {
      const result = await Share.share({
        message: message,
        title: 'Moja lista zakupów'
      });
      
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log(`Udostępniono przez: ${result.activityType}`);
        } else {
          console.log('Udostępniono');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Anulowano udostępnianie');
      }
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się udostępnić listy zakupów');
      console.error('Błąd podczas udostępniania listy zakupów:', error);
    }
  };
  


  // Renderowanie elementu listy
  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => handleToggleCompletion(item)}
      >
        <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
          {item.completed && <Icon name="checkmark" size={16} color={COLORS.white} />}
        </View>
      </TouchableOpacity>
      
      <View style={styles.itemTextContainer}>
        <Text style={[
          styles.itemText,
          item.completed && styles.itemTextCompleted
        ]}>
          {item.name}
        </Text>
        
        {item.recipeSource && (
          <Text style={styles.recipeSourceText}>
            z: {item.recipeSource}
          </Text>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmRemoveItem(item)}
      >
        <Icon name="trash-outline" size={20} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Nagłówek */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lista zakupów</Text>
      </View>
      
              {/* Przyciski akcji */}
      <View style={styles.actionButtons}>
                  <TouchableOpacity
            style={[styles.actionButton, styles.clearButton]}
            onPress={confirmClearList}
          >
            <Text style={[styles.actionButtonText, styles.clearButtonText]}>Wyczyść listę</Text>
          </TouchableOpacity>
          
          {/* Przyciski udostępniania */}
          <View style={[styles.shareButtonsRow, {marginTop: 15}]}>
            <TouchableOpacity
              style={[styles.shareButton, styles.shareAnyButton]}
              onPress={shareShoppingList}
            >
              <Icon name="share-social-outline" size={18} color={COLORS.white} />
              <Text style={styles.shareButtonText}>Udostępnij</Text>
            </TouchableOpacity>
          </View>
      </View>
      
      {/* Zawartość */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchShoppingList}
          >
            <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      ) : shoppingList.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon name="cart-outline" size={64} color={COLORS.lightGray} />
          <Text style={styles.emptyListText}>Twoja lista zakupów jest pusta</Text>
          <Text style={styles.emptyListSubtext}>
            Dodaj składniki z przepisów, aby utworzyć listę zakupów
          </Text>
        </View>
      ) : (
        <FlatList
          data={shoppingList}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          contentContainerStyle={styles.listContent}
        />
      )}
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
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    color: COLORS.darkText,
  },
  actionButtons: {
    padding: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    alignItems: 'center',
  },
  shareButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignSelf: 'center',
    alignItems: 'center',
    minWidth: 200,
  },
  actionButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  clearButton: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.danger,
  },
  clearButtonText: {
    color: COLORS.danger,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 5,
    minWidth: 200,
  },
  shareAnyButton: {
    backgroundColor: COLORS.primary,
  },
  shareButtonText: {
    color: COLORS.white,
    fontWeight: '500',
    marginLeft: 5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    marginBottom: 15,
    textAlign: 'center',
  },
  retryButton: {
    padding: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  emptyListText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginTop: 15,
    textAlign: 'center',
  },
  emptyListSubtext: {
    fontSize: 14,
    color: COLORS.lightText,
    marginTop: 5,
    textAlign: 'center',
    maxWidth: '80%',
  },
  listContent: {
    padding: 15,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    marginBottom: 10,
    padding: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  checkboxContainer: {
    marginRight: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  itemTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 16,
    color: COLORS.darkText,
  },
  itemTextCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.lightText,
  },
  recipeSourceText: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: 2,
  },
  deleteButton: {
    padding: 5,
  },
});

export default ShoppingListScreen;