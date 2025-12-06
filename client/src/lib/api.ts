import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User, Submission, Exchange, Notification } from "@shared/schema";

const DEFAULT_API_BASE = "/api";

// Runtime config helpers
declare global {
  interface Window { __RUNTIME_CONFIG__?: { API_BASE?: string } }
}

let runtimeConfigLoaded = false;
async function loadRuntimeConfig(): Promise<void> {
  if (runtimeConfigLoaded) return;
  try {
    // Try window-injected first
    if (window.__RUNTIME_CONFIG__ && window.__RUNTIME_CONFIG__.API_BASE) {
      runtimeConfigLoaded = true;
      return;
    }
    const res = await fetch('/runtime-config.json', { cache: 'no-store' });
    if (!res.ok) {
      runtimeConfigLoaded = true; // mark loaded to avoid repeated failing fetches
      return;
    }
    const cfg = await res.json();
    window.__RUNTIME_CONFIG__ = cfg || {};
  } catch (err) {
    // ignore - we'll fallback to default
  } finally {
    runtimeConfigLoaded = true;
  }
}

async function getApiBase(): Promise<string> {
  if (!runtimeConfigLoaded) await loadRuntimeConfig();
  return (window.__RUNTIME_CONFIG__ && window.__RUNTIME_CONFIG__.API_BASE) || DEFAULT_API_BASE;
}

async function apiFetch(path: string, options?: RequestInit) {
  const base = await getApiBase();
  // ensure path starts with '/'
  const p = path.startsWith('/') ? path : `/${path}`;
  return fetch(`${base}${p}`, options);
}

export type SubmissionWithUser = Submission & { username: string };
export type UserBasic = { id: number; username: string; role: string };
export type UserFull = { 
  id: number; 
  username: string; 
  role: string; 
  isApproved: boolean; 
  isEnabled: boolean;
  createdAt: string;
};

// Safe JSON helpers used across the API functions to avoid
// `Unexpected end of JSON input` when the server returns empty or non-JSON bodies.
async function parseBody(response: Response) {
  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

async function handleResponse<T = any>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await parseBody(res);
    throw new Error(error?.error || res.statusText || "Request failed");
  }
  const data = await parseBody(res);
  if (data === null) throw new Error(res.statusText || "Empty response from server");
  return data as T;
}

// Auth API
export async function register(username: string, password: string) {
  const res = await apiFetch(`/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  });
  // Robustly handle empty/non-JSON responses from the server to avoid
  // `Unexpected end of JSON input` errors in the client.
  async function parseBody(response: Response) {
    try {
      const text = await response.text();
      if (!text) return null;
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  if (!res.ok) {
    const error = await parseBody(res);
    throw new Error(error?.error || res.statusText || "Registration failed");
  }

  const data = await parseBody(res);
  if (!data) throw new Error(res.statusText || "Empty response from server");
  return data;
}

export async function login(username: string, password: string) {
  const res = await apiFetch(`/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  });
  // Parse body safely to avoid JSON parse errors when server returns empty body
  async function parseBody(response: Response) {
    try {
      const text = await response.text();
      if (!text) return null;
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  if (!res.ok) {
    const error = await parseBody(res);
    throw new Error(error?.error || res.statusText || "Login failed");
  }

  const data = await parseBody(res);
  if (!data) throw new Error(res.statusText || "Empty response from server");
  return data;
}

export async function logout() {
  const res = await apiFetch(`/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  return handleResponse(res);
}

export async function getMe(): Promise<{ user: User }> {
  const res = await apiFetch(`/auth/me`, { credentials: "include" });
  return handleResponse(res);
}

// Submission API
export async function getSubmissions(): Promise<Submission[]> {
  const res = await apiFetch(`/submissions`, { credentials: "include" });
  return handleResponse(res);
}

export type PaginatedSubmissions = {
  data: SubmissionWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function getSubmissionsPaginated(
  page: number = 1, 
  limit: number = 50, 
  search: string = '', 
  status: string = 'all'
): Promise<PaginatedSubmissions> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
    status,
  });
  const res = await apiFetch(`/submissions?${params.toString()}`, { credentials: "include" });
  return handleResponse(res);
}

export async function getAllSubmissionsForExport(): Promise<SubmissionWithUser[]> {
  const res = await apiFetch(`/submissions/export`, { credentials: "include" });
  return handleResponse(res);
}

export async function createSubmission(data: { email: string; passwordHash: string; exchange: string }) {
  const res = await apiFetch(`/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  return handleResponse(res);
}

export async function updateSubmissionStatus(id: number, status: string) {
  const res = await apiFetch(`/submissions/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
    credentials: "include",
  });
  return handleResponse(res);
}

export async function updateSubmission(id: number, data: { email?: string; passwordHash?: string; exchange?: string }) {
  const res = await apiFetch(`/submissions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  return handleResponse(res);
}

export async function deleteSubmission(id: number) {
  const res = await apiFetch(`/submissions/${id}`, { method: "DELETE", credentials: "include" });
  return handleResponse(res);
}

export async function deleteNonPendingSubmissions() {
  const res = await apiFetch(`/submissions/delete-non-pending`, { method: "POST", credentials: "include" });
  return handleResponse(res);
}

// Exchange API
export async function getExchanges(): Promise<Exchange[]> {
  const res = await apiFetch(`/exchanges`, { credentials: "include" });
  return handleResponse(res);
}

export async function createExchange(data: { name: string; priceUsdt: string }) {
  const res = await apiFetch(`/exchanges`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: data.name, priceUsdt: data.priceUsdt, isActive: true }),
    credentials: "include",
  });
  return handleResponse(res);
}

