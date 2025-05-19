import {
    getCookies,
    handleStoreCookie,
    removeAllCookies,
} from "../../helpers/storage";

// const BASE_URL = 'https://dev.one.onepercentclub.io';
const BASE_URL = "http://localhost:8000";

export const refreshAccessToken = async (): Promise<string> => {
    const refreshToken = getCookies("refreshToken") || "";
    if (!refreshToken) throw new Error("No refresh token available");

    try {
        const response = await fetch(`${BASE_URL}/auth/token/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
        });
        const data = await response.json();
        if (response.ok) {
            const { access_token, refresh_token } = data?.data || {};
            handleStoreCookie(access_token, refresh_token);
            return access_token;
        } else {
            throw new Error(data?.message || "Failed to refresh token");
        }
    } catch (error) {
        console.error("Error refreshing access token:", error);
        removeAllCookies();
        window.location.reload();
        throw error;
    }
};

export const isTokenExpired = (): boolean => {
    const tokenExpirationTime = getCookies("tokenExpirationTime");
    if (!tokenExpirationTime) return true;
    return new Date().getTime() > Number(tokenExpirationTime);
};

// Simple interface for the chat response
export interface ChatResponse {
    success: boolean;
    data: {
        message: string;
        suggestions?: {
            name: string;
            description: string;
            price: number;
            dietary_info: string[];
            image_url: string;
        }[];
        follow_up?: string;
    };
    error: {
        message: string | null;
    };
}

// Single API function to handle all chat operations
export const sendMessageToAPI = async (
    question: string,
    conversationId?: string
): Promise<ChatResponse> => {
    try {
        let accessToken = getCookies("accessToken");

        if (isTokenExpired()) {
            accessToken = await refreshAccessToken();
        }

        const response = await fetch(`${BASE_URL}/p/bpx/chat`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: accessToken ? `Bearer ${accessToken}` : "",
            },
            body: JSON.stringify({ question, conversationId }),
        });

        const data = await response.json();

        // Return the complete response as is
        return data as ChatResponse;
    } catch (error) {
        console.error("Error sending message to API:", error);
        // Return a formatted error response matching the expected structure
        return {
            success: false,
            data: {
                message: "Sorry, something went wrong. Please try again later.",
            },
            error: {
                message:
                    error instanceof Error ? error.message : "Unknown error",
            },
        };
    }
};

export const addMessageToConversation = async (
    chatId: string,
    message: any,
    role: "user" | "ai"
) => {
    let accessToken = getCookies("accessToken");

    if (isTokenExpired()) {
        accessToken = await refreshAccessToken();
    }
    const response = await fetch(
        `${BASE_URL}/p/bpx/conversations/add/message`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: accessToken ? `Bearer ${accessToken}` : "",
            },
            body: JSON.stringify({
                conversation_id: chatId,
                content: {
                    message: message.text,
                },
                role,
                feedback: {
                    upvote: false,
                    downvote: false,
                    text: "",
                },
            }),
        }
    );
    if (!response.ok) {
        throw new Error("Failed to add message");
    }
    return response.json();
};

// Get Messages from Conversation API
export const getMessagesFromConversation = async (conversationId: string) => {
    let accessToken = getCookies("accessToken");

    if (isTokenExpired()) {
        accessToken = await refreshAccessToken();
    }
    const response = await fetch(
        `${BASE_URL}/p/bpx/conversations/${conversationId}/messages`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: accessToken ? `Bearer ${accessToken}` : "",
            },
        }
    );
    if (!response.ok) {
        throw new Error("Failed to fetch messages");
    }
    return response.json();
};

export const createConversation = async (userId: string, name: string) => {
    let accessToken = getCookies("accessToken");

    if (isTokenExpired()) {
        accessToken = await refreshAccessToken();
    }
    try {
        const response = await fetch(`${BASE_URL}/p/bpx/conversations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: accessToken ? `Bearer ${accessToken}` : "",
            },
            body: JSON.stringify({ user_id: userId, name }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error creating conversation:", error);
        throw error;
    }
};

export const getAllConversation = async (userId: string) => {
    let accessToken = getCookies("accessToken");

    if (isTokenExpired()) {
        accessToken = await refreshAccessToken();
    }
    const response = await fetch(
        `${BASE_URL}/p/bpx/conversations/user/${userId}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: accessToken ? `Bearer ${accessToken}` : "",
            },
        }
    );
    if (!response.ok) {
        throw new Error("Failed to fetch conversations");
    }
    return response.json();
};

export const deleteConversation = async (conversationId: string) => {
    let accessToken = getCookies("accessToken");

    if (isTokenExpired()) {
        accessToken = await refreshAccessToken();
    }
    const response = await fetch(
        `${BASE_URL}/p/bpx/conversations/${conversationId}`,
        {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: accessToken ? `Bearer ${accessToken}` : "",
            },
        }
    );
    if (!response.ok) {
        throw new Error("Failed to delete conversation");
    }
    return response.json();
};

export const criticAPI = async (
    conversationId: string,
    messageId: string,
    feedback: { upvote: boolean; downvote: boolean; text: string }
) => {
    let accessToken = getCookies("accessToken");

    if (isTokenExpired()) {
        accessToken = await refreshAccessToken();
    }

    try {
        const response = await fetch(
            `${BASE_URL}/p/bpx/conversations/${conversationId}/messages/${messageId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: accessToken ? `Bearer ${accessToken}` : "",
                },
                body: JSON.stringify({
                    feedback: feedback,
                }),
            }
        );

        if (!response.ok) {
            throw new Error("Failed to update the message");
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating message:", error);
        throw error;
    }
};
