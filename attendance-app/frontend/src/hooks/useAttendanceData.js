import useSWR from 'swr';
import { api, statsApi } from '../services/api';

// Fetcher function wrapper for Axios
const fetcher = url => api.get(url).then(res => res.data);

// Dashboard Hooks
export const useDashboardStats = (threshold = 75) => {
  // We use stable key, but threshold can vary.
  // Optimization: Fetch with a FIXED query (e.g., 75) to cache hits properly,
  // and handle threshold math on client side (as we already implemented).
  // SWR key: '/stats/dashboard?threshold=75'

  const { data, error, isLoading, mutate } = useSWR(
    `/stats/dashboard?threshold=75`,
    () => statsApi.dashboard({ threshold: 75 }).then(res => res.data),
    {
       revalidateOnFocus: true, // Auto Refresh when specific tab active
       dedupingInterval: 60000, // Cache for 1 minute (prevents excessive calls)
    }
  );

  return {
    data,
    loading: isLoading,
    error,
    mutate // For manual reload
  };
};

// Subjects Hook
export const useSubjects = () => {
  const { data, error, isLoading, mutate } = useSWR('/subjects', fetcher, {
    revalidateOnFocus: false, // Don't refresh subjects list often
    dedupingInterval: 300000, // 5 minutes cache
  });

  return {
    subjects: data,
    loading: isLoading,
    error,
    mutate
  };
};

// Timetable Hook
export const useTimetable = () => {
    // Only fetch for current user (handled by auth header)
    const { data, error, isLoading, mutate } = useSWR('/timetable', fetcher, {
      revalidateOnFocus: false,
      dedupingInterval: 300000 // 5 minutes (timetable changes rarely)
    });

    return {
      slots: data,
      loading: isLoading,
      error,
      mutate
    };
};

// Occurrence Hook (Attendance by Date)
export const useAttendanceByDate = (date) => {
    // Only fetch if date is valid
    const key = date ? `/attendance?date=${date}` : null;

    const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
        revalidateOnFocus: true,
        // Short cache as user might be marking attendance
        dedupingInterval: 2000
    });

    return {
        occurrences: data,
        loading: isLoading,
        error,
        mutate
    };
};

// User Profile Hook
export const useUserProfile = () => {
    const { data, error, isLoading } = useSWR('/user/profile', fetcher, {
        revalidateOnFocus: false
    });
    return {
        user: data,
        loading: isLoading,
        error
    };
};

// Holidays Hook
export const useHolidays = () => {
    const { data, error, isLoading, mutate } = useSWR('/holidays', fetcher, {
        revalidateOnFocus: false
    });
    return {
        holidays: data,
        loading: isLoading,
        error,
        mutate
    };
};
