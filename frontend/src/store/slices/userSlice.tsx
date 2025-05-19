import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCookies } from '../../helpers/storage';
import { isTokenExpired, refreshAccessToken } from '../../api/chat';
interface UserState {
    user: any;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: UserState = {
    user: null,
    status: 'idle',
    error: null,
};

export const fetchUserDetails = createAsyncThunk(
    'user/fetchUserDetails',
    async (userId: string, thunkAPI) => {
        try {
            let accessToken = getCookies('accessToken');

            if (isTokenExpired()) {
            accessToken = await refreshAccessToken();
            }
            const response = await fetch(`http://localhost:8000/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': accessToken ? `Bearer ${accessToken}` : '',
                },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            return data;
        } catch (error: any) {
            return thunkAPI.rejectWithValue(error.message);
        }
    }
);

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserDetails.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchUserDetails.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.user = action.payload;
            })
            .addCase(fetchUserDetails.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            });
    },
});

export default userSlice.reducer;
