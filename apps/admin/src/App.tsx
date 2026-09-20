import { Navigate, Route, Routes } from 'react-router-dom';
import { getToken } from './api';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Login';
import { OverviewPage } from './pages/Overview';
import { TeamsPage } from './pages/Teams';
import { CheckpointsPage } from './pages/Checkpoints';
import { UsersPage } from './pages/Users';

function RequireAuth({ children }: { children: JSX.Element }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={<RequireAuth>{<Layout />}</RequireAuth>}
      >
        <Route path="/" element={<OverviewPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/checkpoints" element={<CheckpointsPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
