import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiFetch, ApiError } from '@/lib/api-client';
import { clearTokens, getAccessToken, getRefreshToken, getSessionRole, getSessionUsername, setTokens } from '@/lib/auth-tokens';

// `step` tracks which form to show; `status` tracks loading/error independently
// so a verifyOtp request in flight (status='loading') doesn't fall out of the
// OTP step back to the credentials form.
export type SessionStep = 'credentials' | 'otp';
export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'error';

interface SessionState {
    step: SessionStep;
    status: SessionStatus;
    username: string | null;
    role: string | null;
    isAuthenticated: boolean;
    error: string | null;
}

const initialState: SessionState = {
    step: 'credentials',
    status: 'idle',
    username: null,
    role: null,
    isAuthenticated: false,
    error: null,
};

const errorMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
        const body = err.body as { error?: string; detail?: string } | null;
        return body?.error ?? body?.detail ?? err.message;
    }
    return err instanceof Error ? err.message : 'Unknown error';
};

export const requestOtp = createAsyncThunk('session/requestOtp', async (payload: { username: string; password: string; email: string }, { rejectWithValue }) => {
    try {
        return await apiFetch<{ message: string; username: string }>('/login/request-otp/', {
            method: 'POST',
            body: payload,
        });
    } catch (err) {
        return rejectWithValue(errorMessage(err));
    }
});

export const verifyOtp = createAsyncThunk('session/verifyOtp', async (payload: { username: string; otp: string }, { rejectWithValue }) => {
    try {
        const data = await apiFetch<{ access: string; refresh: string; role: string }>('/login/verify-otp/', {
            method: 'POST',
            body: payload,
        });
        setTokens({ access: data.access, refresh: data.refresh, role: data.role, username: payload.username });
        return { username: payload.username, role: data.role };
    } catch (err) {
        return rejectWithValue(errorMessage(err));
    }
});

export const logout = createAsyncThunk('session/logout', async () => {
    const refresh = getRefreshToken();
    if (refresh) {
        try {
            await apiFetch('/logout/', { method: 'POST', body: { refresh } });
        } catch {
            // Best-effort: clearing client-side state is what actually matters for the UI.
        }
    }
    clearTokens();
});

const sessionSlice = createSlice({
    name: 'session',
    initialState,
    reducers: {
        // Rehydrate from cookies on app mount — there's no /api/me/ to re-derive
        // role from just the JWT, so username/role were cached at login time.
        hydrate(state) {
            const access = getAccessToken();
            const username = getSessionUsername();
            const role = getSessionRole();
            if (access && username && role) {
                state.step = 'credentials';
                state.status = 'authenticated';
                state.isAuthenticated = true;
                state.username = username;
                state.role = role;
            } else {
                state.step = 'credentials';
                state.status = 'idle';
                state.isAuthenticated = false;
                state.username = null;
                state.role = null;
            }
        },
        resetToCredentials(state) {
            state.step = 'credentials';
            state.status = 'idle';
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(requestOtp.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(requestOtp.fulfilled, (state) => {
                state.step = 'otp';
                state.status = 'idle';
                state.error = null;
            })
            .addCase(requestOtp.rejected, (state, action: PayloadAction<unknown>) => {
                state.status = 'error';
                state.error = (action.payload as string) ?? 'Login failed';
            })
            .addCase(verifyOtp.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(verifyOtp.fulfilled, (state, action) => {
                state.status = 'authenticated';
                state.isAuthenticated = true;
                state.username = action.payload.username;
                state.role = action.payload.role;
                state.error = null;
            })
            .addCase(verifyOtp.rejected, (state, action: PayloadAction<unknown>) => {
                state.status = 'error';
                state.error = (action.payload as string) ?? 'OTP verification failed';
            })
            .addCase(logout.fulfilled, (state) => {
                state.step = 'credentials';
                state.status = 'idle';
                state.isAuthenticated = false;
                state.username = null;
                state.role = null;
                state.error = null;
            });
    },
});

export const { hydrate, resetToCredentials } = sessionSlice.actions;
export default sessionSlice.reducer;
