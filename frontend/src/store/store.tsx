import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './slices/chatSlice';
import sidebarReducer from './slices/sidebarSlice';
import userReducer from './slices/userSlice'
export const store = configureStore({
  reducer: {
    chat: chatReducer,
    sidebar: sidebarReducer,
    user:userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;