import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import EventsPage from './pages/EventsPage';
import PlayersPage from './pages/PlayersPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/players" element={<PlayersPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
