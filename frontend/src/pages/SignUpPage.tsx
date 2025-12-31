import { SignUp } from '@clerk/clerk-react';
import { Box } from '@mui/material';

export default function SignUpPage() {
  return (
    <Box className="flex justify-center items-center min-h-screen bg-gray-100">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </Box>
  );
}
