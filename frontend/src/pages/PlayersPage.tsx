import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { usePlayers } from '../hooks/usePlayers';
import { useAuth } from '../contexts/AuthContext';
import { Player } from '../types';
import { PlayerFormData } from '../services/api';
import PlayerForm from '../components/players/PlayerForm';

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

export default function PlayersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const { role } = useAuth();
  const { players, loading, error, updatePlayer, setFilters } = usePlayers();

  // Only admin and staff can access this page
  if (role && role !== 'admin' && role !== 'staff') {
    return <Navigate to="/events" replace />;
  }

  const handleSearch = () => {
    setFilters({ search: searchQuery });
  };

  const handleOpenForm = (player?: Player) => {
    setSelectedPlayer(player || null);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedPlayer(null);
  };

  const handleSubmit = async (data: PlayerFormData) => {
    if (selectedPlayer) {
      await updatePlayer(selectedPlayer.id, data);
    }
  };

  if (loading) {
    return (
      <Box className="flex justify-center items-center py-12">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" className="my-4">
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box className="flex justify-between items-center mb-6">
        <Typography variant="h4" component="h1">
          Players
        </Typography>
      </Box>

      <Box className="mb-4 flex gap-2">
        <TextField
          placeholder="Search by email or phone..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ width: 300 }}
        />
        <Button
          variant="outlined"
          onClick={handleSearch}
          startIcon={<SearchIcon />}
        >
          Search
        </Button>
      </Box>

      {players.length === 0 ? (
        <Box className="text-center py-12">
          <Typography variant="h6" color="text.secondary">
            No players found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Players will appear here when they sign up
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Membership</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Class Credits</TableCell>
                <TableCell align="right">Drop-in Credits</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map((player) => (
                <TableRow
                  key={player.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleOpenForm(player)}
                >
                  <TableCell>
                    {player.firstName} {player.lastName}
                  </TableCell>
                  <TableCell>{player.email}</TableCell>
                  <TableCell>{player.phone || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={membershipTypeLabels[player.membershipType]}
                      color={membershipTypeColors[player.membershipType]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={player.membershipStatus}
                      color={membershipStatusColors[player.membershipStatus]}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">{player.classCredits}</TableCell>
                  <TableCell align="right">{player.dropInCredits}</TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpenForm(player)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <PlayerForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        player={selectedPlayer}
      />
    </Box>
  );
}
