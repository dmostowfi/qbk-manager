import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { brand } from '../../constants/branding';

export default function CheckoutCancelScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <FontAwesome name="times-circle" size={80} color={brand.colors.textMuted} />
        </View>

        <Text style={styles.title}>Checkout Cancelled</Text>
        <Text style={styles.subtitle}>
          Your payment was cancelled. No charges were made to your account.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/membership')}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.secondaryButtonText}>Back to Events</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: brand.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: brand.colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: brand.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: brand.colors.border,
  },
  secondaryButtonText: {
    color: brand.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
