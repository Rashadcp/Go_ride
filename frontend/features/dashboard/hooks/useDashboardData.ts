import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export const useDashboardData = () => {
  const queryClient = useQueryClient();

  // Queries
  const { data: activeRide, isLoading: loadingActiveRide } = useQuery({
    queryKey: ['activeRide'],
    queryFn: async () => {
      const { data } = await api.get('/rides/active');
      return data;
    },
    // Only run if token exists
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('accessToken'),
    // Don't retry since it throws 404 naturally when no active ride
    retry: false, 
  });

  const { data: ridesHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['ridesHistory'],
    queryFn: async () => {
      const { data } = await api.get('/rides/history');
      return data;
    },
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('accessToken'),
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data } = await api.get('/auth/transactions');
      return data;
    },
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('accessToken'),
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const { data } = await api.get('/auth/stats');
      return data;
    },
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('accessToken'),
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { name: string; phone?: string }) => {
      await api.put('/auth/me', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });

  const updateProfilePhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profilePhoto', file);
      await api.put('/auth/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.put('/auth/change-password', payload);
    },
  });

  const topUpMutation = useMutation({
    mutationFn: async ({ currentBalance, amount }: { currentBalance: number; amount: number }) => {
      await api.put('/auth/me', { walletBalance: currentBalance + amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const updateAddressesMutation = useMutation({
    mutationFn: async (addresses: any[]) => {
      await api.put('/auth/me', { addresses });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });

  return {
    activeRide,
    loadingActiveRide,
    ridesHistory,
    loadingHistory,
    transactions,
    loadingTransactions,
    stats,
    loadingStats,
    
    // mutations
    updateProfileMutation,
    updateProfilePhotoMutation,
    changePasswordMutation,
    topUpMutation,
    updateAddressesMutation,
  };
};
