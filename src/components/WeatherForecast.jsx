// src/components/WeatherForecast.jsx
import React from 'react';

// Helper to format date and time for forecast display
const formatForecastDateTime = (dt_txt, timezoneOffsetSeconds) => {
  // dt_txt is in 'YYYY-MM-DD HH:MM:SS' UTC.
  // timezoneOffsetSeconds is the city's timezone offset from UTC in seconds.
  // We need to apply this offset to get the local time for the forecast entry.
  const date = new Date(dt_txt + 'Z'); // Treat dt_txt as UTC
  date.setSeconds(date.getSeconds() + timezoneOffsetSeconds); // Apply city's timezone offset

  const options = {
    weekday: 'short', // e.g., 'Mon'
    month: 'short',   // e.g., 'Jul'
    day: 'numeric',   // e.g., '12'
    hour: '2-digit',  // e.g., '03 PM'
    minute: '2-digit', // e.g., '00'
    hour12: true      // Use 12-hour format
  };
  return date.toLocaleDateString('en-US', options);
};

// Helper to group forecast data by day
const groupForecastByDay = (list, timezoneOffsetSeconds) => {
  const dailyForecasts = {};
  list.forEach(item => {
    const date = new Date(item.dt_txt + 'Z');
    date.setSeconds(date.getSeconds() + timezoneOffsetSeconds); // Apply city's timezone offset
    const day = date.toISOString().split('T')[0]; // Get YYYY-MM-DD for grouping

    if (!dailyForecasts[day]) {
      dailyForecasts[day] = {
        date: date,
        temps: [],
        icons: [],
        descriptions: []
      };
    }
    dailyForecasts[day].temps.push(item.main.temp);
    dailyForecasts[day].icons.push(item.weather[0].icon);
    dailyForecasts[day].descriptions.push(item.weather[0].description);
  });

  // Process daily forecasts to get min/max temp and a representative icon/description
  const processedDailyForecasts = Object.keys(dailyForecasts).map(dayKey => {
    const dayData = dailyForecasts[dayKey];
    const minTemp = Math.round(Math.min(...dayData.temps));
    const maxTemp = Math.round(Math.max(...dayData.temps));

    // For simplicity, take the icon and description from the noon forecast or first available
    let representativeIcon = dayData.icons[0];
    let representativeDescription = dayData.descriptions[0];

    // Try to find a noon (12:00 PM) forecast for a more representative icon/description
    const noonItem = list.find(item => {
      const itemDate = new Date(item.dt_txt + 'Z');
      itemDate.setSeconds(itemDate.getSeconds() + timezoneOffsetSeconds);
      return itemDate.toISOString().split('T')[0] === dayKey && itemDate.getHours() === 12;
    });

    if (noonItem) {
      representativeIcon = noonItem.weather[0].icon;
      representativeDescription = noonItem.weather[0].description;
    } else {
        // If no noon item, try to find a 3 PM item
        const threePmItem = list.find(item => {
            const itemDate = new Date(item.dt_txt + 'Z');
            itemDate.setSeconds(itemDate.getSeconds() + timezoneOffsetSeconds);
            return itemDate.toISOString().split('T')[0] === dayKey && itemDate.getHours() === 15;
        });
        if (threePmItem) {
            representativeIcon = threePmItem.weather[0].icon;
            representativeDescription = threePmItem.weather[0].description;
        }
    }


    return {
      date: dayData.date,
      minTemp,
      maxTemp,
      icon: representativeIcon,
      description: representativeDescription
    };
  });

  // Sort by date to ensure correct order
  return processedDailyForecasts.sort((a, b) => a.date - b.date);
};


const WeatherForecast = ({ forecast }) => {
  if (!forecast || !forecast.list || forecast.list.length === 0) {
    return null; // Don't render if no forecast data
  }

  // Get timezone offset from the main forecast object
  const timezoneOffsetSeconds = forecast.city.timezone;

  // Group forecast data by day
  const dailyForecasts = groupForecastByDay(forecast.list, timezoneOffsetSeconds);

  // Filter out the current day's forecast if it's already passed or incomplete for a full day summary
  // We want to show the *next* 4-5 full days
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of today UTC
  
  const relevantForecasts = dailyForecasts.filter(day => {
    const forecastDay = new Date(day.date);
    forecastDay.setHours(0, 0, 0, 0);
    // Include today if it's a full day forecast, otherwise start from tomorrow
    // For simplicity, let's just show the next 5 entries after the current day.
    // This often means starting from tomorrow's full day.
    return forecastDay.getTime() >= today.getTime();
  }).slice(0, 5); // Show next 5 days

  return (
    <div className="weather-forecast-panel">
      <h3>5-Day Forecast</h3>
      <div className="forecast-grid">
        {relevantForecasts.map((day, index) => (
          <div key={index} className="forecast-day-item">
            <p className="forecast-date">{index === 0 ? 'Today' : day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            <img
              src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
              alt={day.description}
              className="forecast-icon"
            />
            <p className="forecast-temps">
              <span className="max-temp">{day.maxTemp}°</span> / <span className="min-temp">{day.minTemp}°</span>
            </p>
            <p className="forecast-description">{day.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherForecast;
