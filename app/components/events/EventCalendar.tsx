import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Mode } from 'react-native-big-calendar';
import dayjs from 'dayjs';
import { Event } from '../../shared/types';

interface EventCalendarProps {
  events: Event[];
  isEnrolled: (eventId: string) => boolean;
  canEnroll: boolean;
  canEdit: boolean;
  onEnroll: (event: Event) => void;
  onUnenroll: (event: Event) => void;
  onEventPress: (event: Event) => void;
}

type CalendarMode = 'day' | 'week' | 'month';

const modeOptions: { value: CalendarMode; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

// Color palette for different event types
const eventTypeColors: Record<string, string> = {
  CLASS: '#1976d2',
  OPEN_PLAY: '#4caf50',
  PRIVATE_EVENT: '#ff9800',
  TOURNAMENT: '#e91e63',
  LEAGUE: '#9c27b0',
  OTHER: '#607d8b',
};

export default function EventCalendar({
  events,
  onEventPress,
}: EventCalendarProps) {
  const [mode, setMode] = useState<CalendarMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Transform events into the format expected by react-native-big-calendar
  const calendarEvents = useMemo(() => {
    return events.map((event) => ({
      title: event.title,
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      color: eventTypeColors[event.eventType] || eventTypeColors.OTHER,
      // Store original event for onPress handler
      _original: event,
    }));
  }, [events]);

  const handleEventPress = useCallback((calendarEvent: any) => {
    if (calendarEvent._original) {
      onEventPress(calendarEvent._original);
    }
  }, [onEventPress]);

  const handlePrevious = () => {
    const newDate = dayjs(currentDate)
      .subtract(1, mode === 'day' ? 'day' : mode === 'week' ? 'week' : 'month')
      .toDate();
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = dayjs(currentDate)
      .add(1, mode === 'day' ? 'day' : mode === 'week' ? 'week' : 'month')
      .toDate();
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getHeaderTitle = () => {
    if (mode === 'day') {
      return dayjs(currentDate).format('dddd, MMMM D, YYYY');
    } else if (mode === 'week') {
      const start = dayjs(currentDate).startOf('week');
      const end = dayjs(currentDate).endOf('week');
      if (start.month() === end.month()) {
        return `${start.format('MMM D')} - ${end.format('D, YYYY')}`;
      }
      return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
    }
    return dayjs(currentDate).format('MMMM YYYY');
  };

  return (
    <View style={styles.container}>
      {/* Mode selector */}
      <View style={styles.modeSelector}>
        {modeOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.modeButton, mode === option.value && styles.modeButtonActive]}
            onPress={() => setMode(option.value)}
          >
            <Text style={[styles.modeButtonText, mode === option.value && styles.modeButtonTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Navigation header */}
      <View style={styles.navigation}>
        <TouchableOpacity onPress={handlePrevious} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleToday} style={styles.todayButton}>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNext} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar */}
      <Calendar
        events={calendarEvents}
        height={600}
        mode={mode as Mode}
        date={currentDate}
        onPressEvent={handleEventPress}
        swipeEnabled={true}
        onSwipeEnd={(date) => setCurrentDate(date)}
        eventCellStyle={(event) => ({
          backgroundColor: event.color || '#1976d2',
          borderRadius: 4,
        })}
        theme={{
          palette: {
            primary: {
              main: '#1976d2',
              contrastText: '#fff',
            },
            gray: {
              '100': '#f5f5f5',
              '200': '#eeeeee',
              '300': '#e0e0e0',
              '500': '#9e9e9e',
              '800': '#424242',
            },
          },
          typography: {
            fontFamily: 'System',
            xs: { fontSize: 10 },
            sm: { fontSize: 12 },
            xl: { fontSize: 16 },
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  modeButtonActive: {
    backgroundColor: '#1976d2',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  navButtonText: {
    fontSize: 24,
    color: '#1976d2',
    fontWeight: '300',
  },
  todayButton: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
