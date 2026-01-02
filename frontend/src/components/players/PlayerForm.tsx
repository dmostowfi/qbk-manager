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
  Grid,
  Box,
} from '@mui/material';
import { Player, MembershipType, MembershipStatus } from '../../types';
import { PlayerFormData } from '../../services/api';

interface PlayerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PlayerFormData) => Promise<void>;
  player?: Player | null;
}

const membershipTypes: { value: MembershipType; label: string }[] = [
  { value: 'GOLD', label: 'Gold' },
  { value: 'DROP_IN', label: 'Drop-in' },
  { value: 'NONE', label: 'None' },
];

const membershipStatuses: { value: MembershipStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
  classCredits: number;
  dropInCredits: number;
}

const defaultFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  streetAddress: '',
  city: '',
  state: '',
  zipCode: '',
  membershipType: 'NONE',
  membershipStatus: 'ACTIVE',
  classCredits: 0,
  dropInCredits: 0,
};

export default function PlayerForm({ open, onClose, onSubmit, player }: PlayerFormProps) {
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (player) {
      setFormData({
        firstName: player.firstName,
        lastName: player.lastName,
        email: player.email,
        phone: player.phone || '',
        streetAddress: player.streetAddress || '',
        city: player.city || '',
        state: player.state || '',
        zipCode: player.zipCode || '',
        membershipType: player.membershipType,
        membershipStatus: player.membershipStatus,
        classCredits: player.classCredits,
        dropInCredits: player.dropInCredits,
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [player, open]);

  const handleChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(formData as PlayerFormData);
      onClose();
    } catch (error) {
      console.error('Failed to save player:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Player</DialogTitle>
      <DialogContent>
        <Box className="pt-2">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                fullWidth
                required
                disabled
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                fullWidth
                required
                disabled
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                disabled
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone"
                fullWidth
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Street Address"
                fullWidth
                value={formData.streetAddress}
                onChange={(e) => handleChange('streetAddress', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="City"
                fullWidth
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="State"
                fullWidth
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Zip Code"
                fullWidth
                value={formData.zipCode}
                onChange={(e) => handleChange('zipCode', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Membership Type</InputLabel>
                <Select
                  value={formData.membershipType}
                  label="Membership Type"
                  onChange={(e) => handleChange('membershipType', e.target.value)}
                >
                  {membershipTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Membership Status</InputLabel>
                <Select
                  value={formData.membershipStatus}
                  label="Membership Status"
                  onChange={(e) => handleChange('membershipStatus', e.target.value)}
                >
                  {membershipStatuses.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Class Credits"
                type="number"
                fullWidth
                value={formData.classCredits}
                onChange={(e) => handleChange('classCredits', parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Drop-in Credits"
                type="number"
                fullWidth
                value={formData.dropInCredits}
                onChange={(e) => handleChange('dropInCredits', parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
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
          disabled={submitting || !formData.firstName || !formData.lastName || !formData.email}
        >
          {submitting ? 'Saving...' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
