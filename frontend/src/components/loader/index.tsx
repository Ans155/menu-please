import React from 'react';

const Loader: React.FC = () => {
  return (
    <div role="status" className="max-w-sm animate-pulse overflow-hidden">
    <div className="h-2.5 bg-lightbase3 rounded-full dark:bg-gray-300 w-48 mb-4"></div>
    <div className="h-2 bg-lightbase3 rounded-full dark:bg-gray-300 max-w-[360px] mb-2.5"></div>
    <div className="h-2 bg-lightbase3 rounded-full dark:bg-gray-300 mb-2.5"></div>
    <div className="h-2 bg-lightbase3 rounded-full dark:bg-gray-300 max-w-[330px] mb-2.5"></div>
    <div className="h-2 bg-lightbase3 rounded-full dark:bg-gray-300 max-w-[300px] mb-2.5"></div>
    <div className="h-2 bg-lightbase3 rounded-full dark:bg-gray-300 max-w-[360px]"></div>
    <span className="sr-only">Loading...</span>
</div>
  );
};

export default Loader;
