import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Undo as UndoIcon } from '@mui/icons-material';
import { Enrollment, EnrollmentStatus, Player } from '../../types';
import AddEnrollmentDialog from './AddEnrollmentDialog';

interface EnrollmentSectionProps {
  enrollments: Enrollment[];
  currentEnrollment: number;
  maxCapacity: number;
  isEditable: boolean;
  eventType: string;
  pendingAdds: Record<string, Player>;
  pendingRemoves: Record<string, Enrollment>;
  onAddPending: (player: Player) => void;
  onRemovePending: (enrollment: Enrollment) => void;
  onUndoAdd: (playerId: string) => void;
  onUndoRemove: (enrollmentId: string) => void;
}

const statusColors: Record<EnrollmentStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  REGISTERED: 'success',
  WAITLISTED: 'warning',
  CANCELLED: 'error',
  ATTENDED: 'info',
  NO_SHOW: 'default',
};

export default function EnrollmentSection({
  enrollments,
  currentEnrollment,
  maxCapacity,
  isEditable,
  eventType,
  pendingAdds,
  pendingRemoves,
  onAddPending,
  onRemovePending,
  onUndoAdd,
  onUndoRemove,
}: EnrollmentSectionProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Existing player IDs + pending add IDs (to exclude from add dialog)
  const existingPlayerIds = [
    ...enrollments.map((e) => e.playerId),
    ...Object.keys(pendingAdds),
  ];

  // Calculate display count (current + pending adds - pending removes)
  const pendingAddCount = Object.keys(pendingAdds).length;
  const pendingRemoveCount = Object.keys(pendingRemoves).length;
  const displayCount = currentEnrollment + pendingAddCount - pendingRemoveCount;

  const hasPendingChanges = pendingAddCount > 0 || pendingRemoveCount > 0;
  const pendingAddsList = Object.values(pendingAdds);
  const hasAnyRows = enrollments.length > 0 || pendingAddsList.length > 0;

  return (
    <Box>
      <Box className="flex justify-between items-center mb-2">
        <Typography variant="subtitle1" className="font-medium">
          Enrollments ({displayCount}/{maxCapacity})
          {hasPendingChanges && (
            <Typography component="span" variant="body2" color="warning.main" className="ml-2">
              (unsaved changes)
            </Typography>
          )}
        </Typography>
        {isEditable && (
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add
          </Button>
        )}
      </Box>

      {!hasAnyRows ? (
        <Typography color="text.secondary" variant="body2">
          No enrollments
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                {isEditable && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Existing enrollments */}
              {enrollments.map((enrollment) => {
                const isPendingRemove = enrollment.id in pendingRemoves;
                return (
                  <TableRow
                    key={enrollment.id}
                    sx={{
                      opacity: isPendingRemove ? 0.5 : 1,
                      textDecoration: isPendingRemove ? 'line-through' : 'none',
                    }}
                  >
                    <TableCell>
                      {enrollment.player?.firstName} {enrollment.player?.lastName}
                    </TableCell>
                    <TableCell>{enrollment.player?.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={isPendingRemove ? 'REMOVING' : enrollment.status}
                        color={isPendingRemove ? 'error' : statusColors[enrollment.status]}
                        size="small"
                        variant={isPendingRemove ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                    {isEditable && (
                      <TableCell align="right">
                        {isPendingRemove ? (
                          <Tooltip title="Undo remove">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => onUndoRemove(enrollment.id)}
                            >
                              <UndoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Remove">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => onRemovePending(enrollment)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {/* Pending adds */}
              {pendingAddsList.map((player) => (
                <TableRow
                  key={`pending-${player.id}`}
                  sx={{ backgroundColor: 'action.hover' }}
                >
                  <TableCell>
                    {player.firstName} {player.lastName}
                  </TableCell>
                  <TableCell>{player.email}</TableCell>
                  <TableCell>
                    <Chip
                      label="PENDING"
                      color="info"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  {isEditable && (
                    <TableCell align="right">
                      <Tooltip title="Undo add">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => onUndoAdd(player.id)}
                        >
                          <UndoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <AddEnrollmentDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={onAddPending}
        existingPlayerIds={existingPlayerIds}
        eventType={eventType}
      />
    </Box>
  );
}
