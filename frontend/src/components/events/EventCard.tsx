import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime,
  Person,
  Group,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Event } from '../../types';

interface EventCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
}

const eventTypeColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
  CLASS: 'primary',
  OPEN_PLAY: 'success',
  PRIVATE_LESSON: 'secondary',
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

export default function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  const enrollmentCount = event.enrollments?.length || 0;

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-grow">
        <Box className="flex justify-between items-start mb-2">
          <Typography variant="h6" component="h3" className="font-medium">
            {event.title}
          </Typography>
          <Chip
            label={event.eventType.replace('_', ' ')}
            color={eventTypeColors[event.eventType]}
            size="small"
          />
        </Box>

        <Box className="flex items-center gap-1 text-gray-600 mb-2">
          <AccessTime fontSize="small" />
          <Typography variant="body2">
            {format(startTime, 'MMM d, yyyy')} | {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
          </Typography>
        </Box>

        <Box className="flex flex-wrap gap-1 mb-2">
          <Chip label={`Court ${event.courtId}`} size="small" variant="outlined" />
          <Chip label={levelLabels[event.level]} size="small" variant="outlined" />
          <Chip label={genderLabels[event.gender]} size="small" variant="outlined" />
          {event.isYouth && <Chip label="Youth" size="small" color="info" />}
        </Box>

        {event.instructor && (
          <Box className="flex items-center gap-1 text-gray-600 mb-1">
            <Person fontSize="small" />
            <Typography variant="body2">{event.instructor}</Typography>
          </Box>
        )}

        <Box className="flex items-center gap-1 text-gray-600">
          <Group fontSize="small" />
          <Typography variant="body2">
            {enrollmentCount} / {event.maxCapacity} enrolled
          </Typography>
        </Box>

        {event.description && (
          <Typography variant="body2" color="text.secondary" className="mt-2">
            {event.description}
          </Typography>
        )}
      </CardContent>

      <CardActions className="justify-end">
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(event)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(event)}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}
