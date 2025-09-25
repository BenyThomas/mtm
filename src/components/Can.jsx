import React from 'react';
import { useAuth } from '../context/AuthContext';

/** Usage:
 * <Can code="READ_CLIENT">{...}</Can>
 * <Can any={['CREATE_CLIENT','UPDATE_CLIENT']}>{...}</Can>
 * <Can all={['READ_ROLE','UPDATE_ROLE']}>{...}</Can>
 */
const Can = ({ code, any, all, children, fallback = null }) => {
    const { can, canAny, canAll } = useAuth();
    let ok = true;
    if (code) ok = can(code);
    if (any) ok = canAny(any);
    if (all) ok = canAll(all);
    return ok ? <>{children}</> : <>{fallback}</>;
};

export default Can;
