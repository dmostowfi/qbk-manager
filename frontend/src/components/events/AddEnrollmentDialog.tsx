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
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { Player } from '../../types';
import { playersApi } from '../../services/api';

interface AddEnrollmentDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (playerId: string) => Promise<void>;
  existingPlayerIds: string[];
}

export default function AddEnrollmentDialog({
  open,
  onClose,
  onAdd,
  existingPlayerIds,
}: AddEnrollmentDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      setSelectedPlayerId(null);
    } catch (error) {
      console.error('Failed to search players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedPlayerId) return;

    setSubmitting(true);
    try {
      await onAdd(selectedPlayerId);
      handleClose();
    } catch (error) {
      console.error('Failed to add enrollment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPlayerId(null);
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
            {searchResults.map((player) => (
              <ListItem key={player.id} disablePadding>
                <ListItemButton
                  onClick={() => setSelectedPlayerId(player.id)}
                  selected={selectedPlayerId === player.id}
                >
                  <Radio
                    checked={selectedPlayerId === player.id}
                    onChange={() => setSelectedPlayerId(player.id)}
                  />
                  <ListItemText
                    primary={`${player.firstName} ${player.lastName}`}
                    secondary={player.email}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={!selectedPlayerId || submitting}
        >
          {submitting ? 'Adding...' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
