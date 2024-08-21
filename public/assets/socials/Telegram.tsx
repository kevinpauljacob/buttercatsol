import React from "react";

interface TelegramIconProps {
  className?: string;
}

const TelegramIcon: React.FC<TelegramIconProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="currentColor"
      className={className}
    >
      <path d="M41.33 7.43401L5.87001 21.108C3.45001 22.08 3.46401 23.43 5.42601 24.032L14.53 26.872L35.594 13.582C36.59 12.976 37.5 13.302 36.752 13.966L19.686 29.368H19.682L19.686 29.37L19.058 38.754C19.978 38.754 20.384 38.332 20.9 37.834L25.322 33.534L34.52 40.328C36.216 41.262 37.434 40.782 37.856 38.758L43.894 10.302C44.512 7.82401 42.948 6.70201 41.33 7.43401Z" />
    </svg>
  );
};

export default TelegramIcon;
