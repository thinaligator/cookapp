import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getRecipeById } from '../services/recipeService';
import { COLORS } from '../config/colors';

const RecipeDetailScreen = ({ route, navigation }) => {
  const { recipeId } = route.params || {};
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  // Przykładowe dane przepisu (normalnie będą pobierane z Firebase)
  const sampleRecipe = {
    id: '1',
    title: "Spaghetti Bolognese",
    prepTime: "20 min",
    cookTime: "30 min",
    servings: 4,
    difficulty: "Średni",
    ingredients: [
      "400g mielonego mięsa wołowego",
      "1 cebula",
      "2 ząbki czosnku",
      "1 marchewka",
      "1 łodyga selera naciowego",
      "400g pomidorów z puszki",
      "2 łyżki koncentratu pomidorowego",
      "300g makaronu spaghetti",
      "sól, pieprz, oregano, bazylia",
      "oliwa z oliwek",
      "parmezan do posypania"
    ],
    instructions: [
      "Cebulę i czosnek posiekaj drobno, marchewkę i seler pokrój w małą kostkę.",
      "Na patelni rozgrzej oliwę, zeszklij cebulę i czosnek.",
      "Dodaj mięso i smaż, aż będzie brązowe.",
      "Dodaj marchewkę i seler, smaż przez 2-3 minuty.",
      "Dodaj pomidory, koncentrat i przyprawy. Gotuj na małym ogniu przez 20-25 minut.",
      "W międzyczasie ugotuj makaron al dente według instrukcji na opakowaniu.",
      "Podawaj sos na makaronie, posypany parmezanem."
    ]
  };

  useEffect(() => {
    // Tutaj w przyszłości będziemy pobierać dane z Firebase
    // Na razie używamy sampleRecipe
    setRecipe(sampleRecipe);
    setLoading(false);

    // Poniższy kod będziemy używać po integracji z Firebase
    // const fetchRecipe = async () => {
    //   if (recipeId) {
    //     try {
    //       const recipeData = await getRecipeById(recipeId);
    //       setRecipe(recipeData);
    //     } catch (error) {
    //       console.error("Błąd podczas pobierania przepisu:", error);
    //     } finally {
    //       setLoading(false);
    //     }
    //   }
    // };
    // fetchRecipe();
  }, [recipeId]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Ładowanie przepisu...</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Nie znaleziono przepisu</Text>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Wróć do listy przepisów</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>← Wróć</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{recipe.title}</Text>
        </View>

        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>Zdjęcie przepisu</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Czas przygotowania</Text>
              <Text style={styles.infoValue}>{recipe.prepTime}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Czas gotowania</Text>
              <Text style={styles.infoValue}>{recipe.cookTime}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Porcje</Text>
              <Text style={styles.infoValue}>{recipe.servings}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Poziom trudności</Text>
              <Text style={styles.infoValue}>{recipe.difficulty}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Składniki</Text>
            {recipe.ingredients.map((ingredient, index) => (
              <Text key={index} style={styles.listItem}>• {ingredient}</Text>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Przygotowanie</Text>
            {recipe.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>{index + 1}</Text>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  backButton: {
    position: 'absolute',
    left: 15,
    top: 50,
    zIndex: 1,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '500',
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: COLORS.lightText,
  },
  content: {
    padding: 15,
  },
  infoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  infoItem: {
    width: '48%',
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.lightText,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 5,
    color: COLORS.text,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.text,
  },
  listItem: {
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  instructionNumber: {
    width: 25,
    height: 25,
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    textAlign: 'center',
    lineHeight: 25,
    color: COLORS.white,
    fontWeight: 'bold',
    marginRight: 10,
    marginTop: 2,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
});

export default RecipeDetailScreen; 