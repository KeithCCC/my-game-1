import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function TitleScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chromatic Clusters</Text>
      <Text style={styles.subtitle}>Tap connected same-color groups to clear the board.</Text>
      <View style={styles.menu}>
        <Link href="/stages" style={styles.button}>
          Stage Select
        </Link>
        <Link href="/settings" style={styles.buttonSecondary}>
          Settings
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#0A0F1C',
  },
  title: {
    fontSize: 38,
    color: '#F4F8FF',
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 14,
    color: '#9CB2D8',
    fontSize: 16,
    textAlign: 'center',
  },
  menu: {
    marginTop: 40,
    gap: 12,
  },
  button: {
    textAlign: 'center',
    backgroundColor: '#3A86FF',
    color: '#F7FAFF',
    borderRadius: 12,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '700',
  },
  buttonSecondary: {
    textAlign: 'center',
    backgroundColor: '#24344F',
    color: '#DDE8FF',
    borderRadius: 12,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '700',
  },
});
