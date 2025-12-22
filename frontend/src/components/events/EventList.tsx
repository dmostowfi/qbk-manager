import { Box, Grid, Typography, CircularProgress, Alert } from '@mui/material';
import EventCard from './EventCard';
import { Event } from '../../types';

interface EventListProps {
  events: Event[];
  loading: boolean;
  error: string | null;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
}

export default function EventList({ events, loading, error, onEdit, onDelete }: EventListProps) {
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
    <Grid container spacing={3}>
      {events.map((event) => (
        <Grid item xs={12} sm={6} md={4} key={event.id}>
          <EventCard event={event} onEdit={onEdit} onDelete={onDelete} />
        </Grid>
      ))}
    </Grid>
  );
}
