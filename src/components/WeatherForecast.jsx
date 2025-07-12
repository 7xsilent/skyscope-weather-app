// components/WeatherForecast.jsx
import React from 'react';

const WeatherForecast = ({ forecast, groupForecastByDay }) => {
  if (!forecast || !forecast.list) {
    return null;
  }

  // Group forecast data by day using the helper function passed from App.jsx
  const timezoneOffsetSeconds = forecast.city.timezone;
  const dailyForecasts = groupForecastByDay(forecast.list, timezoneOffsetSeconds);

  // Display only the next 5 days (including today if available)
  const displayForecasts = dailyForecasts.slice(0, 5);

  return (
    <div className="weather-forecast-panel">
      <h3>5-Day Forecast</h3>
      <div className="forecast-grid">
        {displayForecasts.map((day, index) => (
          <div key={day.date.toISOString()} className="forecast-day-card">
            {/* Display "Today" for the first day, otherwise the weekday and date */}
            <h4>{index === 0 ? 'Today' : day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
            <img 
              src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`} 
              alt={day.description} 
            />
            <p className="temp-range">{day.maxTemp}°C / {day.minTemp}°C</p>
            <p>{day.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherForecast;
