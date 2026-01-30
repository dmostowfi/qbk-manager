import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { TeamPaymentStatusResponse, Competition } from '../../shared/types';
import { brand } from '../../constants/branding';
import dayjs from 'dayjs';

interface PaymentSectionProps {
  paymentStatus: TeamPaymentStatusResponse | null;
  loading: boolean;
  isCaptain: boolean;
  currentPlayerId?: string;
  competition: Competition;
  onPayDeposit: (paymentType: 'FULL' | 'SPLIT') => void;
  onPayTeamFee: (paymentType: 'FULL' | 'SPLIT') => void;
}

export default function PaymentSection({
  paymentStatus,
  loading,
  isCaptain,
  currentPlayerId,
  competition,
  onPayDeposit,
  onPayTeamFee,
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
    depositPaid,
    depositAmount,
    effectiveFee,
    earlyBirdApplied,
    balanceRemaining,
    amountPaid,
    playerPayments,
  } = paymentStatus;

  const formatCurrency = (amount: number) => `$${amount.toFixed(0)}`;
  const earlyBirdDeadline = dayjs(competition.earlyBirdDeadline);
  const depositDeadline = dayjs(competition.depositDeadline);
  const earlyBirdDiscount = competition.earlyBirdDiscount;

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

      {/* Deposit Section */}
      <View style={styles.phaseBox}>
        <View style={styles.phaseHeader}>
          <Text style={styles.phaseTitle}>Deposit</Text>
          {depositPaid ? (
            <View style={styles.phasePaidChip}>
              <FontAwesome name="check" size={10} color="#fff" />
              <Text style={styles.phasePaidText}>Paid</Text>
            </View>
          ) : (
            <Text style={styles.phaseAmount}>{formatCurrency(depositAmount)}</Text>
          )}
        </View>

        {!depositPaid && (
          <>
            <Text style={styles.phaseNote}>
              Due by {depositDeadline.format('MMM D, YYYY')}
            </Text>
            <View style={styles.phaseActions}>
              {isCaptain && (
                <TouchableOpacity style={styles.payFullButton} onPress={() => onPayDeposit('FULL')}>
                  <FontAwesome name="credit-card" size={14} color="#fff" />
                  <Text style={styles.payFullText}>Pay Full Deposit ({formatCurrency(depositAmount)})</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.payShareButton} onPress={() => onPayDeposit('SPLIT')}>
                <FontAwesome name="user" size={14} color={brand.colors.primary} />
                <Text style={styles.payShareText}>Pay My Share</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Team Fee Section */}
      <View style={styles.phaseBox}>
        <View style={styles.phaseHeader}>
          <Text style={styles.phaseTitle}>Team Fee</Text>
          {paidInFull ? (
            <View style={styles.phasePaidChip}>
              <FontAwesome name="check" size={10} color="#fff" />
              <Text style={styles.phasePaidText}>Paid</Text>
            </View>
          ) : (
            <Text style={styles.phaseAmount}>{formatCurrency(effectiveFee)}</Text>
          )}
        </View>

        {earlyBirdApplied ? (
          <Text style={styles.earlyBirdApplied}>Early bird discount applied (-{formatCurrency(earlyBirdDiscount)})</Text>
        ) : !depositPaid && earlyBirdDiscount > 0 ? (
          <Text style={styles.earlyBirdHint}>
            Pay deposit by {earlyBirdDeadline.format('MMM D')} to save {formatCurrency(earlyBirdDiscount)}
          </Text>
        ) : null}

        {!paidInFull && depositPaid && (
          <>
            {balanceRemaining > 0 && (
              <Text style={styles.phaseNote}>
                Remaining: {formatCurrency(balanceRemaining)}
              </Text>
            )}
            <View style={styles.phaseActions}>
              {isCaptain && (
                <TouchableOpacity style={styles.payFullButton} onPress={() => onPayTeamFee('FULL')}>
                  <FontAwesome name="credit-card" size={14} color="#fff" />
                  <Text style={styles.payFullText}>Pay Full Balance ({formatCurrency(balanceRemaining)})</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.payShareButton} onPress={() => onPayTeamFee('SPLIT')}>
                <FontAwesome name="user" size={14} color={brand.colors.primary} />
                <Text style={styles.payShareText}>Pay My Share</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!paidInFull && !depositPaid && (
          <Text style={styles.lockedNote}>Pay deposit first to unlock team fee payment</Text>
        )}
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Fee</Text>
          <Text style={styles.summaryValue}>{formatCurrency(effectiveFee)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amount Paid</Text>
          <Text style={[styles.summaryValue, styles.paidAmount]}>{formatCurrency(amountPaid)}</Text>
        </View>
        {balanceRemaining > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text style={[styles.summaryValue, styles.owedAmount]}>{formatCurrency(balanceRemaining)}</Text>
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
                {pp.paid ? formatCurrency(pp.amountPaid) : 'Unpaid'}
              </Text>
            </View>
          ))}
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
  // Phase box (deposit / team fee)
  phaseBox: {
    backgroundColor: brand.colors.background,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  phaseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: brand.colors.text,
  },
  phaseAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: brand.colors.text,
  },
  phasePaidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  phasePaidText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  phaseNote: {
    fontSize: 13,
    color: brand.colors.textLight,
    marginBottom: 10,
  },
  phaseActions: {
    gap: 8,
    marginTop: 4,
  },
  earlyBirdHint: {
    fontSize: 13,
    color: brand.colors.primary,
    fontWeight: '500',
    marginBottom: 8,
  },
  earlyBirdApplied: {
    fontSize: 13,
    color: brand.colors.success,
    fontWeight: '500',
    marginBottom: 4,
  },
  lockedNote: {
    fontSize: 13,
    color: brand.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Summary
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
  // Player payments
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
  // Buttons
  payFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  payFullText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  payShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.colors.surface,
    borderWidth: 1,
    borderColor: brand.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  payShareText: {
    color: brand.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: brand.colors.error,
    textAlign: 'center',
  },
});
