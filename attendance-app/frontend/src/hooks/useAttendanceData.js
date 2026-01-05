import useSWR, { useSWRConfig } from 'swr';
import { api, statsApi } from '../services/api';

// Fetcher function wrapper for Axios
const fetcher = url => api.get(url).then(res => res.data);

// Dashboard Hooks
export const useDashboardStats = () => {
  // Fetch raw, threshold-agnostic stats once.
  // All threshold-based calculations (80/75/70 slider) are done on the client.

  const swrKey = `/attendance/dashboard`;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
   swrKey,
   () => statsApi.dashboard().then(res => res.data),
   {
     // Still avoid focus-based refetches, but allow
     // an initial fetch on mount so we don't depend
     // entirely on preload state.
     revalidateOnFocus: false,
     revalidateOnMount: true,
     dedupingInterval: 60000,
   }
  );

  // Only show "loading" before we have any data at all.
  const loading = !data && (isLoading || isValidating);

  return {
    data,
    loading,
    error,
    isValidating,
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
    const { data, error, isLoading, mutate } = useSWR('/user/profile', fetcher, {
        revalidateOnFocus: false
    });
    return {
        user: data,
        loading: isLoading,
        error,
        mutate
    };
};

// Holidays Hook
export const useHolidays = () => {
    const { data, error, isLoading, mutate } = useSWR('/holidays', fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 300000 // 5 minutes cache (static data)
    });
    return {
        holidays: data,
        loading: isLoading,
        error,
        mutate
    };
};
// Global Refresh Hook
export const useRefreshData = () => {
    const { mutate } = useSWRConfig();

    return async () => {
        const { default: dayjs } = await import('dayjs');
        const today = dayjs().format('YYYY-MM-DD');

        // Trigger revalidation for all core keys
        // We use mutate(key) to mark them as expired and trigger a refetch
        const keys = [
            '/timetable',
            '/subjects',
            '/holidays',
            '/user/profile',
            `/attendance?date=${today}`,
          '/attendance/dashboard'
        ];

        // Execute all refreshes in parallel
        await Promise.all(keys.map(key => mutate(key)));
    };
};
