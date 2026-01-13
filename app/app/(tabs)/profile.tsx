import { useState, useEffect } from 'react';
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
import { UserProfile } from '../../shared/types';

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

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  if (loading || authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  const isPlayer = role === 'player';

  return (
    <ScrollView style={styles.container}>
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

      {isPlayer && profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membership</Text>

          <View style={styles.infoCard}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>
              {membershipLabels[profile.membershipType || ''] || profile.membershipType || 'N/A'}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{profile.membershipStatus || 'N/A'}</Text>
          </View>

          <View style={styles.creditsRow}>
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

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1976d2',
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
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    color: '#1976d2',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  creditsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  creditCard: {
    flex: 1,
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  creditValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2e7d32',
  },
  creditLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  signOutButton: {
    backgroundColor: '#d32f2f',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
    marginTop: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
