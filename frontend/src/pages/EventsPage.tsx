import { useState, useMemo } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  ListSubheader,
} from '@mui/material';
import { Add as AddIcon, ViewList, CalendarMonth } from '@mui/icons-material';
import { EventType, SkillLevel, GenderCategory } from '../types';
import EventList from '../components/events/EventList';
import EventCalendar from '../components/events/EventCalendar';
import EventForm from '../components/events/EventForm';
import { useEvents } from '../hooks/useEvents';
import { Event, EventFormData } from '../types';

type ViewMode = 'list' | 'calendar';
type TimeFilter = 'all' | 'upcoming' | 'past';

const eventTypeOptions: { value: EventType; label: string }[] = [
  { value: 'CLASS', label: 'Class' },
  { value: 'OPEN_PLAY', label: 'Open Play' },
  { value: 'PRIVATE_EVENT', label: 'Private Event' },
  { value: 'TOURNAMENT', label: 'Tournament' },
  { value: 'LEAGUE', label: 'League' },
  { value: 'OTHER', label: 'Other' },
];

const skillLevelOptions: { value: SkillLevel; label: string }[] = [
  { value: 'INTRO_I', label: 'Intro I' },
  { value: 'INTRO_II', label: 'Intro II' },
  { value: 'INTRO_III', label: 'Intro III' },
  { value: 'INTRO_IV', label: 'Intro IV' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const genderOptions: { value: GenderCategory; label: string }[] = [
  { value: 'MENS', label: "Men's" },
  { value: 'WOMENS', label: "Women's" },
  { value: 'COED', label: 'Co-ed' },
];

const allFilterOptions = [
  { type: 'eventType' as const, value: 'CLASS', label: 'Class' },
  { type: 'eventType' as const, value: 'OPEN_PLAY', label: 'Open Play' },
  { type: 'eventType' as const, value: 'PRIVATE_EVENT', label: 'Private Event' },
  { type: 'eventType' as const, value: 'TOURNAMENT', label: 'Tournament' },
  { type: 'eventType' as const, value: 'LEAGUE', label: 'League' },
  { type: 'eventType' as const, value: 'OTHER', label: 'Other' },
  { type: 'level' as const, value: 'INTRO_I', label: 'Intro I' },
  { type: 'level' as const, value: 'INTRO_II', label: 'Intro II' },
  { type: 'level' as const, value: 'INTRO_III', label: 'Intro III' },
  { type: 'level' as const, value: 'INTRO_IV', label: 'Intro IV' },
  { type: 'level' as const, value: 'INTERMEDIATE', label: 'Intermediate' },
  { type: 'level' as const, value: 'ADVANCED', label: 'Advanced' },
  { type: 'gender' as const, value: 'MENS', label: "Men's" },
  { type: 'gender' as const, value: 'WOMENS', label: "Women's" },
  { type: 'gender' as const, value: 'COED', label: 'Co-ed' },
];

export default function EventsPage() {
  const [view, setView] = useState<ViewMode>('list');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  const { events, loading, error, createEvent, updateEvent, deleteEvent, refetch } = useEvents();

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const eventTypeFilters = selectedFilters.filter(f => allFilterOptions.find(o => o.value === f)?.type === 'eventType');
    const levelFilters = selectedFilters.filter(f => allFilterOptions.find(o => o.value === f)?.type === 'level');
    const genderFilters = selectedFilters.filter(f => allFilterOptions.find(o => o.value === f)?.type === 'gender');

    return events.filter((event) => {
      const eventStart = new Date(event.startTime);
      if (timeFilter === 'upcoming' && eventStart < now) return false;
      if (timeFilter === 'past' && eventStart >= now) return false;
      if (eventTypeFilters.length > 0 && !eventTypeFilters.includes(event.eventType)) return false;
      if (levelFilters.length > 0 && !levelFilters.includes(event.level)) return false;
      if (genderFilters.length > 0 && !genderFilters.includes(event.gender)) return false;
      return true;
    });
  }, [events, timeFilter, selectedFilters]);

  const handleOpenForm = (event?: Event) => {
    setSelectedEvent(event || null);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedEvent(null);
    refetch(); // Refresh events list to get updated enrollment counts
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

      {view === 'list' && (
        <Box className="mb-4 flex items-center gap-4 flex-wrap">
          <ToggleButtonGroup
            value={timeFilter}
            exclusive
            onChange={(_, v) => v && setTimeFilter(v)}
            size="small"
          >
            <ToggleButton value="upcoming">Upcoming</ToggleButton>
            <ToggleButton value="past">Past</ToggleButton>
            <ToggleButton value="all">All</ToggleButton>
          </ToggleButtonGroup>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filters</InputLabel>
            <Select
              multiple
              value={selectedFilters}
              onChange={(e) => setSelectedFilters(e.target.value as string[])}
              input={<OutlinedInput label="Filters" />}
              renderValue={(selected) => {
                if (selected.length === 0) return 'None';
                if (selected.length === 1) {
                  return allFilterOptions.find(o => o.value === selected[0])?.label;
                }
                return `${selected.length} filters`;
              }}
            >
              <ListSubheader>Event Type</ListSubheader>
              {eventTypeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
              <ListSubheader>Skill Level</ListSubheader>
              {skillLevelOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
              <ListSubheader>Gender</ListSubheader>
              {genderOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {view === 'list' ? (
        <EventList
          events={filteredEvents}
          loading={loading}
          error={error}
          onEdit={handleOpenForm}
          onDelete={handleDeleteClick}
          onView={handleOpenForm}
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
