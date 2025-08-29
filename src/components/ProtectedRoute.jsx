import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * A route wrapper that blocks access to its children when the user is not
 * authenticated.  Unauthenticated visitors are redirected to the login
 * screen.  Components nested under ProtectedRoute must be descendants of
 * AuthProvider.
 *
 * Usage:
 * <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
 *   <Route index element={<Home />} />
 * </Route>
 */
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

export default ProtectedRoute;
