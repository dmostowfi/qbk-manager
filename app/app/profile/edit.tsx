import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAppAuth } from '../../contexts/AuthContext';
import { meApi, AgreementType, ProfileUpdateData } from '../../shared/api/services';
import { UserProfile } from '../../shared/types';
import { brand } from '../../constants/branding';
import PlayerForm from '../../components/players/PlayerForm';

interface AgreementCardProps {
  title: string;
  description: string;
  signedAt: string | null | undefined;
  agreementType: AgreementType;
  onSign: (type: AgreementType) => void;
  signing: boolean;
}

function AgreementCard({ title, description, signedAt, agreementType, onSign, signing }: AgreementCardProps) {
  const isSigned = !!signedAt;

  return (
    <View style={styles.agreementCard}>
      <View style={styles.agreementContent}>
        <Text style={styles.agreementTitle}>{title}</Text>
        <Text style={styles.agreementDescription}>{description}</Text>
      </View>
      <View style={styles.agreementAction}>
        {isSigned ? (
          <View style={styles.signedBadge}>
            <FontAwesome name="check" size={14} color={brand.colors.success} />
            <Text style={styles.signedText}>
              Signed {new Date(signedAt).toLocaleDateString()}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.signButton}
            onPress={() => onSign(agreementType)}
            disabled={signing}
          >
            {signing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.signButtonText}>Sign</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const { role, loading: authLoading } = useAppAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<AgreementType | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

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

  const handleSign = async (agreementType: AgreementType) => {
    setSigning(agreementType);
    try {
      const result = await meApi.signAgreement(agreementType);
      // Update local profile state
      setProfile((prev) => {
        if (!prev) return prev;
        const fieldMap: Record<AgreementType, keyof UserProfile> = {
          tos: 'tosAcceptedAt',
          privacy: 'privacyAcceptedAt',
          waiver: 'waiverSignedAt',
        };
        return {
          ...prev,
          [fieldMap[agreementType]]: result.signedAt,
        };
      });
    } catch (err) {
      console.error('Failed to sign agreement:', err);
      Alert.alert('Error', 'Failed to sign agreement. Please try again.');
    } finally {
      setSigning(null);
    }
  };

  const handleUpdateProfile = async (data: ProfileUpdateData) => {
    const updatedProfile = await meApi.updateProfile(data);
    setProfile(updatedProfile);
  };

  if (loading || authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={brand.colors.primary} />
      </View>
    );
  }

  if (role !== 'player') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>This page is only available for players.</Text>
      </View>
    );
  }

  // Check which contact fields are filled
  const hasPhone = !!profile?.phone;
  const hasAddress = !!(profile?.streetAddress && profile?.city && profile?.state && profile?.zipCode);
  const hasDOB = !!profile?.dateOfBirth;
  const contactComplete = hasPhone && hasAddress && hasDOB;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={brand.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={styles.backButton} />
      </View>

      {/* Contact Info Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setShowEditForm(true)}
          >
            <FontAwesome name="pencil" size={14} color={brand.colors.primary} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <View style={styles.infoValueContainer}>
              <Text style={[styles.infoValue, !hasPhone && styles.infoMissing]}>
                {profile?.phone || 'Not provided'}
              </Text>
              {!hasPhone && <FontAwesome name="exclamation-circle" size={14} color={brand.colors.warning} />}
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <View style={styles.infoValueContainer}>
              <Text style={[styles.infoValue, !hasAddress && styles.infoMissing]}>
                {hasAddress
                  ? `${profile?.streetAddress}, ${profile?.city}, ${profile?.state} ${profile?.zipCode}`
                  : 'Not provided'}
              </Text>
              {!hasAddress && <FontAwesome name="exclamation-circle" size={14} color={brand.colors.warning} />}
            </View>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Date of Birth</Text>
            <View style={styles.infoValueContainer}>
              <Text style={[styles.infoValue, !hasDOB && styles.infoMissing]}>
                {profile?.dateOfBirth || 'Not provided'}
              </Text>
              {!hasDOB && <FontAwesome name="exclamation-circle" size={14} color={brand.colors.warning} />}
            </View>
          </View>
        </View>

        {!contactComplete && (
          <Text style={styles.warningText}>
            Complete your contact information to enable event registration.
          </Text>
        )}
      </View>

      {/* Agreements Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Agreements</Text>
        <Text style={styles.sectionDescription}>
          Please review and sign the following agreements to complete your profile.
        </Text>

        <AgreementCard
          title="Terms of Service"
          description="Review and accept our terms of service"
          signedAt={profile?.tosAcceptedAt}
          agreementType="tos"
          onSign={handleSign}
          signing={signing === 'tos'}
        />

        <AgreementCard
          title="Privacy Policy"
          description="Review our privacy policy"
          signedAt={profile?.privacyAcceptedAt}
          agreementType="privacy"
          onSign={handleSign}
          signing={signing === 'privacy'}
        />

        <AgreementCard
          title="Liability Waiver"
          description="Sign our liability waiver to participate in activities"
          signedAt={profile?.waiverSignedAt}
          agreementType="waiver"
          onSign={handleSign}
          signing={signing === 'waiver'}
        />
      </View>

      {/* Player Form Modal */}
      <PlayerForm
        visible={showEditForm}
        player={profile}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleUpdateProfile}
        mode="player"
      />
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
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: brand.colors.error,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: brand.colors.text,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: brand.colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: brand.colors.textLight,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: brand.colors.surface,
  },
  editButtonText: {
    fontSize: 14,
    color: brand.colors.primary,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: brand.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: brand.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 14,
    color: brand.colors.textLight,
    flex: 1,
  },
  infoValueContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  infoValue: {
    fontSize: 14,
    color: brand.colors.text,
    textAlign: 'right',
  },
  infoMissing: {
    color: brand.colors.textMuted,
    fontStyle: 'italic',
  },
  warningText: {
    fontSize: 13,
    color: brand.colors.warning,
    marginTop: 12,
    fontStyle: 'italic',
  },
  agreementCard: {
    backgroundColor: brand.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: brand.colors.border,
  },
  agreementContent: {
    flex: 1,
  },
  agreementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.colors.text,
    marginBottom: 4,
  },
  agreementDescription: {
    fontSize: 14,
    color: brand.colors.textLight,
  },
  agreementAction: {
    marginLeft: 16,
  },
  signButton: {
    backgroundColor: brand.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  signButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signedText: {
    fontSize: 13,
    color: brand.colors.success,
    fontWeight: '500',
  },
});
