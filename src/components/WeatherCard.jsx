// src/components/WeatherCard.jsx
import React from 'react';
import "../styles.css";


const WeatherCard = ({ weather }) => {
  if (!weather) return null;
  return (
    <div className="weather-card">
      <h2>{weather.name}</h2>
      <img src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`} alt="icon" />
      <h3>{weather.weather[0].main}</h3>
      <p>{Math.round(weather.main.temp)}°C</p>
      <div className="details">
        <p>Humidity: {weather.main.humidity}%</p>
        <p>Wind: {weather.wind.speed} m/s</p>
      </div>
    </div>
  );
};

export default WeatherCard;
