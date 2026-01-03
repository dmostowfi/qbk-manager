import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Box,
  Divider,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Event, EventFormData, EventType, SkillLevel, GenderCategory, Enrollment, Player } from '../../types';
import { eventsApi, enrollmentsApi } from '../../services/api';
import EnrollmentSection from './EnrollmentSection';
import { isEventEditable } from '../../utils/eventUtils';

dayjs.extend(utc);
dayjs.extend(timezone);

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EventFormData) => Promise<void>;
  event?: Event | null;
}

const eventTypes: { value: EventType; label: string }[] = [
  { value: 'CLASS', label: 'Class' },
  { value: 'OPEN_PLAY', label: 'Open Play' },
  { value: 'PRIVATE_EVENT', label: 'Private Event' },
  { value: 'TOURNAMENT', label: 'Tournament' },
  { value: 'LEAGUE', label: 'League' },
  { value: 'OTHER', label: 'Other' },
];

const skillLevels: { value: SkillLevel; label: string }[] = [
  { value: 'INTRO_I', label: 'Intro I' },
  { value: 'INTRO_II', label: 'Intro II' },
  { value: 'INTRO_III', label: 'Intro III' },
  { value: 'INTRO_IV', label: 'Intro IV' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const genderCategories: { value: GenderCategory; label: string }[] = [
  { value: 'MENS', label: "Men's" },
  { value: 'WOMENS', label: "Women's" },
  { value: 'COED', label: 'Co-ed' },
];

const courts = [1, 2, 3];

interface FormData {
  title: string;
  description: string;
  eventType: EventType;
  courtId: number;
  startTime: Dayjs;
  endTime: Dayjs;
  maxCapacity: number;
  instructor: string;
  level: SkillLevel;
  gender: GenderCategory;
  isYouth: boolean;
  isRecurring: boolean;
}

const defaultFormData: FormData = {
  title: '',
  description: '',
  eventType: 'CLASS',
  courtId: 1,
  startTime: dayjs().tz('America/New_York'),
  endTime: dayjs().tz('America/New_York').add(1, 'hour'),
  maxCapacity: 12,
  instructor: '',
  level: 'INTRO_I',
  gender: 'COED',
  isYouth: false,
  isRecurring: false,
};

export default function EventForm({ open, onClose, onSubmit, event }: EventFormProps) {
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [currentEnrollment, setCurrentEnrollment] = useState(0);
  const [pendingAdds, setPendingAdds] = useState<Record<string, Player>>({});
  const [pendingRemoves, setPendingRemoves] = useState<Record<string, Enrollment>>({});

  const fetchEventDetails = useCallback(async () => {
    if (event?.id) {
      try {
        const fullEvent = await eventsApi.getById(event.id);
        setEnrollments(fullEvent.enrollments || []);
        setCurrentEnrollment(fullEvent.currentEnrollment);
      } catch (error) {
        console.error('Failed to fetch event details:', error);
      }
    }
  }, [event?.id]);

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        eventType: event.eventType,
        courtId: event.courtId,
        startTime: dayjs(event.startTime).tz('America/New_York'),
        endTime: dayjs(event.endTime).tz('America/New_York'),
        maxCapacity: event.maxCapacity,
        instructor: event.instructor || '',
        level: event.level,
        gender: event.gender,
        isYouth: event.isYouth,
        isRecurring: event.isRecurring,
      });
      fetchEventDetails();
    } else {
      setFormData(defaultFormData);
      setEnrollments([]);
      setCurrentEnrollment(0);
    }
    // Reset pending state when dialog opens/closes or event changes
    setPendingAdds({});
    setPendingRemoves({});
  }, [event, open, fetchEventDetails]);

  const editable = event ? isEventEditable(event.startTime) : true;

  const handleChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Pending enrollment handlers
  const handleAddPending = (player: Player) => {
    setPendingAdds((prev) => ({ ...prev, [player.id]: player }));
  };

  const handleRemovePending = (enrollment: Enrollment) => {
    setPendingRemoves((prev) => ({ ...prev, [enrollment.id]: enrollment }));
  };

  const handleUndoAdd = (playerId: string) => {
    setPendingAdds((prev) => {
      const { [playerId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleUndoRemove = (enrollmentId: string) => {
    setPendingRemoves((prev) => {
      const { [enrollmentId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const submitData: EventFormData = {
        ...formData,
        startTime: formData.startTime.toDate(),
        endTime: formData.endTime.toDate(),
      };
      await onSubmit(submitData);

      // Submit pending enrollment changes if editing an existing event
      if (event?.id) {
        const addIds = Object.keys(pendingAdds);
        const removeIds = Object.keys(pendingRemoves);

        if (addIds.length > 0) {
          await enrollmentsApi.enroll(event.id, addIds);
        }
        if (removeIds.length > 0) {
          await enrollmentsApi.unenroll(event.id, removeIds);
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const dialogTitle = !event ? 'Create Event' : editable ? 'Edit Event' : 'View Event';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent>
        <Box className="pt-2">
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Title"
                fullWidth
                required
                disabled={!editable}
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                disabled={!editable}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={!editable}>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={formData.eventType}
                  label="Event Type"
                  onChange={(e) => handleChange('eventType', e.target.value)}
                >
                  {eventTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={!editable}>
                <InputLabel>Court</InputLabel>
                <Select
                  value={formData.courtId}
                  label="Court"
                  onChange={(e) => handleChange('courtId', e.target.value)}
                >
                  {courts.map((court) => (
                    <MenuItem key={court} value={court}>
                      Court {court}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Start Time"
                value={formData.startTime}
                onChange={(value) => value && handleChange('startTime', value)}
                timeSteps={{ minutes: 30 }}
                disabled={!editable}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="End Time"
                value={formData.endTime}
                onChange={(value) => value && handleChange('endTime', value)}
                timeSteps={{ minutes: 30 }}
                disabled={!editable}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={!editable}>
                <InputLabel>Skill Level</InputLabel>
                <Select
                  value={formData.level}
                  label="Skill Level"
                  onChange={(e) => handleChange('level', e.target.value)}
                >
                  {skillLevels.map((level) => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={!editable}>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={formData.gender}
                  label="Gender"
                  onChange={(e) => handleChange('gender', e.target.value)}
                >
                  {genderCategories.map((gender) => (
                    <MenuItem key={gender.value} value={gender.value}>
                      {gender.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Max Capacity"
                type="number"
                fullWidth
                disabled={!editable}
                value={formData.maxCapacity}
                onChange={(e) => handleChange('maxCapacity', parseInt(e.target.value) || 0)}
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Instructor"
                fullWidth
                disabled={!editable}
                value={formData.instructor}
                onChange={(e) => handleChange('instructor', e.target.value)}
              />
            </Grid>

            <Grid item xs={6}>
              <FormControlLabel
                disabled={!editable}
                control={
                  <Switch
                    checked={formData.isYouth}
                    onChange={(e) => handleChange('isYouth', e.target.checked)}
                  />
                }
                label="Youth"
              />
            </Grid>

            <Grid item xs={6}>
              <FormControlLabel
                disabled={!editable}
                control={
                  <Switch
                    checked={formData.isRecurring}
                    onChange={(e) => handleChange('isRecurring', e.target.checked)}
                  />
                }
                label="Recurring"
              />
            </Grid>
          </Grid>

          {event && (
            <>
              <Divider className="my-4" />
              <EnrollmentSection
                enrollments={enrollments}
                currentEnrollment={currentEnrollment}
                maxCapacity={formData.maxCapacity}
                isEditable={editable}
                eventType={formData.eventType}
                pendingAdds={pendingAdds}
                pendingRemoves={pendingRemoves}
                onAddPending={handleAddPending}
                onRemovePending={handleRemovePending}
                onUndoAdd={handleUndoAdd}
                onUndoRemove={handleUndoRemove}
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{editable ? 'Cancel' : 'Close'}</Button>
        {editable && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !formData.title}
          >
            {submitting ? 'Saving...' : event ? 'Update' : 'Create'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
