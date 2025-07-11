// src/components/WeatherDetails.jsx
import React from 'react';

// Helper to format time
const formatTime = (timestamp, timezone) => {
  const date = new Date((timestamp + timezone) * 1000);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
};

const WeatherDetails = ({ weather }) => {
  if (!weather) return null;

  return (
    <div className="weather-details-grid">
      <div className="detail-item">
        <span className="detail-label">Feels Like</span>
        <span className="detail-value">{Math.round(weather.main.feels_like)}°</span>
      </div>
      <div className="detail-item">
        <span className="detail-label">Humidity</span>
        <span className="detail-value">{weather.main.humidity}%</span>
      </div>
      <div className="detail-item">
        <span className="detail-label">Wind Speed</span>
        <span className="detail-value">{weather.wind.speed} m/s</span>
      </div>
      <div className="detail-item">
        <span className="detail-label">Sunrise</span>
        <span className="detail-value">{formatTime(weather.sys.sunrise, weather.timezone)}</span>
      </div>
      <div className="detail-item">
        <span className="detail-label">Sunset</span>
        <span className="detail-value">{formatTime(weather.sys.sunset, weather.timezone)}</span>
      </div>
       <div className="detail-item">
        <span className="detail-label">Pressure</span>
        <span className="detail-value">{weather.main.pressure} hPa</span>
      </div>
    </div>
  );
};

export default WeatherDetails;
