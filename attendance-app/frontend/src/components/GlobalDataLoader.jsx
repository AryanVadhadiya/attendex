import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRefreshData } from '../hooks/useAttendanceData';

const GlobalDataLoader = () => {
    const { user } = useAuth();
    const refreshData = useRefreshData();

    useEffect(() => {
        if (user) {
            // Immediately trigger a global refresh when user is authenticated
            // This preloads all core data (Timetable, Subjects, Holidays, Dashboard Stats)
            refreshData();
        }
    }, [user, refreshData]);

    return null; // This component renders nothing
};

export default GlobalDataLoader;
