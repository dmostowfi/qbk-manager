import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Event, EventFormData, EventType, SkillLevel, GenderCategory } from '../../types';

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
  { value: 'PRIVATE_LESSON', label: 'Private Lesson' },
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
    } else {
      setFormData(defaultFormData);
    }
  }, [event, open]);

  const handleChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
      <DialogContent>
        <Box className="pt-2">
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Title"
                fullWidth
                required
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
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
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
              <FormControl fullWidth>
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
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="End Time"
                value={formData.endTime}
                onChange={(value) => value && handleChange('endTime', value)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
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
              <FormControl fullWidth>
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
                value={formData.maxCapacity}
                onChange={(e) => handleChange('maxCapacity', parseInt(e.target.value) || 0)}
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Instructor"
                fullWidth
                value={formData.instructor}
                onChange={(e) => handleChange('instructor', e.target.value)}
              />
            </Grid>

            <Grid item xs={6}>
              <FormControlLabel
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || !formData.title}
        >
          {submitting ? 'Saving...' : event ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
