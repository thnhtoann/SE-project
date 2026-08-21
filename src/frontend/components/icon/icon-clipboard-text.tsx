import { FC } from 'react';

interface IconClipboardTextProps {
    className?: string;
    fill?: boolean;
}

const IconClipboardText: FC<IconClipboardTextProps> = ({ className, fill = false }) => {
    return (
        <>
            {fill ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        opacity="0.5"
                        d="M16 4.00195C18.175 4.01406 19.3529 4.11051 20.1213 4.87889C21 5.75757 21 7.17179 21 10.0002V16.0002C21 18.8286 21 20.2429 20.1213 21.1215C19.2426 22.0002 17.8284 22.0002 15 22.0002H9C6.17157 22.0002 4.75736 22.0002 3.87868 21.1215C3 20.2429 3 18.8286 3 16.0002V10.0002C3 7.17179 3 5.75757 3.87868 4.87889C4.64706 4.11051 5.82497 4.01406 8 4.00195H16Z"
                        fill="currentColor"
                    />
                    <path d="M8 14H16C16.5523 14 17 14.4477 17 15C17 15.5523 16.5523 16 16 16H8C7.44772 16 7 15.5523 7 15C7 14.4477 7.44772 14 8 14Z" fill="currentColor" />
                    <path d="M7 10.5H17C17.5523 10.5 18 10.9477 18 11.5C18 12.0523 17.5523 12.5 17 12.5H7C6.44772 12.5 6 12.0523 6 11.5C6 10.9477 6.44772 10.5 7 10.5Z" fill="currentColor" />
                    <path d="M9 17.5H15C15.5523 17.5 16 17.9477 16 18.5C16 19.0523 15.5523 19.5 15 19.5H9C8.44772 19.5 8 19.0523 8 18.5C8 17.9477 8.44772 17.5 9 17.5Z" fill="currentColor" />
                    <path d="M8 3.5C8 2.67157 8.67157 2 9.5 2H14.5C15.3284 2 16 2.67157 16 3.5V4.5C16 5.32843 15.3284 6 14.5 6H9.5C8.67157 6 8 5.32843 8 4.5V3.5Z" fill="currentColor" />
                </svg>
            ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        opacity="0.5"
                        d="M16 4.00195C18.175 4.01406 19.3529 4.11051 20.1213 4.87889C21 5.75757 21 7.17179 21 10.0002V16.0002C21 18.8286 21 20.2429 20.1213 21.1215C19.2426 22.0002 17.8284 22.0002 15 22.0002H9C6.17157 22.0002 4.75736 22.0002 3.87868 21.1215C3 20.2429 3 18.8286 3 16.0002V10.0002C3 7.17179 3 5.75757 3.87868 4.87889C4.64706 4.11051 5.82497 4.01406 8 4.00195"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path d="M8 14H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M7 10.5H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M9 17.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M8 3.5C8 2.67157 8.67157 2 9.5 2H14.5C15.3284 2 16 2.67157 16 3.5V4.5C16 5.32843 15.3284 6 14.5 6H9.5C8.67157 6 8 5.32843 8 4.5V3.5Z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            )}
        </>
    );
};

export default IconClipboardText;
