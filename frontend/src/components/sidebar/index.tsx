import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Widget } from '@typeform/embed-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { toggleSidebar } from '../../store/slices/sidebarSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { getCookies } from '../../helpers/storage';
import {getAllConversation, deleteConversation } from '../../api/chat';
import { NotePencil, NewspaperClick, UserCircleCheck } from '../../icons';

interface JwtPayload {
  _id: string;
}

const Sidebar: React.FC = () => {
  const [showTypeform, setShowTypeform] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const isOpen = useSelector((state: RootState) => state.sidebar.isOpen);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  let accessToken = getCookies('accessToken') as string;
  const [visibleCount, setVisibleCount] = useState(5);
  const [showAll, setShowAll] = useState(false);
  
  const handleShowMore = () => {
    setShowAll(true);
    setVisibleCount(conversations.length);
  };

  const handleShowLess = () => {
    setShowAll(false);
    setVisibleCount(5);
  };
  if (accessToken) {
    let decoded = jwtDecode(accessToken) as JwtPayload;
    var userId = decoded._id;
  }
  const fetchConversations = async () => {
    try {
      const response = await getAllConversation(userId);
      setConversations(response.data.conversations.reverse());
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };
  useEffect(() => {
    fetchConversations();
  }, []);

  const handleNewChatClick = async () => {
      navigate('/')   
  };
  const handleDelete = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      fetchConversations()
      if (location.pathname === `/chat/${conversationId}`) {
        navigate('/');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleFeedbackClick = () => {
    setShowTypeform(true);
  };

  const handleCloseModal = () => {
    setShowTypeform(false);
  };

  const onClose = () => {
    dispatch(toggleSidebar());
  };

  return (
    <div
      className={`max-h-[850px] font-sf-pro sticky md:top-[79px] top-[-79px] left-0 md:w-[330px] w-full md:py-[24px] md:pl-[24px] bg-gray-100 z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'hidden'
        } opacity-100 flex flex-col justify-between`}
    >
      <div className='flex flex-col bg-white md:rounded-[12px] md:min-h-[85vh] min-h-[91.2vh]'>
        <div className='h-[70%] flex-grow  py-[24px] pl-[16px] overflow-y-auto'>
          <div className='flex flex-col'>
            <div className='flex flex-row'>
              <div onClick={handleNewChatClick} className='flex items-center justify-between bg-botblue hover:bg-blue-50 px-[16px] text-darkbase4 py-[12px] rounded-[12px] text-[17px] mb-4 w-5/6 cursor-pointer'>
                <span>New Chat</span>
                <img
                  src='/assets/icon/add.svg'
                  alt='Add Icon'
                  className='h-[11px]'
                />
              </div>
              <button
                onClick={onClose}
                className='ml-3 -mt-3 rounded-full focus:outline-none'
              >
                <img
                  src='/assets/icon/collapseIcon.svg'
                  alt='collapse icon'
                  className='h-6'
                />
              </button>
            </div>

            <div className='flex flex-row px-2'>
              <img
                src='/assets/icon/Bookmarks.svg'
                alt='saved icon'
                className='h-6 flex mt-[14px]'
              />
              <div className='bg-white px-[8px] pr-[16px] py-[12px] rounded-[12px] text-[17px]'>
                Saved
              </div>
            </div>
            <div className='flex flex-row px-2'>
              <img
                src='/assets/icon/history.svg'
                alt='history icon'
                className='h-6 flex mt-[14px]'
              />
              <div className='bg-white px-[8px] pr-[16px] py-[12px] rounded-[12px] text-[17px]'>
                History
              </div>
            </div>

            <ul className='text-[15px] mt-3 overflow-y-auto max-h-[50vh] pr-6'>
              {Array.isArray(conversations) && conversations.length > 0 ? (
                <>
                  {conversations.slice(0, visibleCount).map((conversation) => (
                    <li key={conversation._id} className='p-1.5 mb-2 ml-3 hover:bg-botblue rounded-md flex flex-row relative group'>
                      <a href={`/chat/${conversation._id}`} className='text-gray-400 flex-1 text-start'>
                        {conversation.name}
                      </a>
                      <div onClick={() => { handleDelete(conversation._id) }} className='opacity-0 group-hover:opacity-100 transition-opacity'>
                        <img
                          src='/assets/icon/delete.svg'
                          alt='delete icon'
                          className='h-5 float-right'
                        />
                      </div>
                    </li>
                  ))}
                  <li className='p-1.5 mb-2 ml-3 text-gray-400 text-sm'>
                  
                    {showAll ? (
                      <button
                        onClick={handleShowLess}
                        className='flex flex-row z-10'
                      >
                        <img
                          src='/assets/icon/show-more.svg'
                          alt='show more icon'
                          className='h-4 mt-[2px] mr-1 rotate-180'
                        />
                        Show Less
                      </button>
                    ) : (
                      <button
                        onClick={handleShowMore}
                        className='flex flex-row'
                      >
                         <img
                          src='/assets/icon/show-more.svg'
                          alt='show more icon'
                          className='h-4 mr-1'
                        />
                        Show More
                      </button>
                    )}
                  </li>
                </>
              ) : (
                <li>No conversations available.</li>
              )}
            </ul>
          </div>
        </div>
        <div className='h-[25%] flex flex-col text-center bg-black md:rounded-b-[12px] z-10 mt-6'>
          {/* <img
            src='/assets/icon/SidebarIcon.svg'
            alt='Logo'
            className='md:h-[90px] h-[60px] md:-mt-12 -mt-8'
          /> */}
          <p className='text-white md:text-[22px] text-[12px] mb-6 mt-6'>
          <span className='bg-gradient-custom text-transparent bg-clip-text '>
              Serv
            </span> your way through
            
          </p>
          {/* <div className='flex flex-col text-white gap-[8px] md:text-[14px] text-[10px] p-1'>
            <div className='flex flex-row space-x-2 px-2'>
              <a
                href='https://www.thepersonalcfo.in/'
                target='_blank'
                rel='noopener noreferrer'
               className='flex flex-row gap-1 w-1/2 bg-darkbase2 px-[6px] py-[8px] rounded-[6px]'
              >
                <UserCircleCheck/>
                Personal CFO
              </a>
              <a
                href='https://news.onepercentclub.io/'
                target='_blank'
                rel='noopener noreferrer'
                className='flex flex-row gap-2 w-1/2 bg-darkbase2 px-[12px] py-[8px] rounded-[6px]'
              >
                <NewspaperClick/>
                News
              </a>
            </div>
            <div className='flex flex-row space-x-2 px-2 mb-2'>
              <button
                onClick={handleFeedbackClick}
                className='w-full bg-darkbase2 px-[12px] py-[4px] rounded-[6px] flex flex-row justify-center gap-1'
              >
                <NotePencil />
                Feedback
              </button>
            </div>
          </div> */}
        </div>
      </div>
      {showTypeform &&
        ReactDOM.createPortal(
          <div
            className='fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-60 z-[60] flex justify-center items-center'
            onClick={handleCloseModal}
          >
            <div className='w-full max-w-md p-6 bg-white rounded-md shadow-md'>
              <Widget
                id='FORM_ID'
                className='typeform-widget'
                style={{ width: '100%', height: '500px' }}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Sidebar;
