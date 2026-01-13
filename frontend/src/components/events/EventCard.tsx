import {
  Card,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AddCircle as EnrollIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Event } from '../../types';
import { isEventEditable } from '../../utils/eventUtils';

interface EventCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onView: (event: Event) => void;
  canEdit?: boolean;
}

const eventTypeColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
  CLASS: 'primary',
  OPEN_PLAY: 'success',
  PRIVATE_EVENT: 'secondary',
  TOURNAMENT: 'warning',
  LEAGUE: 'warning',
  OTHER: 'info',
};

const levelLabels: Record<string, string> = {
  INTRO_I: 'Intro I',
  INTRO_II: 'Intro II',
  INTRO_III: 'Intro III',
  INTRO_IV: 'Intro IV',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const genderLabels: Record<string, string> = {
  MENS: "Men's",
  WOMENS: "Women's",
  COED: 'Co-ed',
};

export default function EventCard({ event, onEdit, onDelete, onView, canEdit = false }: EventCardProps) {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  const editable = canEdit && isEventEditable(event.startTime);

  return (
    <Card
      className="flex items-center px-4 py-4 cursor-pointer hover:bg-gray-50"
      onClick={() => editable ? onEdit(event) : onView(event)}
    >
      <Box className="flex items-center gap-4 flex-grow">
        <Box className="min-w-[140px]">
          <Typography variant="body2" color="text.secondary">
            {format(startTime, 'MMM d, yyyy')}
          </Typography>
          <Typography variant="body2" className="font-medium">
            {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
          </Typography>
        </Box>

        <Box className="min-w-[200px]">
          <Typography variant="body1" className="font-medium">
            {event.title}
          </Typography>
          {event.instructor && (
            <Typography variant="body2" color="text.secondary">
              {event.instructor}
            </Typography>
          )}
        </Box>

        <Box className="flex items-center gap-2">
          <Chip
            label={event.eventType.replace('_', ' ')}
            color={eventTypeColors[event.eventType]}
            size="small"
          />
          <Chip label={`Court ${event.courtId}`} size="small" variant="outlined" />
          <Chip label={levelLabels[event.level]} size="small" variant="outlined" />
          <Chip label={genderLabels[event.gender]} size="small" variant="outlined" />
          {event.isYouth && <Chip label="Youth" size="small" color="info" />}
        </Box>

        <Typography variant="body2" color="text.secondary" className="ml-auto mr-4">
          {event.currentEnrollment}/{event.maxCapacity}
        </Typography>
      </Box>

      <Box className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {editable ? (
          <>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => onEdit(event)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => onDelete(event)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <Tooltip title="Enroll">
            <IconButton size="small" color="primary" onClick={() => onView(event)}>
              <EnrollIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Card>
  );
}
