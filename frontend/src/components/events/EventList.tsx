import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import EventCard from './EventCard';
import { Event } from '../../types';

interface EventListProps {
  events: Event[];
  loading: boolean;
  error: string | null;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onView: (event: Event) => void;
  canEdit?: boolean;
}

export default function EventList({ events, loading, error, onEdit, onDelete, onView, canEdit = false }: EventListProps) {
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

  if (events.length === 0) {
    return (
      <Box className="text-center py-12">
        <Typography variant="h6" color="text.secondary">
          No events found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first event to get started
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="flex flex-col gap-2">
      {events.map((event) => (
        <EventCard key={event.id} event={event} onEdit={onEdit} onDelete={onDelete} onView={onView} canEdit={canEdit} />
      ))}
    </Box>
  );
}
