import { FC } from 'react';

interface IconCreditCardProps {
    className?: string;
    fill?: boolean;
}

const IconCreditCard: FC<IconCreditCardProps> = ({ className, fill = false }) => {
    return (
        <>
            {fill ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        opacity="0.5"
                        d="M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12C22 15.7712 22 17.6569 20.8284 18.8284C19.6569 20 17.7712 20 14 20H10C6.22876 20 4.34315 20 3.17157 18.8284C2 17.6569 2 15.7712 2 12Z"
                        fill="currentColor"
                    />
                    <path d="M2 9C2 8.44772 2.44772 8 3 8H21C21.5523 8 22 8.44772 22 9V10.5C22 11.0523 21.5523 11.5 21 11.5H3C2.44772 11.5 2 11.0523 2 10.5V9Z" fill="currentColor" />
                    <path d="M6 15H10C10.5523 15 11 15.4477 11 16C11 16.5523 10.5523 17 10 17H6C5.44772 17 5 16.5523 5 16C5 15.4477 5.44772 15 6 15Z" fill="currentColor" />
                </svg>
            ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        d="M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12C22 15.7712 22 17.6569 20.8284 18.8284C19.6569 20 17.7712 20 14 20H10C6.22876 20 4.34315 20 3.17157 18.8284C2 17.6569 2 15.7712 2 12Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path opacity="0.5" d="M10 16H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path opacity="0.5" d="M14 16H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path opacity="0.5" d="M2 10L22 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            )}
        </>
    );
};

export default IconCreditCard;
