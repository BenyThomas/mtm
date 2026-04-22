import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Skeleton from './Skeleton';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, checking, user } = useAuth();
    const location = useLocation();
    const isGatewayOnlyLoanOfficer = Boolean(user?.isGatewayOnlyLoanOfficer);
    const path = location.pathname || '/';
    const isGatewayPath = path === '/gateway' || path.startsWith('/gateway/');

    if (checking) {
        return (
            <div className="p-6">
                <Skeleton height="2rem" />
                <Skeleton height="12rem" className="mt-4" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (isGatewayOnlyLoanOfficer && !isGatewayPath) {
        return <Navigate to="/gateway" replace />;
    }

    return children;
};

export default ProtectedRoute;
