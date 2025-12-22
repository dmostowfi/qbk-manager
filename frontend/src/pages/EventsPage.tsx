import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Add as AddIcon, ViewList, CalendarMonth } from '@mui/icons-material';
import EventList from '../components/events/EventList';
import EventCalendar from '../components/events/EventCalendar';
import EventForm from '../components/events/EventForm';
import { useEvents } from '../hooks/useEvents';
import { Event, EventFormData } from '../types';

type ViewMode = 'list' | 'calendar';

export default function EventsPage() {
  const [view, setView] = useState<ViewMode>('list');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  const { events, loading, error, createEvent, updateEvent, deleteEvent } = useEvents();

  const handleOpenForm = (event?: Event) => {
    setSelectedEvent(event || null);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedEvent(null);
  };

  const handleSubmit = async (data: EventFormData) => {
    if (selectedEvent) {
      await updateEvent(selectedEvent.id, data);
    } else {
      await createEvent(data);
    }
  };

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (eventToDelete) {
      await deleteEvent(eventToDelete.id);
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  return (
    <Box>
      <Box className="flex justify-between items-center mb-6">
        <Typography variant="h4" component="h1">
          Events
        </Typography>
        <Box className="flex gap-3">
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_, v) => v && setView(v)}
            size="small"
          >
            <ToggleButton value="list">
              <ViewList sx={{ mr: 0.5 }} /> List
            </ToggleButton>
            <ToggleButton value="calendar">
              <CalendarMonth sx={{ mr: 0.5 }} /> Calendar
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenForm()}
          >
            Add Event
          </Button>
        </Box>
      </Box>

      {view === 'list' ? (
        <EventList
          events={events}
          loading={loading}
          error={error}
          onEdit={handleOpenForm}
          onDelete={handleDeleteClick}
        />
      ) : (
        <EventCalendar
          events={events}
          loading={loading}
          error={error}
          onSelectEvent={handleOpenForm}
        />
      )}

      <EventForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        event={selectedEvent}
      />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Event</DialogTitle>
        <DialogContent>
          Are you sure you want to delete "{eventToDelete?.title}"? This action cannot be undone.
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
