import React from "react";
import './forecast.css';

const ForecastCard = ({ forecast, unit }) => {
  const getDate = (dt) => {
    const date = new Date(dt * 1000);
    return date.toLocaleDateString('en-IN', { weekday: 'short' });
  };

  const getIcon = (icon) =>
    `https://openweathermap.org/img/wn/${icon}@2x.png`;

  return (
    <div className="forecast-card">
      <p>{getDate(forecast.dt)}</p>
      <img src={getIcon(forecast.weather[0].icon)} alt="icon" />
      <p>{forecast.weather[0].main}</p>
      <p>
        {unit === 'metric'
          ? `${forecast.temp.day.toFixed(1)}°C`
          : `${((forecast.temp.day * 9) / 5 + 32).toFixed(1)}°F`}
      </p>
    </div>
  );
};

export default ForecastCard;
