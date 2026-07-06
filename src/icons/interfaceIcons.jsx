import React from 'react';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import FilterAltRounded from '@mui/icons-material/FilterAltRounded';
import HomeRounded from '@mui/icons-material/HomeRounded';
import PaidRounded from '@mui/icons-material/PaidRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';

export function FilterIcon({ size = 24, style, ...props }) {
  return <FilterAltRounded {...props} style={{ fontSize: size, ...style }} />;
}

export function CalendarIcon({ size = 24, style, ...props }) {
  return <CalendarMonthRounded {...props} style={{ fontSize: size, ...style }} />;
}

export function CurrencyIcon({ size = 24, style, ...props }) {
  return <PaidRounded {...props} style={{ fontSize: size, ...style }} />;
}

export function HomeIcon({ size = 24, style, ...props }) {
  return <HomeRounded {...props} style={{ fontSize: size, ...style }} />;
}

export function TradesIcon({ size = 24, style, ...props }) {
  return <SwapHorizRounded {...props} style={{ fontSize: size, ...style }} />;
}

export function AddColumnIcon({ size = 24, style, ...props }) {
  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <path
        d="M13.75 4.5C13.75 3.53 14.53 2.75 15.5 2.75H19.5C20.47 2.75 21.25 3.53 21.25 4.5V19.5C21.25 20.47 20.47 21.25 19.5 21.25H15.5C14.53 21.25 13.75 20.47 13.75 19.5V4.5Z"
        fill="currentColor"
      />
      <path d="M6.25 12.75C6.25 12.2 6.7 11.75 7.25 11.75C7.8 11.75 8.25 12.2 8.25 12.75V15.75H11.25C11.8 15.75 12.25 16.2 12.25 16.75C12.25 17.3 11.8 17.75 11.25 17.75H8.25V20.75C8.25 21.3 7.8 21.75 7.25 21.75C6.7 21.75 6.25 21.3 6.25 20.75V17.75H3.25C2.7 17.75 2.25 17.3 2.25 16.75C2.25 16.2 2.7 15.75 3.25 15.75H6.25V12.75Z" fill="currentColor" />
    </svg>
  );
}
