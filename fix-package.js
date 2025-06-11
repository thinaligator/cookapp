const fs = require('fs');
const path = require('path');

// Ścieżka do pliku package.json
const packageJsonPath = path.join(__dirname, 'package.json');

// Odczytaj zawartość pliku
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Sprawdź, czy expo-background-fetch jest wymienione jako zależność
if (packageJson.dependencies && packageJson.dependencies['expo-background-fetch']) {
  console.log('Znaleziono expo-background-fetch w zależnościach. Usuwam...');
  delete packageJson.dependencies['expo-background-fetch'];
  
  // Zapisz zmodyfikowany plik
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
  console.log('Usunięto expo-background-fetch z package.json');
} else {
  console.log('Nie znaleziono expo-background-fetch w zależnościach.');
}

// Sprawdź również node_modules/.expo/package.json, który może zawierać referencje
try {
  const expoPackageJsonPath = path.join(__dirname, 'node_modules', '.expo', 'package.json');
  if (fs.existsSync(expoPackageJsonPath)) {
    const expoPackageJson = JSON.parse(fs.readFileSync(expoPackageJsonPath, 'utf8'));
    
    if (expoPackageJson.dependencies && expoPackageJson.dependencies['expo-background-fetch']) {
      console.log('Znaleziono expo-background-fetch w zależnościach Expo. Usuwam...');
      delete expoPackageJson.dependencies['expo-background-fetch'];
      
      // Zapisz zmodyfikowany plik
      fs.writeFileSync(expoPackageJsonPath, JSON.stringify(expoPackageJson, null, 2), 'utf8');
      console.log('Usunięto expo-background-fetch z package.json Expo');
    } else {
      console.log('Nie znaleziono expo-background-fetch w zależnościach Expo.');
    }
  }
} catch (error) {
  console.log('Błąd podczas sprawdzania/modyfikacji pliku .expo/package.json:', error.message);
}

console.log('Gotowe. Teraz uruchom "npm install" aby zaktualizować node_modules.'); 