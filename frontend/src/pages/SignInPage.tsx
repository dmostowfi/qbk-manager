import { SignIn } from '@clerk/clerk-react';
import { Box } from '@mui/material';

export default function SignInPage() {
  return (
    <Box className="flex justify-center items-center min-h-screen bg-gray-100">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </Box>
  );
}
