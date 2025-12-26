import { useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { Box, CircularProgress, Alert } from '@mui/material';
import { Event } from '../../types';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface EventCalendarProps {
  events: Event[];
  loading: boolean;
  error: string | null;
  onSelectEvent: (event: Event) => void;
}

const eventTypeColors: Record<string, string> = {
  CLASS: '#1976d2',
  OPEN_PLAY: '#2e7d32',
  PRIVATE_EVENT: '#9c27b0',
  TOURNAMENT: '#d32f2f',
  LEAGUE: '#ed6c02',
  OTHER: '#0288d1',
};

export default function EventCalendar({ events, loading, error, onSelectEvent }: EventCalendarProps) {
  const minTime = new Date();
  minTime.setHours(6, 0, 0, 0);

  const maxTime = new Date();
  maxTime.setHours(23, 0, 0, 0);

  const calendarEvents = useMemo(() => {
    return events.map((event) => ({
      id: event.id,
      title: `${event.title} (Court ${event.courtId})`,
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      resource: event,
    }));
  }, [events]);

  const eventStyleGetter = (event: { resource: Event }) => {
    const backgroundColor = eventTypeColors[event.resource.eventType] || '#1976d2';
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: event.resource.status === 'CANCELLED' ? 0.5 : 1,
        color: 'white',
        border: 'none',
      },
    };
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
    <Box className="h-[700px]">
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        defaultView={Views.WEEK}
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={(event) => onSelectEvent(event.resource)}
        popup
        step={30}
        timeslots={2}
        min={minTime}
        max={maxTime}
      />
    </Box>
  );
}
