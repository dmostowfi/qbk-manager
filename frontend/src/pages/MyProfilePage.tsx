import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import { UserProfile } from '../types';
import { meApi } from '../services/api';

const membershipTypeLabels: Record<string, string> = {
  GOLD: 'Gold',
  DROP_IN: 'Drop-in',
  NONE: 'None',
};

const membershipTypeColors: Record<string, 'warning' | 'info' | 'default'> = {
  GOLD: 'warning',
  DROP_IN: 'info',
  NONE: 'default',
};

const membershipStatusColors: Record<string, 'success' | 'warning' | 'error'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  CANCELLED: 'error',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  player: 'Player',
};

const roleColors: Record<string, 'error' | 'primary' | 'success'> = {
  admin: 'error',
  staff: 'primary',
  player: 'success',
};

export default function MyProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await meApi.getProfile();
        setProfile(data);
      } catch (err) {
        setError('Failed to load profile');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <Box className="flex justify-center items-center py-12">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return <Alert severity="error">{error || 'Profile not found'}</Alert>;
  }

  const isPlayer = profile.role === 'player';

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Name
            </Typography>
            <Typography variant="body1" gutterBottom>
              {profile.firstName} {profile.lastName}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              Email
            </Typography>
            <Typography variant="body1" gutterBottom>
              {profile.email}
            </Typography>

            {profile.phone && (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Phone
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {profile.phone}
                </Typography>
              </>
            )}

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              Role
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={roleLabels[profile.role]}
                color={roleColors[profile.role]}
                size="small"
              />
            </Box>
          </Grid>

          {isPlayer && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Membership
              </Typography>
              <Box sx={{ mb: 2, mt: 0.5 }}>
                <Chip
                  label={membershipTypeLabels[profile.membershipType!]}
                  color={membershipTypeColors[profile.membershipType!]}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={profile.membershipStatus}
                  color={membershipStatusColors[profile.membershipStatus!]}
                  size="small"
                  variant="outlined"
                />
              </Box>

              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                Class Credits
              </Typography>
              <Typography variant="h6" gutterBottom>
                {profile.classCredits}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                Drop-in Credits
              </Typography>
              <Typography variant="h6" gutterBottom>
                {profile.dropInCredits}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
}
