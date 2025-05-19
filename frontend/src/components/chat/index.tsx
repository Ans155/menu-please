import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import Loader from "../loader";
import {
    sendMessageToAPI,
    getMessagesFromConversation,
    criticAPI,
} from "../../api/chat";
import "../chat/index.css";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

// Define interfaces for restaurant menu response
interface MenuItem {
    name: string;
    description: string;
    price: number;
    dietary_info: string[];
    image_url: string;
}

interface ChatData {
    message: string;
    suggestions?: MenuItem[];
    follow_up?: string;
}

interface Message {
    _id: string | number;
    role: "user" | "ai";
    content: {
        message: string;
        chatData?: ChatData;
    };
    feedback?: {
        upvote: boolean;
        downvote: boolean;
        text: string;
    };
}

// Move ImageWithFallback component outside of the Chat component for isolation
const ImageWithFallback = React.memo(
    ({ imageUrl, altText }: { imageUrl: string; altText: string }) => {
        const [imageError, setImageError] = useState(false);

        // Use useMemo for the image element to prevent constant recreation
        const imageElement = useMemo(() => {
            if (imageError) return null;

            return (
                <div className="h-48 overflow-hidden bg-gray-50">
                    <img
                        src={imageUrl}
                        alt={altText}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={() => setImageError(true)}
                    />
                </div>
            );
        }, [imageUrl, altText, imageError]);

        // Separate effect for image preloading
        useEffect(() => {
            const img = new Image();
            img.src = imageUrl;
            const handleError = () => setImageError(true);
            img.addEventListener("error", handleError);

            return () => {
                img.removeEventListener("error", handleError);
            };
        }, [imageUrl]);

        return imageElement;
    },
    // Strict equality check
    (prevProps, nextProps) =>
        prevProps.imageUrl === nextProps.imageUrl &&
        prevProps.altText === nextProps.altText
);

