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
import { Player } from '../types';
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

export default function MyProfilePage() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await meApi.getProfile();
        setPlayer(data);
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

  if (error || !player) {
    return <Alert severity="error">{error || 'Profile not found'}</Alert>;
  }

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
              {player.firstName} {player.lastName}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              Email
            </Typography>
            <Typography variant="body1" gutterBottom>
              {player.email}
            </Typography>

            {player.phone && (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Phone
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {player.phone}
                </Typography>
              </>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Membership
            </Typography>
            <Box sx={{ mb: 2, mt: 0.5 }}>
              <Chip
                label={membershipTypeLabels[player.membershipType]}
                color={membershipTypeColors[player.membershipType]}
                size="small"
                sx={{ mr: 1 }}
              />
              <Chip
                label={player.membershipStatus}
                color={membershipStatusColors[player.membershipStatus]}
                size="small"
                variant="outlined"
              />
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              Class Credits
            </Typography>
            <Typography variant="h6" gutterBottom>
              {player.classCredits}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              Drop-in Credits
            </Typography>
            <Typography variant="h6" gutterBottom>
              {player.dropInCredits}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
