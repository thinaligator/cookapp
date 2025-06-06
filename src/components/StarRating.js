import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../config/colors';

const StarRating = ({ rating, size = 18, interactive = false, onRatingChange = null }) => {
  // Upewniamy się, że rating jest liczbą
  const numericRating = parseFloat(rating) || 0;
  
  // Zaokrąglamy ocenę do najbliższej całości, jeśli nie jest interaktywna
  const roundedRating = interactive ? numericRating : Math.round(numericRating);
  
  const handlePress = (selectedRating) => {
    if (interactive && onRatingChange) {
      // Upewniamy się, że przekazujemy liczbę
      onRatingChange(Number(selectedRating));
    }
  };
  
  const renderStar = (position) => {
    const starStyle = {
      fontSize: size,
      marginRight: 4,
    };
    
    const isFilled = roundedRating >= position;
    
    return (
      <TouchableOpacity
        key={position}
        onPress={() => handlePress(position)}
        disabled={!interactive}
      >
        <Text style={[starStyle, isFilled ? styles.fullStar : styles.emptyStar]}>
          ★
        </Text>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(position => renderStar(position))}
    </View>
  );
};

const styles = StyleSheet.create({
  fullStar: {
    color: '#FFD700', // złoty kolor
  },
  emptyStar: {
    color: '#D3D3D3', // jasno szary
  }
});

export default StarRating; 