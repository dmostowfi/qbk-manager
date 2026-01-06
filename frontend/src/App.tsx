import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import Layout from './components/Layout';
import EventsPage from './pages/EventsPage';
import PlayersPage from './pages/PlayersPage';
import MyProfilePage from './pages/MyProfilePage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route
          path="/*"
          element={
            <>
              <SignedIn>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/events" replace />} />
                    <Route path="/events" element={<EventsPage />} />
                    <Route path="/players" element={<PlayersPage />} />
                    <Route path="/profile" element={<MyProfilePage />} />
                  </Routes>
                </Layout>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
