import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, endpoints } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import { Client, Loan } from "@/types";

// Query hooks for clients
export const useClients = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.clientsList(filters),
    queryFn: () => apiClient.get<Client[]>(endpoints.clients),
    enabled: true,
    initialData: [],
  });
};

export const useClient = (id: number) => {
  return useQuery({
    queryKey: queryKeys.client(id),
    queryFn: () => apiClient.get<Client>(endpoints.client(id)),
    enabled: !!id,
  });
};

// Mutation hooks for clients
export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientData: Partial<Client>) =>
      apiClient.post<Client>(endpoints.clients, clientData),
    onSuccess: () => {
      // Invalidate and refetch clients list
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Client> }) =>
      apiClient.put<Client>(endpoints.client(id), data),
    onSuccess: (data, variables) => {
      // Update the specific client in cache
      queryClient.setQueryData(queryKeys.client(variables.id), data);
      // Invalidate clients list
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete(endpoints.client(id)),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.client(id) });
      // Invalidate clients list
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
};

export const useOverdueLoans = () => {
  return useQuery({
    queryKey: [...queryKeys.loans, "overdue"],
    queryFn: async () => {
      try {
        // Try to fetch overdue loans specifically
        return await apiClient.get<Loan[]>(endpoints.loans, {
          params: { overdue: true },
        });
      } catch {
        // Fallback: get all loans and filter client-side
        const allLoans = await apiClient.get<Loan[]>(endpoints.loans);
        return allLoans.filter((loan) => {
          const overdue = loan.daysInArrears || loan.overdueDays || 0;
          return overdue > 0;
        });
      }
    },
    enabled: true,
  });
};
