// components/WeatherDetails.jsx
import React from 'react';

const WeatherDetails = ({ weather }) => {
  if (!weather) {
    return null; // Or a placeholder if preferred
  }

  // Helper function to format time based on city's timezone offset
  const formatTime = (timestamp, timezoneOffsetSeconds) => {
    // Convert timestamp to milliseconds and add timezone offset (in milliseconds)
    const date = new Date((timestamp + timezoneOffsetSeconds) * 1000);
    // Use toLocaleTimeString with 'UTC' timezone to ensure the offset is applied correctly
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  };

  return (
    <div className="weather-details-grid">
      <h3>Weather Details</h3>
      <div className="weather-detail-item">
        <strong>Feels Like</strong>
        <span>{Math.round(weather.main.feels_like)}°C</span>
      </div>
      <div className="weather-detail-item">
        <strong>Humidity</strong>
        <span>{weather.main.humidity}%</span>
      </div>
      <div className="weather-detail-item">
        <strong>Wind Speed</strong>
        <span>{weather.wind.speed} m/s</span>
      </div>
      <div className="weather-detail-item">
        <strong>Pressure</strong>
        <span>{weather.main.pressure} hPa</span>
      </div>
      <div className="weather-detail-item">
        <strong>Visibility</strong>
        <span>{weather.visibility / 1000} km</span>
      </div>
      <div className="weather-detail-item">
        <strong>Sunrise</strong>
        <span>{formatTime(weather.sys.sunrise, weather.timezone)}</span>
      </div>
      <div className="weather-detail-item">
        <strong>Sunset</strong>
        <span>{formatTime(weather.sys.sunset, weather.timezone)}</span>
      </div>
    </div>
  );
};

export default WeatherDetails;
