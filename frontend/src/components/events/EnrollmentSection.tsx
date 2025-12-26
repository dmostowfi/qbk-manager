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
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Enrollment, EnrollmentStatus } from '../../types';
import { enrollmentsApi } from '../../services/api';
import AddEnrollmentDialog from './AddEnrollmentDialog';

interface EnrollmentSectionProps {
  eventId: string;
  enrollments: Enrollment[];
  currentEnrollment: number;
  maxCapacity: number;
  isEditable: boolean;
  onEnrollmentChange: () => void;
}

const statusColors: Record<EnrollmentStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  REGISTERED: 'success',
  WAITLISTED: 'warning',
  CANCELLED: 'error',
  ATTENDED: 'info',
  NO_SHOW: 'default',
};

export default function EnrollmentSection({
  eventId,
  enrollments,
  currentEnrollment,
  maxCapacity,
  isEditable,
  onEnrollmentChange,
}: EnrollmentSectionProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleAddEnrollment = async (playerId: string) => {
    await enrollmentsApi.enroll(eventId, playerId);
    onEnrollmentChange();
  };

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    await enrollmentsApi.unenroll(eventId, enrollmentId);
    onEnrollmentChange();
  };

  const existingPlayerIds = enrollments.map((e) => e.playerId);

  return (
    <Box>
      <Box className="flex justify-between items-center mb-2">
        <Typography variant="subtitle1" className="font-medium">
          Enrollments ({currentEnrollment}/{maxCapacity})
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

      {enrollments.length === 0 ? (
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
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    {enrollment.player?.firstName} {enrollment.player?.lastName}
                  </TableCell>
                  <TableCell>{enrollment.player?.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={enrollment.status}
                      color={statusColors[enrollment.status]}
                      size="small"
                    />
                  </TableCell>
                  {isEditable && (
                    <TableCell align="right">
                      <Tooltip title="Remove">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveEnrollment(enrollment.id)}
                        >
                          <DeleteIcon fontSize="small" />
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
        onAdd={handleAddEnrollment}
        existingPlayerIds={existingPlayerIds}
      />
    </Box>
  );
}
