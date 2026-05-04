import { useEffect } from 'react';
import { useData } from '../contexts/DataContext';

/**
 * Hook to manage listings polling lifecycle
 * Automatically starts polling when component mounts
 * and stops when component unmounts
 */
export const useListingsPolling = () => {
  const { startListingsPolling, stopListingsPolling } = useData();

  useEffect(() => {
    // Start polling when component mounts
    startListingsPolling();

    // Stop polling when component unmounts
    return () => {
      stopListingsPolling();
    };
  }, [startListingsPolling, stopListingsPolling]);
};