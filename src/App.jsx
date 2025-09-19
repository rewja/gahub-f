import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Todos from './pages/Todos';
import Requests from './pages/Requests';
import Meetings from './pages/Meetings';
import UserAssets from './pages/UserAssets';

// Admin pages
import AdminUsers from './pages/admin/AdminUsers';
import AdminTodos from './pages/admin/AdminTodos';
import AdminRequests from './pages/admin/AdminRequests';
import AdminAssets from './pages/admin/AdminAssets';
import AdminMeetings from './pages/admin/AdminMeetings';
import AdminVisitors from './pages/admin/AdminVisitors';

// Procurement pages
import ProcurementRequests from './pages/procurement/ProcurementRequests';
import ProcurementAssets from './pages/procurement/ProcurementAssets';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Role-based route component
const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

// Main App component
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Navigate to="/dashboard" />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* User routes */}
            <Route path="/todos" element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['user']}>
                  <Layout>
                    <Todos />
                  </Layout>
                </RoleRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/requests" element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['user']}>
                  <Layout>
                    <Requests />
                  </Layout>
                </RoleRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/meetings" element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['user']}>
                  <Layout>
                    <Meetings />
                  </Layout>
                </RoleRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/assets" element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['user']}>
                  <Layout>
                    <UserAssets />
                  </Layout>
                </RoleRoute>
              </ProtectedRoute>
            } />
            
            {/* Admin routes */}
            <Route path="/admin/users" element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminUsers />
                  </Layout>
                </RoleRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/todos" element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminTodos />
                  </Layout>
                </RoleRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/requests" element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminRequests />
                  </Layout>
                </RoleRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/assets" element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminAssets />
                  </Layout>
                </RoleRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/meetings" element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminMeetings />
                  </Layout>
                </RoleRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/visitors" element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminVisitors />
                  </Layout>
                </RoleRoute>
              </ProtectedRoute>
            } />
            
            {/* Procurement routes */}
            <Route path="/procurement/requests" element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['procurement']}>
                  <Layout>
                    <ProcurementRequests />
                  </Layout>
                </RoleRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/procurement/assets" element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['procurement']}>
                  <Layout>
                    <ProcurementAssets />
                  </Layout>
                </RoleRoute>
              </ProtectedRoute>
            } />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
