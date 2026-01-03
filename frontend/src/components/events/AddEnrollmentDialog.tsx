import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Radio,
  Typography,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { Player } from '../../types';
import { playersApi } from '../../services/api';

interface AddEnrollmentDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (player: Player) => void;
  existingPlayerIds: string[];
  eventType: string;
}

// Check if player is eligible for the event type
function getEligibility(player: Player, eventType: string): { eligible: boolean; reason?: string } {
  const isActive = player.membershipStatus === 'ACTIVE';

  // GOLD: unlimited everything, but only if active
  if (player.membershipType === 'GOLD' && isActive) {
    return { eligible: true };
  }

  // DROP_IN: unlimited open play if active, otherwise needs credits
  if (player.membershipType === 'DROP_IN') {
    if (eventType === 'CLASS' && player.classCredits < 1) {
      return { eligible: false, reason: 'No class credits' };
    }
    if (eventType === 'OPEN_PLAY' && isActive) {
      return { eligible: true };
    }
    // Paused/cancelled DROP_IN for OPEN_PLAY falls through to credit check below
  }

  // Credit-based eligibility (NONE, or paused/cancelled memberships)
  if (eventType === 'CLASS' && player.classCredits < 1) {
    return { eligible: false, reason: 'No class credits' };
  }
  if (eventType === 'OPEN_PLAY' && player.dropInCredits < 1) {
    return { eligible: false, reason: 'No drop-in credits' };
  }

  return { eligible: true };
}

const membershipTypeLabels: Record<string, string> = {
  GOLD: 'Gold',
  DROP_IN: 'Drop-in',
  NONE: 'None',
};

export default function AddEnrollmentDialog({
  open,
  onClose,
  onAdd,
  existingPlayerIds,
  eventType,
}: AddEnrollmentDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const players = await playersApi.getAll({ search: searchQuery });
      // Filter out players already enrolled
      const available = players.filter((p) => !existingPlayerIds.includes(p.id));
      setSearchResults(available);
      setSelectedPlayer(null);
    } catch (error) {
      console.error('Failed to search players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!selectedPlayer) return;
    onAdd(selectedPlayer);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPlayer(null);
    setSearched(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Player to Event</DialogTitle>
      <DialogContent>
        <Box className="flex gap-2 mt-2 mb-4">
          <TextField
            placeholder="Search by email or phone..."
            size="small"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button
            variant="outlined"
            onClick={handleSearch}
            disabled={loading}
            startIcon={<SearchIcon />}
          >
            Search
          </Button>
        </Box>

        {loading ? (
          <Box className="flex justify-center py-4">
            <CircularProgress size={24} />
          </Box>
        ) : searched && searchResults.length === 0 ? (
          <Typography color="text.secondary" className="text-center py-4">
            No available players found
          </Typography>
        ) : (
          <List>
            {searchResults.map((player) => {
              const eligibility = getEligibility(player, eventType);
              return (
                <ListItem key={player.id} disablePadding>
                  <ListItemButton
                    onClick={() => eligibility.eligible && setSelectedPlayer(player)}
                    selected={selectedPlayer?.id === player.id}
                    disabled={!eligibility.eligible}
                    sx={{ opacity: eligibility.eligible ? 1 : 0.6 }}
                  >
                    <Radio
                      checked={selectedPlayer?.id === player.id}
                      disabled={!eligibility.eligible}
                    />
                    <ListItemText
                      primary={
                        <Box className="flex items-center gap-2">
                          <span>{player.firstName} {player.lastName}</span>
                          <Chip
                            label={membershipTypeLabels[player.membershipType]}
                            size="small"
                            variant="outlined"
                          />
                          {!eligibility.eligible && (
                            <Chip
                              label={eligibility.reason}
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box component="span" className="flex gap-4">
                          <span>{player.email}</span>
                          <span>Class: {player.classCredits}</span>
                          <span>Drop-in: {player.dropInCredits}</span>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={!selectedPlayer}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
