import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useAppAuth } from '../../contexts/AuthContext';
import { productsApi, checkoutApi } from '../../shared/api/services';
import { Product } from '../../shared/types';
import { brand } from '../../constants/branding';

export default function MembershipScreen() {
  const { role } = useAppAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getAll();
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (product: Product) => {
    if (!product.price) return;

    setPurchasing(product.id);
    setError(null);

    try {
      const { url } = await checkoutApi.createSession(product.price.id);

      // Open Stripe Checkout
      if (Platform.OS === 'web') {
        window.location.href = url;
      } else {
        await Linking.openURL(url);
      }
    } catch (err: any) {
      console.error('Failed to create checkout session:', err);
      setError(err.response?.data?.error || 'Failed to start checkout');
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (unitAmount: number | null, currency: string) => {
    if (unitAmount === null) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(unitAmount / 100);
  };

  const getProductCategory = (product: Product): 'membership' | 'class' | 'dropin' => {
    if (product.metadata.membershipType) return 'membership';
    if (product.metadata.classCredits) return 'class';
    return 'dropin';
  };

  // Group products by category
  const memberships = products.filter(p => p.metadata.membershipType);
  const classPacks = products.filter(p => p.metadata.classCredits);
  const dropinPacks = products.filter(p => p.metadata.dropInCredits && !p.metadata.membershipType);

  if (role !== 'player') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>This page is only available for players.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={brand.colors.primary} />
      </View>
    );
  }

  const renderProductCard = (product: Product) => {
    const category = getProductCategory(product);
    const isPurchasing = purchasing === product.id;

    return (
      <View key={product.id} style={styles.productCard}>
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.price?.recurring && (
            <View style={styles.recurringBadge}>
              <Text style={styles.recurringBadgeText}>Monthly</Text>
            </View>
          )}
        </View>

        {product.description && (
          <Text style={styles.productDescription}>{product.description}</Text>
        )}

        <View style={styles.productDetails}>
          {product.metadata.classCredits && (
            <Text style={styles.creditsText}>
              {product.metadata.classCredits} class credit{product.metadata.classCredits !== '1' ? 's' : ''}
            </Text>
          )}
          {product.metadata.dropInCredits && (
            <Text style={styles.creditsText}>
              {product.metadata.dropInCredits} drop-in credit{product.metadata.dropInCredits !== '1' ? 's' : ''}
            </Text>
          )}
          {product.metadata.membershipType && (
            <Text style={styles.creditsText}>
              Unlimited {product.metadata.membershipType === 'GOLD' ? 'classes & drop-ins' : 'drop-ins'}
            </Text>
          )}
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatPrice(product.price?.unitAmount ?? null, product.price?.currency || 'usd')}
          </Text>
          {product.price?.recurring && (
            <Text style={styles.priceInterval}>/{product.price.recurring.interval}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.buyButton, isPurchasing && styles.buyButtonDisabled]}
          onPress={() => handlePurchase(product)}
          disabled={isPurchasing || !product.price}
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buyButtonText}>
              {product.price?.recurring ? 'Subscribe' : 'Buy Now'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderSection = (title: string, items: Product[]) => {
    if (items.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.productsGrid}>
          {items.map(renderProductCard)}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Memberships & Packs</Text>
        <Text style={styles.subtitle}>
          Choose a membership for unlimited access or purchase credit packs
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {renderSection('Memberships', memberships)}
      {renderSection('Class Packs', classPacks)}
      {renderSection('Drop-in Packs', dropinPacks)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.colors.background,
  },
  scrollContent: {
    padding: 16,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: brand.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: brand.colors.textLight,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: brand.colors.error,
    fontSize: 14,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: brand.colors.text,
    marginBottom: 16,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  productCard: {
    backgroundColor: brand.colors.surface,
    borderRadius: 12,
    padding: 20,
    minWidth: 280,
    maxWidth: 350,
    flex: 1,
    borderWidth: 1,
    borderColor: brand.colors.border,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: brand.colors.text,
    flex: 1,
  },
  recurringBadge: {
    backgroundColor: brand.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  recurringBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  productDescription: {
    fontSize: 14,
    color: brand.colors.textLight,
    marginBottom: 12,
    lineHeight: 20,
  },
  productDetails: {
    marginBottom: 12,
  },
  creditsText: {
    fontSize: 14,
    color: brand.colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: brand.colors.primary,
  },
  priceInterval: {
    fontSize: 16,
    color: brand.colors.textLight,
    marginLeft: 2,
  },
  buyButton: {
    backgroundColor: brand.colors.secondary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyButtonDisabled: {
    opacity: 0.6,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
