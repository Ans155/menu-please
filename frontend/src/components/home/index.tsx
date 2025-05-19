import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { createConversation } from "../../api/chat";
import { Academy, Membership, Search, Filter} from "../../icons";

const initialMessages = [
  { text: "What are today's specials?" },
  { text: "What drinks do you have?" },
  { text: "What's the best option for the main course?" },
  { text: "Do you have any chef's recommendations?" },
];

const Home: React.FC = () => {
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.user);

  const handleCreateChat = async () => {
    try {
      const response = await createConversation(user?.data?._id, "New chat");
      return response.data._id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (question.trim()) {
      const chatId = await handleCreateChat();
      if (chatId) {
        navigate(`/chat/${chatId}`, { state: { initialMessage: question } });
      }
    }
  };

  const handleCardClick = async (question: string) => {
    const chatId = await handleCreateChat();
    if (chatId) {
      navigate(`/chat/${chatId}`, { state: { initialMessage: question } });
    }
  };

  const handleFocusButtonClick = () => {
    setIsFocusOpen((prev) => !prev);
  };

  const handleFocusSelect = (category: string) => {
    setSelectedFocus(category);
    setIsFocusOpen(false);
  };

  return (
    <div className="flex flex-col bg-gray-100 w-full h-[86vh] lg:px-[200px] py-[20px] px-[20px]">
      <div className="flex-grow">
        <div className="font-sf-pro lg:text-[34px] text-[17px] mb-4 font-bold">
          <div>
            Hey {user?.data?.first_name ? user?.data?.first_name : "there"},
          </div>
          <div className="text-gray-400">Got Questions?</div>
        </div>
        <div className="flex flex-row space-x-2 mb-4 overflow-x-auto">
          {initialMessages.map((message, index) => (
            <div
              key={index}
              onClick={() => handleCardClick(message.text)}
              className="font-sf-pro font-normal cursor-pointer mb-4 lg:text-[16px] text-[8px] w-1/4 border p-4 lg:h-[150px] bg-white rounded-[12px]"
            >
              {message.text}
            </div>
          ))}
        </div>
        <div className="font-sf-pro p-4 gap-4 bg-white rounded-[12px]">
          <textarea
            id="message"
            className="w-full rounded-[10px] lg:h-[111px] p-2 border border-gray-300 rounded-lg active:border-none hover:outline-none active:outline-none"
            placeholder="Ask me anything..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          ></textarea>
          <div>
            <div className="flex flex-row items-center w-full cursor-pointer">
              <div
                onClick={handleFocusButtonClick}
                className="flex items-center mr-auto"
              >
                {(!selectedFocus || selectedFocus==="Focus") && <Filter/>}
                {selectedFocus==="Membership" && <Membership fillColor="#007AFF"/>}
                {selectedFocus==="Academic" && <Academy fillColor="#007AFF"/>}
               
                <div className={`ml-1 text-[12px] lg:text-[17px] ${(selectedFocus && selectedFocus!=="Focus") && "text-[#007AFF]"}`}>
                  {selectedFocus || "Focus"}
                  
                </div>
              </div>
              <img
                src="/assets/icon/send.svg"
                alt="Send Icon"
                className="h-8 w-8 rotate-90 cursor-pointer"
                onClick={handleSubmit}
              />
            </div>
            {isFocusOpen && (
              <div
                className="flex flex-row p-4 text-[10px] mt-4"
                style={{ boxShadow: "4px 4px 20px 0px #0000000D" }}
              >
                <div
                  onClick={() => handleFocusSelect("Focus")}
                  className="h-[68px] bg-white px-[16px] py-[8px] gap-[6px] w-1/3 hover:text-[#007AFF] hover:bg-gray-100 rounded-[12px] cursor-pointer"
                >
                  <div className="lg:text-[14px] flex flex-row mb-[2px] gap-2">
                    <div className="mt-[1px]">
                    <Search /> 
                      </div>
                    All
                  </div>
                  <div className="lg:text-[10px] text-[8px]">
                    Search across the entire platform
                  </div>
                </div>
                <div
                  onClick={() => handleFocusSelect("Academic")}
                  className="h-[68px] bg-white px-[16px] py-[8px] gap-[6px] w-1/3 hover:text-[#007AFF] hover:bg-gray-100 rounded-[12px] cursor-pointer"
                >
                  <div className="lg:text-[14px] flex flex-row mb-[2px] gap-2">
                    <Academy />
                    Academic
                  </div>
                  <div className="lg:text-[10px] text-[8px]">
                    Ask questions related to the learning modules
                  </div>
                </div>
                <div
                  onClick={() => handleFocusSelect("Membership")}
                  className="h-[68px] bg-white px-[16px] py-[8px] gap-[6px] w-1/3 hover:text-[#007AFF] hover:bg-gray-100 rounded-[12px] cursor-pointer"
                >
                  <div className="lg:text-[14px] flex flex-row mb-[2px] gap-2">
                    <Membership />
                    Membership
                  </div>
                  <div className="lg:text-[10px] text-[8px]">
                    Ask questions related to the membership or the 1% Club app
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-gray-100 p-4 font-sf-pro">
        <div className="flex justify-center items-center py-2 text-center lg:text-sm text-[8px] text-gray-600">
          The answers provided by the bot are intended for informational and
          educational purposes only.
        </div>
        <div className="flex justify-center items-center py-2 text-center lg:text-sm text-[8px] text-[#999999]">
          Serve may make mistakes, so double-check its responses.
        </div>
      </div>
    </div>
  );
};

export default Home;
