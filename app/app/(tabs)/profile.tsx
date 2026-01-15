import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useAppAuth } from '../../contexts/AuthContext';
import { meApi } from '../../shared/api/services';
import { UserProfile, ActionItem, Message, Transaction } from '../../shared/types';
import { brand } from '../../constants/branding';
import { computeActionItems, getDemoMessages, getDemoTransactions } from '../../shared/utils/dashboardUtils';

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  staff: 'Staff',
  player: 'Player',
};

const membershipLabels: Record<string, string> = {
  GOLD: 'Gold Membership',
  DROP_IN: 'Drop-in',
  NONE: 'No Membership',
};

const transactionTypeLabels: Record<string, string> = {
  MEMBERSHIP_PURCHASE: 'Membership',
  CREDIT_PURCHASE: 'Purchase',
  CLASS_ENROLLMENT: 'Class',
  DROP_IN: 'Drop-in',
  REFUND: 'Refund',
};

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { role, loading: authLoading } = useAppAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await meApi.getProfile();
        setProfile(data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchProfile();
    }
  }, [authLoading]);

  // Compute action items from profile
  const actionItems = useMemo(() => {
    if (!profile) return [];
    return computeActionItems(profile);
  }, [profile]);

  // Demo messages (will be replaced with API call later)
  const messages = useMemo(() => getDemoMessages(), []);

  // Demo transactions (will be replaced with API call later)
  const transactions = useMemo(() => getDemoTransactions(), []);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  if (loading || authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={brand.colors.primary} />
      </View>
    );
  }

  const isPlayer = role === 'player';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.firstName?.[0] || user?.firstName?.[0] || '?'}
            {profile?.lastName?.[0] || user?.lastName?.[0] || ''}
          </Text>
        </View>
        <Text style={styles.name}>
          {profile?.firstName || user?.firstName} {profile?.lastName || user?.lastName}
        </Text>
        <Text style={styles.email}>{profile?.email || user?.emailAddresses?.[0]?.emailAddress}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleLabels[role || ''] || role}</Text>
        </View>
      </View>

      {/* Membership Section - Full Width at Top */}
      {isPlayer && profile && (
        <View style={styles.membershipSection}>
          <View style={styles.membershipRow}>
            <View style={styles.membershipInfo}>
              <Text style={styles.membershipLabel}>Membership</Text>
              <Text style={styles.membershipValue}>
                {membershipLabels[profile.membershipType || ''] || profile.membershipType || 'N/A'}
              </Text>
            </View>
            <View style={styles.membershipInfo}>
              <Text style={styles.membershipLabel}>Status</Text>
              <Text style={[
                styles.membershipValue,
                profile.membershipStatus === 'ACTIVE' && styles.statusActive,
                profile.membershipStatus === 'PAUSED' && styles.statusPaused,
              ]}>
                {profile.membershipStatus || 'N/A'}
              </Text>
            </View>
            <View style={styles.creditCard}>
              <Text style={styles.creditValue}>{profile.classCredits ?? 0}</Text>
              <Text style={styles.creditLabel}>Class Credits</Text>
            </View>
            <View style={styles.creditCard}>
              <Text style={styles.creditValue}>{profile.dropInCredits ?? 0}</Text>
              <Text style={styles.creditLabel}>Drop-in Credits</Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Items and Messages - Side by Side */}
      {isPlayer && (actionItems.length > 0 || messages.length > 0) && (
        <View style={styles.twoColumnRow}>
          {/* Action Items Column */}
          <View style={styles.column}>
            <View style={styles.actionItemsSection}>
              <View style={styles.actionItemsHeader}>
                <Text style={styles.actionItemsSectionTitle}>Action Items</Text>
                {actionItems.length > 0 && (
                  <View style={styles.actionItemsBadge}>
                    <Text style={styles.actionItemsBadgeText}>{actionItems.length}</Text>
                  </View>
                )}
              </View>
              {actionItems.length === 0 ? (
                <Text style={styles.emptyText}>No action items</Text>
              ) : (
                actionItems.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.actionItem,
                      item.priority === 'high' && styles.actionItemHigh,
                      item.priority === 'medium' && styles.actionItemMedium,
                    ]}
                  >
                    <View style={styles.actionItemContent}>
                      <Text style={styles.actionItemTitle}>{item.title}</Text>
                      <Text style={styles.actionItemDescription}>{item.description}</Text>
                    </View>
                    {item.action && (
                      <TouchableOpacity style={styles.actionItemButton}>
                        <Text style={styles.actionItemButtonText}>{item.action.label}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Messages Column */}
          <View style={styles.column}>
            <View style={styles.messagesSection}>
              <Text style={styles.messagesSectionTitle}>Messages</Text>
              {messages.length === 0 ? (
                <Text style={styles.emptyText}>No messages</Text>
              ) : (
                messages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageCard,
                      message.type === 'warning' && styles.messageWarning,
                      message.type === 'success' && styles.messageSuccess,
                    ]}
                  >
                    <Text style={styles.messageTitle}>{message.title}</Text>
                    <Text style={styles.messageBody}>{message.body}</Text>
                    <Text style={styles.messageDate}>
                      {new Date(message.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      )}

      {/* Transaction History Section */}
      {isPlayer && (
        <View style={styles.transactionSection}>
          <Text style={styles.transactionSectionTitle}>Transaction History</Text>
          <View style={styles.ledger}>
            {/* Header Row */}
            <View style={styles.ledgerHeader}>
              <Text style={[styles.ledgerHeaderCell, styles.ledgerDateCol]}>Date</Text>
              <Text style={[styles.ledgerHeaderCell, styles.ledgerIdCol]}>ID</Text>
              <Text style={[styles.ledgerHeaderCell, styles.ledgerTypeCol]}>Type</Text>
              <Text style={[styles.ledgerHeaderCell, styles.ledgerDescCol]}>Description</Text>
              <Text style={[styles.ledgerHeaderCell, styles.ledgerAmountCol]}>Amount</Text>
            </View>
            {/* Data Rows or Empty State */}
            {transactions.length === 0 ? (
              <View style={styles.ledgerEmptyRow}>
                <Text style={styles.ledgerEmptyText}>No transactions at this time</Text>
              </View>
            ) : (
              transactions.map((txn, index) => (
                <View
                  key={txn.id}
                  style={[
                    styles.ledgerRow,
                    index % 2 === 0 && styles.ledgerRowEven,
                  ]}
                >
                  <Text style={[styles.ledgerCell, styles.ledgerDateCol]}>
                    {new Date(txn.date).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.ledgerCell, styles.ledgerIdCol, styles.ledgerIdText]}>
                    {txn.id}
                  </Text>
                  <Text style={[styles.ledgerCell, styles.ledgerTypeCol]}>
                    {transactionTypeLabels[txn.type] || txn.type}
                  </Text>
                  <Text style={[styles.ledgerCell, styles.ledgerDescCol]}>
                    {txn.description}
                  </Text>
                  <Text style={[
                    styles.ledgerCell,
                    styles.ledgerAmountCol,
                    txn.amount > 0 && styles.ledgerAmountCharge,
                    txn.amount < 0 && styles.ledgerAmountCredit,
                  ]}>
                    {txn.amount === 0 ? '-' : txn.amount > 0 ? `$${txn.amount.toFixed(2)}` : `-$${Math.abs(txn.amount).toFixed(2)}`}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
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
    maxWidth: brand.content.maxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: brand.colors.surface,
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
    borderRadius: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: brand.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: brand.colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: brand.colors.textLight,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: brand.sidebar.activeBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    color: brand.colors.primary,
    fontWeight: '600',
  },
  // Membership Section (horizontal bar at top)
  membershipSection: {
    backgroundColor: brand.colors.surface,
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  membershipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  membershipInfo: {
    minWidth: 100,
  },
  membershipLabel: {
    fontSize: 12,
    color: brand.colors.textLight,
    marginBottom: 4,
  },
  membershipValue: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.colors.text,
  },
  statusActive: {
    color: brand.colors.success,
  },
  statusPaused: {
    color: brand.colors.warning,
  },
  creditCard: {
    backgroundColor: brand.sidebar.activeBackground,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  creditValue: {
    fontSize: 24,
    fontWeight: '700',
    color: brand.colors.primary,
  },
  creditLabel: {
    fontSize: 11,
    color: brand.colors.textLight,
    marginTop: 2,
  },
  // Two column layout
  twoColumnRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  column: {
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: brand.colors.textLight,
    fontStyle: 'italic',
  },
  signOutButton: {
    backgroundColor: brand.colors.error,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Action Items Section styles
  actionItemsSection: {
    backgroundColor: brand.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: brand.colors.secondary,
    minHeight: 200,
  },
  actionItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionItemsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: brand.colors.text,
  },
  actionItemsBadge: {
    backgroundColor: brand.colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  actionItemsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  actionItem: {
    backgroundColor: '#fffbf0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: brand.colors.secondary,
  },
  actionItemHigh: {
    borderLeftColor: brand.colors.error,
    backgroundColor: '#fff5f5',
  },
  actionItemMedium: {
    borderLeftColor: brand.colors.warning,
    backgroundColor: '#fff8e1',
  },
  actionItemContent: {
    marginBottom: 10,
  },
  actionItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: brand.colors.text,
    marginBottom: 4,
  },
  actionItemDescription: {
    fontSize: 13,
    color: brand.colors.textLight,
    lineHeight: 18,
  },
  actionItemButton: {
    backgroundColor: brand.colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  actionItemButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Messages Section styles
  messagesSection: {
    backgroundColor: brand.colors.surface,
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
  },
  messagesSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brand.colors.text,
    marginBottom: 16,
  },
  messageCard: {
    backgroundColor: brand.colors.background,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  messageWarning: {
    backgroundColor: '#fff8e1',
    borderLeftWidth: 3,
    borderLeftColor: brand.colors.warning,
  },
  messageSuccess: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 3,
    borderLeftColor: brand.colors.success,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: brand.colors.text,
    marginBottom: 4,
  },
  messageBody: {
    fontSize: 13,
    color: brand.colors.textLight,
    lineHeight: 18,
    marginBottom: 6,
  },
  messageDate: {
    fontSize: 11,
    color: brand.colors.textMuted,
  },
  // Transaction History Section
  transactionSection: {
    backgroundColor: brand.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  transactionSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brand.colors.text,
    marginBottom: 16,
  },
  // Ledger styles
  ledger: {
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  ledgerHeader: {
    flexDirection: 'row',
    backgroundColor: brand.colors.background,
    borderBottomWidth: 2,
    borderBottomColor: brand.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ledgerHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: brand.colors.textLight,
    textTransform: 'uppercase',
  },
  ledgerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  ledgerRowEven: {
    backgroundColor: brand.colors.background,
  },
  ledgerCell: {
    fontSize: 13,
    color: brand.colors.text,
  },
  ledgerDateCol: {
    width: 90,
  },
  ledgerIdCol: {
    width: 120,
  },
  ledgerIdText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: brand.colors.textMuted,
  },
  ledgerTypeCol: {
    width: 80,
  },
  ledgerDescCol: {
    flex: 1,
  },
  ledgerAmountCol: {
    width: 80,
    textAlign: 'right',
  },
  ledgerAmountCharge: {
    color: brand.colors.text,
    fontWeight: '500',
  },
  ledgerAmountCredit: {
    color: brand.colors.success,
    fontWeight: '500',
  },
  ledgerEmptyRow: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  ledgerEmptyText: {
    fontSize: 14,
    color: brand.colors.textMuted,
    fontStyle: 'italic',
  },
});
