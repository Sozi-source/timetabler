import axios from 'axios';
import api from '@/lib/api';
import type { AuthUser } from '@/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/';

export const login = async (username: string, password: string): Promise<{ token: string }> => {
  const res = await axios.post(
    `${BASE}auth/login/`,
    { username, password },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return res.data;
};

export const logout = () =>
  api.post('/auth/logout/').catch(() => {
    // Best-effort — always clear local state regardless
  });

export const getMe = (): Promise<AuthUser> =>
  api.get('/auth/me/').then((r) => r.data.data as AuthUser);