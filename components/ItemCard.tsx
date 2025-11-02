import React from 'react';

interface ItemCardProps {
  onEdit: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

const CardButton: React.FC<{ onClick: () => void, children: React.ReactNode, className: string }> = ({ onClick, children, className }) => (
    <button onClick={onClick} className={`p-1.5 rounded-full transition-colors duration-200 ${className}`}>
        {children}
    </button>
);

export const ItemCard: React.FC<ItemCardProps> = ({ onEdit, onDelete, children }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 relative print-shadow-none print-break-inside-avoid">
        <div className="absolute top-2 left-2 flex space-x-1 no-print">
            <CardButton onClick={onEdit} className="text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                </svg>
            </CardButton>
            <CardButton onClick={onDelete} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </CardButton>
        </div>
      <div className="pr-4">{children}</div>
    </div>
  );
};