// Create a memoized menu item component to reduce re-renders
const MenuItem = React.memo(({ item }: { item: MenuItem }) => {
    return (
        <div className="menu-item bg-white rounded-xl overflow-hidden shadow-md flex flex-col hover:shadow-lg transition-all duration-300 border border-gray-100 transform hover:-translate-y-1">
            {item.image_url && (
                <ImageWithFallback
                    imageUrl={item.image_url}
                    altText={item.name}
                />
            )}
            <div className="p-5">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                        {item.name}
                    </h3>
                    <span className="text-green-600 font-bold px-3 py-1 bg-green-50 rounded-lg">
                        ₹{item.price}
                    </span>
                </div>
                <p className="text-gray-600 mb-4 text-sm line-clamp-2">
                    {item.description}
                </p>
                <div className="flex flex-wrap gap-2">
                    {item.dietary_info.map((diet, i) => (
                        <span
                            key={i}
                            className={`text-xs px-2 py-1 rounded-full ${
                                diet.toLowerCase().includes("veg")
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                            }`}
                        >
                            {diet}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
});

const Chat: React.FC = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const location = useLocation();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [visibleCriticId, setVisibleCriticId] = useState<
        string | number | null
    >(null);
    const [feedbackText, setFeedbackText] = useState("");
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [initialMessage, setInitialMessage] = useState(
        location.state?.initialMessage || null
    );
    const initialMessageSentRef = useRef(false);

    const user = useSelector((state: RootState) => state.user.user);
    const profile_logo = user?.data?.profile_picture
        ? user?.data?.profile_picture
        : "/assets/logo/user.svg";
    const gpt_logo = "/assets/gpt.svg";
    const thumbsup_icon = "/assets/icon/thumbsup.png";
    const thumbsdown_icon = "/assets/icon/thumbsdown.png";
    const send_icon = "/assets/icon/send.svg";

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages]);

    // Handle initial message if provided
    useEffect(() => {
        if (initialMessage && !initialMessageSentRef.current && chatId) {
            handleSendMessage(initialMessage);
            initialMessageSentRef.current = true;
            window.history.replaceState({}, "");
        }
    }, [initialMessage, chatId]);

    // Load conversation messages when chatId changes
    useEffect(() => {
        if (chatId) {
            fetchMessages();
        }
        // Only re-run when chatId changes, not on every render
    }, [chatId]);

    // Memoize the fetchMessages function to prevent recreation on every render
    const fetchMessages = useRef(async () => {
        if (!chatId) return;

        try {
            setLoading(true);
            const fetchedMessages = await getMessagesFromConversation(chatId);
            if (Array.isArray(fetchedMessages.data?.messages)) {
                // Process messages to extract chat data when applicable
                const processedMessages = fetchedMessages.data.messages.map(
                    (message: any) => {
                        if (message.role === "ai") {
                            try {
                                // Try to parse message content
                                const content =
                                    typeof message.content === "string"
                                        ? JSON.parse(message.content)
                                        : message.content;

                                if (
                                    content &&
                                    (typeof content.message === "string" ||
                                        content.suggestions)
                                ) {
                                    return {
                                        ...message,
                                        content: {
                                            message: content.message || "",
                                            chatData: {
                                                message: content.message || "",
                                                suggestions:
                                                    content.suggestions || [],
                                                follow_up:
                                                    content.follow_up || "",
                                            },
                                        },
                                    };
                                }
                            } catch (e) {
                                // Not valid format, keep as is
                                console.error("Error parsing message:", e);
                            }
                        }
                        return message;
                    }
                );
                setMessages(processedMessages);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    }).current;

    // Handle input changes efficiently
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    // Send a message to the API and handle the response
    const handleSendMessage = async (question: string) => {
        if (!question.trim() || !chatId) return;

        setLoading(true);

        try {
            // Add user message to UI immediately for better UX
            const userMessageId = Date.now();
            const userMessage: Message = {
                role: "user",
                content: { message: question },
                _id: userMessageId,
            };

            setMessages((prevMessages) => [...prevMessages, userMessage]);

            // Send message to API
            const response = await sendMessageToAPI(question, chatId);

            if (response.success) {
                // Create AI response message
                const aiMessage: Message = {
                    role: "ai",
                    content: {
                        message: response.data.message,
                        chatData: {
                            message: response.data.message,
                            suggestions: response.data.suggestions,
                            follow_up: response.data.follow_up,
                        },
                    },
                    _id: Date.now() + 1,
                };

                setMessages((prevMessages) => [...prevMessages, aiMessage]);
            } else {
                // Handle error response
                const errorMessage: Message = {
                    role: "ai",
                    content: {
                        message:
                            response.error.message ||
                            "Sorry, something went wrong. Please try again.",
                    },
                    _id: Date.now() + 1,
                };

                setMessages((prevMessages) => [...prevMessages, errorMessage]);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            // Add error message
            const errorMessage: Message = {
                role: "ai",
                content: {
                    message:
                        "Sorry, an error occurred. Please try again later.",
                },
                _id: Date.now() + 1,
            };

            setMessages((prevMessages) => [...prevMessages, errorMessage]);
        } finally {
            setLoading(false);
            setInput(""); // Clear input field
        }
    };

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            handleSendMessage(input);
        }
    };

    // Toggle feedback form visibility
    const handleThumbsDownClick = (messageId: string | number) => {
        setVisibleCriticId(visibleCriticId === messageId ? null : messageId);
    };

    // Handle feedback submission
    const handleSubmitFeedback = async (messageId: string | number) => {
        if (!chatId || typeof messageId !== "string") return;

        try {
            await criticAPI(chatId, messageId, {
                upvote: false,
                downvote: true,
                text: feedbackText,
            });
            setVisibleCriticId(null);
            setFeedbackText("");
            fetchMessages(); // Refresh messages to reflect the feedback
        } catch (error) {
            console.error("Error submitting feedback:", error);
        }
    };

    // Handle upvote
    const handleUpvote = async (messageId: string | number) => {
        if (!chatId || typeof messageId !== "string") return;

        try {
            await criticAPI(chatId, messageId, {
                upvote: true,
                downvote: false,
                text: "",
            });
            fetchMessages(); // Refresh messages to reflect the feedback
        } catch (error) {
            console.error("Error submitting upvote:", error);
        }
    };

    // Memoize the ChatResponseDisplay component to prevent unnecessary re-renders
    const MemoizedChatResponseDisplay = React.memo(
        ({ chatData }: { chatData: ChatData }) => {
            if (!chatData) {
                return <p className="mb-4">No message available</p>;
            }

            const handleFollowUpClick = () => {
                if (chatData.follow_up) {
                    setInput(chatData.follow_up);
                }
            };

            return (
                <div className="chat-response">
                    {/* Message first */}
                    <p className="mb-6 font-medium text-gray-800">
                        {chatData.message}
                    </p>

                    {/* Suggestions in card format */}
                    {chatData.suggestions &&
                        chatData.suggestions.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                                {chatData.suggestions.map((item, index) => (
                                    <MenuItem key={index} item={item} />
                                ))}
                            </div>
                        )}

                    {/* Follow-up in bubble at bottom */}
                    {chatData.follow_up && (
                        <div className="mt-8 mx-auto max-w-md">
                            <div
                                className="bg-blue-50 border border-blue-100 rounded-2xl py-3 px-5 text-center shadow-sm cursor-pointer hover:bg-blue-100 transition-colors duration-200"
                                onClick={handleFollowUpClick}
                            >
                                <p className="text-blue-800 font-medium flex items-center justify-center gap-2">
                                    {chatData.follow_up}
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                                        />
                                    </svg>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            );
        }
    );

    return (
        <div className="flex flex-col bg-gray-100 w-full lg:px-[200px] md:py-[40px] md:px-[40px] px-[5px]">
            <div
                className="flex flex-col py-2 md:px-4 px-1 md:h-[66vh] h-[75vh] overflow-y-auto"
                ref={chatContainerRef}
            >
                {messages.map((message, index) => (
                    <div key={index}>
                        <div className="flex flex-row font-sf-pro font-medium">
                            {message.role === "user" && (
                                <>
                                    <img
                                        src={profile_logo}
                                        alt="User Logo"
                                        className="h-8 w-8 object-fit rounded-full"
                                    />
                                    <div className="mb-2">
                                        <div className="p-2 bg-gray-100">
                                            <span>
                                                {message.content.message}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {message.role === "ai" && (
                                <>
                                    <img
                                        src={gpt_logo}
                                        alt="GPT Logo"
                                        className="md:h-8 h-6 flex md:mt-5 mt-6"
                                    />
                                    <div className="font-sf-pro self-end bg-gray-100 p-4 text-[17px] w-full">
                                        {message.content.chatData ? (
                                            <MemoizedChatResponseDisplay
                                                chatData={
                                                    message.content.chatData
                                                }
                                            />
                                        ) : (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                rehypePlugins={[rehypeSanitize]}
                                                className="markdown-body text-[15px]"
                                            >
                                                {message.content.message}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {message.role === "ai" && (
                            <>
                                <div className="flex justify-end cursor-pointer gap-2">
                                    <img
                                        src={thumbsup_icon}
                                        alt="Thumb Up"
                                        className={`border px-[8px] py-[6px] rounded-[8px] h-9 hover:border-[#808080] ${
                                            message?.feedback?.upvote &&
                                            "border border-[#808080]"
                                        }`}
                                        onClick={() =>
                                            handleUpvote(message._id)
                                        }
                                    />
                                    <img
                                        src={thumbsdown_icon}
                                        alt="Thumb Down"
                                        className={`border px-[8px] py-[6px] rounded-[8px] h-9 hover:border-[#808080] ${
                                            message?.feedback?.downvote &&
                                            "border border-[#808080]"
                                        }`}
                                        onClick={() =>
                                            handleThumbsDownClick(message._id)
                                        }
                                    />
                                </div>
                                {visibleCriticId === message._id && (
                                    <div className="flex justify-end mt-3">
                                        <div className="w-[258px] h-[157.31px] p-3 gap-[9px] bg-white rounded-[12px]">
                                            <textarea
                                                className="w-[234px] h-[79px] px-[12px] py-[16px] border border-lightbase4 rounded-[12px]"
                                                placeholder="Submit your feedback about this response..."
                                                value={
                                                    feedbackText ||
                                                    message?.feedback?.text
                                                }
                                                onChange={(e) =>
                                                    setFeedbackText(
                                                        e.target.value
                                                    )
                                                }
                                            ></textarea>
                                            <button
                                                className="w-[234px] h-[45.31px] gap-[15.04px] border border-blue rounded-[12px]"
                                                onClick={() =>
                                                    handleSubmitFeedback(
                                                        message._id
                                                    )
                                                }
                                            >
                                                {message?.feedback?.downvote
                                                    ? "Update feedback"
                                                    : "Submit"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="relative">
                        <Loader />
                    </div>
                )}
            </div>

            <form
                className="sticky bottom-0 bg-gray-100 pt-4 pb-2 px-2 rounded-t-lg shadow-inner"
                onSubmit={handleSubmit}
            >
                <div className="flex flex-row items-center relative">
                    <input
                        type="text"
                        className="w-full pl-4 py-3 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent shadow-sm"
                        placeholder="Ask me anything..."
                        value={input}
                        onChange={handleInputChange}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 transition-colors duration-200"
                        disabled={loading || !input.trim()}
                    >
                        <img
                            src={send_icon}
                            alt="Send Icon"
                            className="h-5 w-5 rotate-90"
                        />
                    </button>
                </div>

                <div className="font-sf-pro flex justify-center items-center py-2 text-center md:text-[14px] text-[12px] text-gray-500">
                    Serv may make mistakes, so double-check its responses.
                </div>
            </form>
        </div>
    );
};

export default Chat;