export async function updateExchangePrice(id: number, priceUsdt: string) {
  const res = await apiFetch(`/exchanges/${id}/price`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceUsdt }),
    credentials: "include",
  });
  return handleResponse(res);
}

export async function toggleExchange(id: number) {
  const res = await apiFetch(`/exchanges/${id}/toggle`, { method: "PATCH", credentials: "include" });
  return handleResponse(res);
}

// Notification API
export async function getNotifications(): Promise<Notification[]> {
  const res = await apiFetch(`/notifications`, { credentials: "include" });
  return handleResponse(res);
}

export async function markNotificationsRead() {
  const res = await apiFetch(`/notifications/mark-read`, { method: "POST", credentials: "include" });
  return handleResponse(res);
}

// Users API (Admin only)
export async function getUsers(): Promise<UserFull[]> {
  const res = await apiFetch(`/users`, { credentials: "include" });
  return handleResponse(res);
}

export async function approveUser(id: number) {
  const res = await apiFetch(`/users/${id}/approve`, { method: "PATCH", credentials: "include" });
  return handleResponse(res);
}

export async function toggleUserEnabled(id: number) {
  const res = await apiFetch(`/users/${id}/toggle-enabled`, { method: "PATCH", credentials: "include" });
  return handleResponse(res);
}

export async function resetUserPassword(id: number, newPassword: string) {
  const res = await apiFetch(`/users/${id}/reset-password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
    credentials: "include",
  });
  return handleResponse(res);
}

export async function deleteUser(id: number) {
  const res = await apiFetch(`/users/${id}`, { method: "DELETE", credentials: "include" });
  return handleResponse(res);
}

// React Query Hooks
export function useAuth() {
  return useQuery({
    queryKey: ["auth"],
    queryFn: getMe,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSubmissions() {
  return useQuery({
    queryKey: ["submissions"],
    queryFn: getSubmissions,
  });
}

export function useSubmissionsPaginated(page: number, limit: number, search: string, status: string) {
  return useQuery({
    queryKey: ["submissions", "paginated", page, limit, search, status],
    queryFn: () => getSubmissionsPaginated(page, limit, search, status),
    placeholderData: (previousData) => previousData,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });
}

export function useApproveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => approveUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useToggleUserEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toggleUserEnabled(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) => 
      resetUserPassword(id, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}

export function useExchanges() {
  return useQuery({
    queryKey: ["exchanges"],
    queryFn: getExchanges,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubmission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}

export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      updateSubmissionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useUpdateSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { email?: string; passwordHash?: string; exchange?: string } }) => 
      updateSubmission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}

export function useDeleteSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSubmission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}

export function useDeleteAllCheckedAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteNonPendingSubmissions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}

export function useCreateExchange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; priceUsdt: string }) => createExchange(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchanges"] });
    },
  });
}

export function useToggleExchange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleExchange,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchanges"] });
    },
  });
}

export function useUpdateExchangePrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priceUsdt }: { id: number; priceUsdt: string }) => 
      updateExchangePrice(id, priceUsdt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchanges"] });
    },
  });
}

// Portal Status API
export async function getPortalStatus(): Promise<{ isOpen: boolean }> {
  const res = await apiFetch(`/settings/portal-status`, {
    credentials: "include",
  });
  return handleResponse(res);
}

export async function setPortalStatus(isOpen: boolean): Promise<{ isOpen: boolean }> {
  const res = await apiFetch(`/settings/portal-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isOpen }),
    credentials: "include",
  });
  return handleResponse(res);
}

export async function getUserStats() {
  const res = await apiFetch(`/auth/stats`, {
    credentials: "include",
  });
  return handleResponse(res);
}

export function useUserStats() {
  return useQuery({
    queryKey: ["userStats"],
    queryFn: getUserStats,
    refetchInterval: 5000,
  });
}

export function usePortalStatus() {
  return useQuery({
    queryKey: ["portalStatus"],
    queryFn: getPortalStatus,
    refetchInterval: 10000,
  });
}

export function useTogglePortalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isOpen: boolean) => setPortalStatus(isOpen),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portalStatus"] });
    },
  });
}
