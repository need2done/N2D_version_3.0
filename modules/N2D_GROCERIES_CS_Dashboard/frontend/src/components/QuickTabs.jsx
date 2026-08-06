import React from 'react';

const tabs = [
  'All',
  'Deals',
  'Best Sellers',
  'New Arrivals',
  'Top Offers',
  'Daily Essentials',
  'Snacks & Beverages',
  'Dairy & Eggs',
];

const QuickTabs = () => {
  return (
    <div className="bg-white border-b border-gray-100 py-3 shadow-sm z-40 relative">
      <div className="max-w-[1440px] mx-auto px-6 overflow-x-auto no-scrollbar">
        <ul className="flex items-center gap-2 md:gap-4 whitespace-nowrap">
          {tabs.map((tab, idx) => (
            <li key={idx}>
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  idx === 0 
                    ? 'bg-primary text-white shadow-md' 
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {tab}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default QuickTabs;
