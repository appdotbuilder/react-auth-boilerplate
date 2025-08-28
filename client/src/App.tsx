import React from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

// Protected App Content Component
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication status
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show dashboard if authenticated, otherwise show auth page
  return isAuthenticated ? <Dashboard /> : <AuthPage />;
};

// Main App Component
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="App">
          <AppContent />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;