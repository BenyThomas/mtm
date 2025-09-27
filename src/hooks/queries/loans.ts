import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, endpoints } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import { Loan } from "@/types";

// Query hooks for loans
export const useLoans = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.loansList(filters),
    queryFn: () => apiClient.get<Loan[]>(endpoints.loans),
    enabled: true,
    initialData: [],
  });
};

export const useLoan = (id: number) => {
  return useQuery({
    queryKey: queryKeys.loan(id),
    queryFn: () => apiClient.get<Loan>(endpoints.loan(id)),
    enabled: !!id,
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
    initialData: [],
  });
};

// Mutation hooks for loans
export const useCreateLoan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (loanData: Partial<Loan>) =>
      apiClient.post<Loan>(endpoints.loans, loanData),
    onSuccess: () => {
      // Invalidate and refetch loans list
      queryClient.invalidateQueries({ queryKey: queryKeys.loans });
    },
  });
};

export const useUpdateLoan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Loan> }) =>
      apiClient.put<Loan>(endpoints.loan(id), data),
    onSuccess: (data, variables) => {
      // Update the specific loan in cache
      queryClient.setQueryData(queryKeys.loan(variables.id), data);
      // Invalidate loans list
      queryClient.invalidateQueries({ queryKey: queryKeys.loans });
    },
  });
};

export const useDeleteLoan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete(endpoints.loan(id)),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.loan(id) });
      // Invalidate loans list
      queryClient.invalidateQueries({ queryKey: queryKeys.loans });
    },
  });
};
