import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  Platform,
  Pressable,
} from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAppAuth } from '../../contexts/AuthContext';
import { brand } from '../../constants/branding';

const MOBILE_BREAKPOINT = 768;

interface NavItemProps {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  href: string;
  isActive: boolean;
  onPress: () => void;
}

function NavItem({ icon, label, isActive, onPress }: NavItemProps) {
  return (
    <TouchableOpacity
      style={[
        styles.navItem,
        isActive && styles.navItemActive,
      ]}
      onPress={onPress}
    >
      <FontAwesome
        name={icon}
        size={20}
        color={isActive ? brand.colors.primary : brand.colors.textLight}
      />
      <Text
        style={[
          styles.navLabel,
          isActive && styles.navLabelActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { role, loading } = useAppAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isMobile = width < MOBILE_BREAKPOINT;
  const showSidebar = !isMobile || sidebarOpen;

  // Show players tab for admin/staff, hide for players
  const canViewPlayers = loading || role === 'admin' || role === 'staff';

  const navItems = [
    { icon: 'calendar' as const, label: 'Events', href: '/' },
    ...(canViewPlayers ? [{ icon: 'users' as const, label: 'Players', href: '/players' }] : []),
    { icon: 'user' as const, label: 'Profile', href: '/profile' },
  ];

  const handleNavPress = (href: string) => {
    router.push(href as any);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/index';
    }
    return pathname.startsWith(href);
  };

  return (
    <View style={styles.container}>
      {/* Mobile Header */}
      {isMobile && (
        <View style={styles.mobileHeader}>
          <TouchableOpacity
            style={styles.hamburger}
            onPress={() => setSidebarOpen(!sidebarOpen)}
          >
            <FontAwesome name={sidebarOpen ? 'times' : 'bars'} size={24} color={brand.colors.text} />
          </TouchableOpacity>
          <Text style={styles.mobileTitle}>{brand.name}</Text>
          <View style={styles.hamburger} />
        </View>
      )}

      <View style={styles.mainContainer}>
        {/* Overlay for mobile when sidebar is open */}
        {isMobile && sidebarOpen && (
          <Pressable
            style={styles.overlay}
            onPress={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        {showSidebar && (
          <View style={[styles.sidebar, isMobile && styles.sidebarMobile]}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <Image
                source={require('../../assets/images/qbk_logo.avif')}
                style={styles.logo}
                resizeMode="contain"
              />
              {!isMobile && (
                <Text style={styles.brandName}>{brand.name}</Text>
              )}
            </View>

            {/* Navigation */}
            <View style={styles.nav}>
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  isActive={isActive(item.href)}
                  onPress={() => handleNavPress(item.href)}
                />
              ))}
            </View>

            {/* Footer */}
            <View style={styles.sidebarFooter}>
              <Text style={styles.tagline}>{brand.tagline}</Text>
            </View>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.colors.background,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: brand.colors.surface,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  hamburger: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brand.colors.text,
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 5,
  },
  sidebar: {
    width: brand.sidebar.width,
    backgroundColor: brand.sidebar.background,
    borderRightWidth: 1,
    borderRightColor: brand.colors.border,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  sidebarMobile: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    paddingTop: 20,
    ...Platform.select({
      web: {
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
      } as any,
      default: {
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
    }),
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  logo: {
    width: 80,
    height: 80,
  },
  brandName: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: brand.colors.text,
    textAlign: 'center',
  },
  nav: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: brand.sidebar.activeBackground,
    borderLeftWidth: 3,
    borderLeftColor: brand.sidebar.activeBorder,
  },
  navLabel: {
    marginLeft: 12,
    fontSize: 15,
    color: brand.colors.textLight,
    fontWeight: '500',
  },
  navLabelActive: {
    color: brand.colors.primary,
    fontWeight: '600',
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: brand.colors.border,
  },
  tagline: {
    fontSize: 12,
    color: brand.colors.textMuted,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: brand.colors.background,
  },
});
