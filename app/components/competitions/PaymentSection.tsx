import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { TeamPaymentStatusResponse } from '../../shared/types';
import { brand } from '../../constants/branding';

interface PaymentSectionProps {
  paymentStatus: TeamPaymentStatusResponse | null;
  loading: boolean;
  isCaptain: boolean;
  currentPlayerId?: string;
  onPayFull?: () => void;
  onPayShare?: () => void;
}

export default function PaymentSection({
  paymentStatus,
  loading,
  isCaptain,
  currentPlayerId,
  onPayFull,
  onPayShare,
}: PaymentSectionProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={brand.colors.primary} />
      </View>
    );
  }

  if (!paymentStatus) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Unable to load payment status</Text>
      </View>
    );
  }

  const {
    paidInFull,
    totalAmount,
    playerShare,
    amountPaid,
    amountOwed,
    playerPayments,
  } = paymentStatus;

  // Find current player's payment status
  const currentPlayerPayment = currentPlayerId
    ? playerPayments.find((p) => p.playerId === currentPlayerId)
    : null;

  const formatCurrency = (amount: number) => `$${amount.toFixed(0)}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment</Text>
        {paidInFull && (
          <View style={styles.paidBadge}>
            <FontAwesome name="check" size={12} color="#fff" />
            <Text style={styles.paidBadgeText}>Paid in Full</Text>
          </View>
        )}
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Team Fee</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
        </View>
        {playerShare && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Per Player Share</Text>
            <Text style={styles.summaryValue}>{formatCurrency(playerShare)}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amount Paid</Text>
          <Text style={[styles.summaryValue, styles.paidAmount]}>{formatCurrency(amountPaid)}</Text>
        </View>
        {amountOwed > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text style={[styles.summaryValue, styles.owedAmount]}>{formatCurrency(amountOwed)}</Text>
          </View>
        )}
      </View>

      {/* Player Payment Status */}
      {playerPayments.length > 0 && (
        <View style={styles.playersSection}>
          <Text style={styles.playersTitle}>Payment Status</Text>
          {playerPayments.map((pp) => (
            <View key={pp.playerId} style={styles.playerRow}>
              <View style={styles.playerInfo}>
                <FontAwesome
                  name={pp.paid ? 'check-circle' : 'circle-o'}
                  size={16}
                  color={pp.paid ? brand.colors.success : brand.colors.textMuted}
                />
                <Text style={styles.playerName}>{pp.playerName}</Text>
              </View>
              <Text style={[styles.playerAmount, pp.paid && styles.playerAmountPaid]}>
                {pp.paid ? 'Paid' : formatCurrency(pp.amountOwed)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Payment Actions */}
      {!paidInFull && (
        <View style={styles.actions}>
          {isCaptain && onPayFull && (
            <TouchableOpacity style={styles.payFullButton} onPress={onPayFull}>
              <FontAwesome name="credit-card" size={16} color="#fff" />
              <Text style={styles.payFullText}>Pay Full Amount ({formatCurrency(amountOwed)})</Text>
            </TouchableOpacity>
          )}
          {currentPlayerPayment && !currentPlayerPayment.paid && onPayShare && (
            <TouchableOpacity style={styles.payShareButton} onPress={onPayShare}>
              <FontAwesome name="user" size={16} color={brand.colors.primary} />
              <Text style={styles.payShareText}>
                Pay My Share ({formatCurrency(currentPlayerPayment.amountOwed)})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: brand.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.colors.text,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  paidBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  summary: {
    backgroundColor: brand.colors.background,
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: brand.colors.textLight,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: brand.colors.text,
  },
  paidAmount: {
    color: brand.colors.success,
  },
  owedAmount: {
    color: brand.colors.warning,
  },
  playersSection: {
    marginBottom: 16,
  },
  playersTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: brand.colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerName: {
    fontSize: 14,
    color: brand.colors.text,
  },
  playerAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: brand.colors.warning,
  },
  playerAmountPaid: {
    color: brand.colors.success,
  },
  actions: {
    gap: 10,
  },
  payFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  payFullText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  payShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.colors.surface,
    borderWidth: 1,
    borderColor: brand.colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  payShareText: {
    color: brand.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: brand.colors.error,
    textAlign: 'center',
  },
});
