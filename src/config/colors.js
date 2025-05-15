// Plik definiujący podstawowe kolory dla całej aplikacji

export const COLORS = {
  primary: '#FF9F1C',       // Pomarańczowy - główny kolor aplikacji
  secondary: '#FFB347',     // Jaśniejszy pomarańczowy - akcenty
  white: '#FFFFFF',         // Biały - tła, elementy
  background: '#F9F9F9',    // Bardzo jasny szary - tło aplikacji
  text: '#333333',          // Ciemny szary - główny tekst
  lightText: '#777777',     // Jaśniejszy szary - opisy, podtytuły
  error: '#FF6B6B',         // Czerwony - błędy, ostrzeżenia
  success: '#4ECDC4',       // Turkusowy - sukces, potwierdzenia
  shadow: 'rgba(0, 0, 0, 0.1)' // Cień
};

// Eksportujemy pojedyncze kolory dla wygody
export const {
  primary,
  secondary,
  white,
  background,
  text,
  lightText,
  error,
  success,
  shadow
} = COLORS; 