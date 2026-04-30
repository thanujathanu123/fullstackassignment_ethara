import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Dashboard from './pages/Dashboard.jsx';
import InviteAccept from './pages/InviteAccept.jsx';
import Login from './pages/Login.jsx';
import Projects from './pages/Projects.jsx';
import Signup from './pages/Signup.jsx';
import TaskBoard from './pages/TaskBoard.jsx';

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/invites/:token" element={<InviteAccept />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectId/tasks" element={<TaskBoard />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default App;
