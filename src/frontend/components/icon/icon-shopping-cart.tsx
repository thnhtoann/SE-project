import { FC } from 'react';

interface IconShoppingCartProps {
    className?: string;
    fill?: boolean;
}

const IconShoppingCart: FC<IconShoppingCartProps> = ({ className, fill = false }) => {
    return (
        <>
            {fill ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        opacity="0.5"
                        d="M2 3.75C2 3.33579 2.33579 3 2.75 3H3.13760C4.45140 3 5.05470 3.30500 5.42200 3.86000C5.71800 4.30800 5.86300 4.88800 5.94900 5.50000H20.1067C21.2967 5.50000 22.1183 6.68000 21.7133 7.79800L19.6363 13.522C19.3313 14.363 18.5333 14.923 17.6393 14.923H8.34600C6.83100 14.923 5.55700 13.792 5.37500 12.288L4.44700 4.60800C4.36700 3.94800 3.80600 3 3.13760 3H2.75C2.33579 3 2 3.16421 2 3.75Z"
                        fill="currentColor"
                    />
                    <circle cx="8.5" cy="19" r="1.8" fill="currentColor" />
                    <circle cx="17.5" cy="19" r="1.8" fill="currentColor" />
                </svg>
            ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        d="M2 3L2.26491 3.0883C3.58495 3.52832 4.24497 3.74832 4.62248 4.2721C5 4.79587 5 5.49159 5 6.88304V9.5C5 12.3284 5 13.7426 5.87868 14.6213C6.75736 15.5 8.17157 15.5 11 15.5H19"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    <path opacity="0.5" d="M7.5 18C8.32843 18 9 18.6716 9 19.5C9 20.3284 8.32843 21 7.5 21C6.67157 21 6 20.3284 6 19.5C6 18.6716 6.67157 18 7.5 18Z" stroke="currentColor" strokeWidth="1.5" />
                    <path
                        opacity="0.5"
                        d="M16.5 18.0001C17.3284 18.0001 18 18.6716 18 19.5001C18 20.3285 17.3284 21.0001 16.5 21.0001C15.6716 21.0001 15 20.3285 15 19.5001C15 18.6716 15.6716 18.0001 16.5 18.0001Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path opacity="0.5" d="M11 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path
                        d="M5 6H16.4504C18.5054 6 19.5328 6 19.9775 6.67426C20.4221 7.34853 20.0173 8.29294 19.2078 10.1818L18.7792 11.1818C18.4013 12.0636 18.2123 12.5045 17.8366 12.7523C17.4609 13 16.9812 13 16.0218 13H5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                </svg>
            )}
        </>
    );
};

export default IconShoppingCart;
