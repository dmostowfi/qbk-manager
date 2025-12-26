import { useState } from 'react';
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
  Tooltip,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { usePlayers } from '../hooks/usePlayers';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);

  const { players, loading, error, createPlayer, updatePlayer, deletePlayer, setFilters } = usePlayers();

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
    } else {
      await createPlayer(data);
    }
  };

  const handleDeleteClick = (player: Player) => {
    setPlayerToDelete(player);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (playerToDelete) {
      await deletePlayer(playerToDelete.id);
      setDeleteDialogOpen(false);
      setPlayerToDelete(null);
    }
  };

  const getTotalCredits = (player: Player) => {
    return player.classCredits + player.dropInCredits;
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Player
        </Button>
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
            Add your first player to get started
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
                <TableCell align="right">Credits</TableCell>
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
                  <TableCell align="right">
                    {getTotalCredits(player) > 0 ? (
                      <Tooltip title={`Class: ${player.classCredits}, Drop-in: ${player.dropInCredits}`}>
                        <span>{getTotalCredits(player)}</span>
                      </Tooltip>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpenForm(player)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(player)}
                      >
                        <DeleteIcon fontSize="small" />
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

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Player</DialogTitle>
        <DialogContent>
          Are you sure you want to delete {playerToDelete?.firstName} {playerToDelete?.lastName}?
          This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
