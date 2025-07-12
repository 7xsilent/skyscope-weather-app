import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';

const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY; // Use the key directly from environment variables

const App = () => {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCelsius, setIsCelsius] = useState(true);
  const [showCards, setShowCards] = useState(false); // State to trigger card entry animation
  const [isDarkMode, setIsDarkMode] = useState(false); // State for dark mode
  const [clothingSuggestion, setClothingSuggestion] = useState('');
  const [travelAdvice, setTravelAdvice] = useState('');
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // Effect to apply dark mode class to body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Function to fetch AQI data
  const fetchAqi = async (latitude, longitude) => {
    try {
      const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}`;
      const aqiRes = await axios.get(aqiUrl);
      setAqi(aqiRes.data.list[0]);
    } catch (err) {
      console.error("Error fetching AQI:", err);
      setAqi(null);
    }
  };

  // Function to fetch 5-day / 3-hour forecast
  const fetchForecast = async (queryType, value) => {
    try {
      let url;
      if (queryType === 'city') {
        url = `https://api.openweathermap.org/data/2.5/forecast?q=${value}&appid=${WEATHER_API_KEY}&units=metric`;
      } else if (queryType === 'coords') {
        url = `https://api.openweathermap.org/data/2.5/forecast?lat=${value.latitude}&lon=${value.longitude}&appid=${WEATHER_API_KEY}&units=metric`;
      } else {
        throw new Error("Invalid query type for forecast.");
      }
      
      const forecastRes = await axios.get(url);
      setForecast(forecastRes.data);
      return forecastRes.data; // Return forecast data for AI suggestions
    } catch (err) {
      console.error("Error fetching forecast:", err);
      return null;
    }
  };

  // Function to fetch AI suggestions
  const fetchAiSuggestions = async (currentWeather, forecastData) => {
    setIsGeneratingSuggestions(true);
    setClothingSuggestion('');
    setTravelAdvice('');

    try {
      const currentTemp = isCelsius ? Math.round(currentWeather.main.temp) : Math.round((currentWeather.main.temp * 9/5) + 32);
      const tempUnit = isCelsius ? 'C' : 'F';
      const weatherDescription = currentWeather.weather[0].description;
      const humidity = currentWeather.main.humidity;
      const windSpeed = Math.round(currentWeather.wind.speed * 3.6); // km/h

      let forecastSummary = '';
      if (forecastData && forecastData.list && forecastData.list.length > 0) {
        const hourlyTemps = forecastData.list.slice(0, 8).map(item => Math.round(item.main.temp));
        const hourlyDescriptions = forecastData.list.slice(0, 8).map(item => item.weather[0].description);
        forecastSummary = `Hourly temperatures: ${hourlyTemps.join(', ')}°C. Hourly conditions: ${[...new Set(hourlyDescriptions)].join(', ')}.`;
      }

      const clothingPrompt = `Based on the following weather conditions in ${currentWeather.name}: Current temperature: ${currentTemp}°${tempUnit}, Feels like: ${isCelsius ? Math.round(currentWeather.main.feels_like) : Math.round((currentWeather.main.feels_like * 9/5) + 32)}°${tempUnit}, Description: ${weatherDescription}, Humidity: ${humidity}%, Wind speed: ${windSpeed} km/h. Provide a concise clothing suggestion (1-2 sentences).`;
      const travelPrompt = `Given the current and forecast weather conditions in ${currentWeather.name}, provide concise travel advice (1-2 sentences). Current weather: ${weatherDescription}, Temperature: ${currentTemp}°${tempUnit}. Forecast for next 24 hours: ${forecastSummary}. Consider visibility, precipitation, and general comfort for outdoor activities.`;

      const payloadClothing = { contents: [{ role: "user", parts: [{ text: clothingPrompt }] }] };
      const payloadTravel = { contents: [{ role: "user", parts: [{ text: travelPrompt }] }] };

      // Using the GEMINI_API_KEY directly from import.meta.env
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

      console.log("Sending clothing prompt to Gemini:", clothingPrompt);
      console.log("Sending travel prompt to Gemini:", travelPrompt);

      const [clothingRes, travelRes] = await Promise.all([
        fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadClothing) }),
        fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadTravel) })
      ]);

      const clothingResult = await clothingRes.json();
      const travelResult = await travelRes.json();

      console.log("Gemini Clothing Suggestion Response:", clothingResult);
      console.log("Gemini Travel Advice Response:", travelResult);

      if (clothingResult.candidates && clothingResult.candidates.length > 0 && clothingResult.candidates[0].content && clothingResult.candidates[0].content.parts && clothingResult.candidates[0].content.parts.length > 0) {
        setClothingSuggestion(clothingResult.candidates[0].content.parts[0].text);
      } else {
        setClothingSuggestion('No clothing suggestion available or unexpected response format.');
      }

      if (travelResult.candidates && travelResult.candidates.length > 0 && travelResult.candidates[0].content && travelResult.candidates[0].content.parts && travelResult.candidates[0].content.parts.length > 0) {
        setTravelAdvice(travelResult.candidates[0].content.parts[0].text);
      } else {
        setTravelAdvice('No travel advice available or unexpected response format.');
      }

    } catch (err) {
      console.error("Error generating AI suggestions:", err);
      setClothingSuggestion('Failed to get clothing suggestions. Check console for network/API errors.');
      setTravelAdvice('Failed to get travel advice. Check console for network/API errors.');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Main function to fetch current weather
  const fetchWeather = async (queryType, value) => {
    setLoading(true);
    setError('');
    setWeather(null);
    setForecast(null);
    setAqi(null);
    setShowCards(false); // Hide cards before new data loads
    setClothingSuggestion(''); // Clear previous suggestions
    setTravelAdvice(''); // Clear previous advice

    try {
      let weatherUrl;
      if (queryType === 'city') {
        weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${value}&appid=${WEATHER_API_KEY}&units=metric`;
      } else if (queryType === 'coords') {
        weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${value.latitude}&lon=${value.longitude}&appid=${WEATHER_API_KEY}&units=metric`;
      } else {
        throw new Error("Invalid query type for weather.");
      }

      const weatherRes = await axios.get(weatherUrl);
      setWeather(weatherRes.data);
      
      if (weatherRes.data.coord) {
        const { lat, lon } = weatherRes.data.coord;
        const fetchedForecast = await fetchForecast('coords', { latitude: lat, longitude: lon });
        await fetchAqi(lat, lon);
        if (fetchedForecast) {
          fetchAiSuggestions(weatherRes.data, fetchedForecast); // Pass both weather and forecast
        }
      }
      setShowCards(true); // Show cards after all data is loaded

    } catch (err) {
      setError('Location not found. Please try again.');
      console.error("Error fetching weather:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (city.trim()) {
      fetchWeather('city', city);
    } else {
      setError('Please enter a city name.');
    }
  };

  const handleLocationSearch = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        fetchWeather('coords', { latitude, longitude });
      }, (err) => {
        setError('Unable to retrieve your location. Please ensure location services are enabled.');
        console.error(err);
      });
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  // Helper to group forecast by day (for daily forecast cards)
  const groupForecastByDay = (list, timezoneOffsetSeconds) => {
    const dailyForecasts = {};
    list.forEach(item => {
      const date = new Date(item.dt_txt + 'Z');
      date.setSeconds(date.getSeconds() + timezoneOffsetSeconds);
      const day = date.toISOString().split('T')[0];

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

    const processedDailyForecasts = Object.keys(dailyForecasts).map(dayKey => {
      const dayData = dailyForecasts[dayKey];
      const minTemp = Math.round(Math.min(...dayData.temps));
      const maxTemp = Math.round(Math.max(...dayData.temps));

      let representativeIcon = dayData.icons[0];
      let representativeDescription = dayData.descriptions[0];

      const noonItem = list.find(item => {
        const itemDate = new Date(item.dt_txt + 'Z');
        itemDate.setSeconds(itemDate.getSeconds() + timezoneOffsetSeconds);
        return itemDate.toISOString().split('T')[0] === dayKey && itemDate.getHours() === 12;
      });

      if (noonItem) {
        representativeIcon = noonItem.weather[0].icon;
        representativeDescription = noonItem.weather[0].description;
      } else {
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
    return processedDailyForecasts.sort((a, b) => a.date - b.date);
  };

  // Helper to filter forecast for hourly display (next 24 hours or so)
  const getHourlyForecast = (forecastList, timezoneOffsetSeconds) => {
    if (!forecastList) return [];
    const now = new Date();
    // Filter for items within roughly the next 24-36 hours, starting from the next available 3-hour block
    return forecastList.filter(item => {
      const itemDate = new Date(item.dt_txt + 'Z');
      itemDate.setSeconds(itemDate.getSeconds() + timezoneOffsetSeconds);
      return itemDate > now;
    }).slice(0, 8); // Get next 8 entries (24 hours)
  };

  // Helper to convert temperature
  const convertTemp = (temp) => {
    if (isCelsius) {
      return Math.round(temp);
    } else {
      return Math.round((temp * 9/5) + 32);
    }
  };

  // Helper to get AQI description
  const getAqiDescription = (aqiValue) => {
    if (aqiValue === 1) return 'Good';
    if (aqiValue === 2) return 'Fair';
    if (aqiValue === 3) return 'Moderate';
    if (aqiValue === 4) return 'Poor';
    if (aqiValue === 5) return 'Very Poor';
    return 'N/A';
  };

  // Helper to get AQI color
  const getAqiColor = (aqiValue) => {
    if (aqiValue === 1) return '#00E676'; // Good (Green)
    if (aqiValue === 2) return '#FFEB3B'; // Fair (Yellow)
    if (aqiValue === 3) return '#FF9800'; // Moderate (Orange)
    if (aqiValue === 4) return '#FF5722'; // Poor (Red-Orange)
    if (aqiValue === 5) return '#D32F2F'; // Very Poor (Dark Red)
    return '#B0BEC5'; // Grey for N/A
  };

  // Helper for UV Index description
  const getUvDescription = (uvIndex) => {
    if (uvIndex <= 2) return 'Low';
    if (uvIndex <= 5) return 'Moderate';
    if (uvIndex <= 7) return 'High';
    if (uvIndex <= 10) return 'Very High';
    return 'Extreme';
  };

  // Helper for UV Index color (simplified)
  const getUvColor = (uvIndex) => {
    if (uvIndex <= 2) return '#00C853'; // Green
    if (uvIndex <= 5) return '#FFD600'; // Yellow
    if (uvIndex <= 7) return '#FF6F00'; // Orange
    if (uvIndex <= 10) return '#D50000'; // Red
    return '#880E4F'; // Violet
  };

  // Function to calculate dew point (approximation)
  const calculateDewPoint = (tempC, humidity) => {
    // Magnus-Tetens formula approximation
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100);
    const dewPoint = (b * alpha) / (a - alpha);
    return Math.round(dewPoint);
  };

  // Function to get wind direction abbreviation
  const getWindDirection = (deg) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">SkyScope</h1>
        <div className="header-icons">
          <span className="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </span>
          <span className="icon" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sun">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-moon">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            )}
          </span>
          <span className="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2.73l-.15.1a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1 0-2.73l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
        </div>
      </header>
      
      <main className="main-content">
        {/* Top Search and Location Info */}
        <div className="top-panel">
          <div className="location-info">
            {weather ? (
              <>
                <h2 className="city-name">{weather.name}, {weather.sys.country}</h2>
                <p className="current-time">
                  {new Date((weather.dt + weather.timezone) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })}
                </p>
                <p className="last-updated">Updated a few minutes ago</p>
              </>
            ) : (
              <h2 className="city-name">Search for a city</h2>
            )}
          </div>
          <div className="search-bar-container">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city name..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="city-input"
            />
            <button onClick={handleSearch} className="search-button">Search</button>
            <button onClick={handleLocationSearch} className="location-button">Use My Location</button>
          </div>
          {/* Temperature unit toggle */}
          <div className="temp-unit-toggle">
            <button
              className={isCelsius ? 'active' : ''}
              onClick={() => setIsCelsius(true)}
            >
              °C
            </button>
            <button
              className={!isCelsius ? 'active' : ''}
              onClick={() => setIsCelsius(false)}
            >
              °F
            </button>
          </div>
        </div>

        {loading && <div className="loading-overlay">Loading weather data...</div>}
        {error && <div className="error-message">{error}</div>}

        {weather && (
          <div className={`weather-dashboard-grid ${showCards ? 'show-cards' : ''}`}>
            {/* Left Column: Current Weather & Forecast */}
            <div className="left-column">
              {/* Current Weather Card */}
              <div className="card current-weather-card">
                <div className="current-temp-main">
                  <img
                    src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`}
                    alt={weather.weather[0].description}
                    className="current-weather-icon"
                  />
                  <span className="temp-value">{convertTemp(weather.main.temp)}°{isCelsius ? 'C' : 'F'}</span>
                  <div className="weather-summary">
                    <p className="description">{weather.weather[0].description}</p>
                    <p className="high-low">H{convertTemp(weather.main.temp_max)}° L{convertTemp(weather.main.temp_min)}°</p>
                  </div>
                </div>
              </div>

              {/* Daily Forecast Card */}
              <div className="card daily-forecast-card">
                <h3>Daily Forecast</h3>
                <div className="daily-forecast-scroll">
                  {forecast && groupForecastByDay(forecast.list, forecast.city.timezone).slice(0, 5).map((day, index) => (
                    <div key={index} className="forecast-day-item">
                      <p className="day-name">{index === 0 ? 'Today' : day.date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                      <img
                        src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                        alt={day.description}
                        className="forecast-icon"
                      />
                      <p className="temp-range">{convertTemp(day.maxTemp)}° / {convertTemp(day.minTemp)}°</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hourly Forecast Card with Graph */}
              <div className="card hourly-forecast-card">
                <h3>Hourly Forecast</h3>
                <div className="hourly-forecast-scroll">
                  {forecast && getHourlyForecast(forecast.list, forecast.city.timezone).map((item, index) => {
                    const temp = convertTemp(item.main.temp);
                    const precipitationChance = Math.round(item.pop * 100); // Probability of precipitation
                    return (
                      <div key={index} className="hourly-item">
                        <p className="hour">{new Date((item.dt + forecast.city.timezone) * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'UTC' })}</p>
                        <img
                          src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                          alt={item.weather[0].description}
                          className="hourly-icon"
                        />
                        <p className="hourly-temp">{temp}°</p>
                        {/* Precipitation bar for hourly forecast */}
                        <div className="precipitation-bar-container">
                          <div className="precipitation-bar" style={{ height: `${precipitationChance}%`, '--bar-height': `${precipitationChance}%`, background: 'var(--gradient-precipitation)' }}></div>
                          {/* Only show text if precipitation chance is greater than 0 */}
                          {precipitationChance > 0 && <span className="precipitation-text">{precipitationChance}%</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Temperature graph for hourly forecast using SVG */}
                {forecast && (
                  <div className="hourly-temp-graph">
                    <svg viewBox="0 0 800 100" preserveAspectRatio="none">
                      {/* Define gradient for the line */}
                      <defs>
                        <linearGradient id="tempGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="var(--gradient-temp-low)" />
                          <stop offset="100%" stopColor="var(--gradient-temp-high)" />
                        </linearGradient>
                      </defs>

                      {/* Background grid lines (optional, for visual reference) */}
                      {/* Horizontal lines */}
                      {[0, 25, 50, 75, 100].map(y => (
                        <line key={`h-${y}`} x1="0" y1={y} x2="800" y2={y} stroke="var(--border-light)" strokeWidth="0.5" />
                      ))}
                      {/* Vertical lines */}
                      {getHourlyForecast(forecast.list, forecast.city.timezone).map((_, index, arr) => {
                        const x = (index / (arr.length - 1)) * 800;
                        return <line key={`v-${index}`} x1={x} y1="0" x2={x} y2="100" stroke="var(--border-light)" strokeWidth="0.5" />;
                      })}

                      {/* Temperature line */}
                      <polyline
                        fill="none"
                        stroke="url(#tempGradient)"
                        strokeWidth="3"
                        points={getHourlyForecast(forecast.list, forecast.city.timezone).map((item, index, arr) => {
                          const temp = convertTemp(item.main.temp);
                          const x = (index / (arr.length - 1)) * 800;
                          // Scale temperature to fit SVG viewBox height (0-100)
                          // Adjusting scaling to make the line more visually dynamic within the 0-100 range
                          const minTemp = Math.min(...getHourlyForecast(forecast.list, forecast.city.timezone).map(i => convertTemp(i.main.temp)));
                          const maxTemp = Math.max(...getHourlyForecast(forecast.list, forecast.city.timezone).map(i => convertTemp(i.main.temp)));
                          const tempRange = maxTemp - minTemp;
                          // Map to 10 (bottom) to 90 (top) for padding
                          const y = 90 - ((temp - minTemp) / (tempRange > 0 ? tempRange : 1)) * 80; 
                          return `${x},${y}`;
                        }).join(' ')}
                      />

                      {/* Temperature points and labels */}
                      {getHourlyForecast(forecast.list, forecast.city.timezone).map((item, index, arr) => {
                        const temp = convertTemp(item.main.temp);
                        const x = (index / (arr.length - 1)) * 800;
                        const minTemp = Math.min(...getHourlyForecast(forecast.list, forecast.city.timezone).map(i => convertTemp(i.main.temp)));
                        const maxTemp = Math.max(...getHourlyForecast(forecast.list, forecast.city.timezone).map(i => convertTemp(i.main.temp)));
                        const tempRange = maxTemp - minTemp;
                        const y = 90 - ((temp - minTemp) / (tempRange > 0 ? tempRange : 1)) * 80;

                        return (
                          <React.Fragment key={index}>
                            <circle cx={x} cy={y} r="6" fill="var(--primary-blue)" stroke="#fff" strokeWidth="2" />
                            <text x={x} y={y - 10} textAnchor="middle" className="graph-temp-label">
                              {temp}°
                            </text>
                          </React.Fragment>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Detailed Metrics & Map */}
            <div className="right-column">
              {/* Clothing Suggestion Card */}
              <div className="card ai-suggestion-card">
                <h4>Clothing Suggestion</h4>
                {isGeneratingSuggestions ? (
                  <p className="loading-text">Generating...</p>
                ) : (
                  <p className="suggestion-text">{clothingSuggestion || 'No suggestion available.'}</p>
                )}
              </div>

              {/* Travel Advice Card */}
              <div className="card ai-suggestion-card">
                <h4>Travel Advice</h4>
                {isGeneratingSuggestions ? (
                  <p className="loading-text">Generating...</p>
                ) : (
                  <p className="suggestion-text">{travelAdvice || 'No advice available.'}</p>
                )}
              </div>

              {/* Visibility Card */}
              <div className="card metric-card">
                <div className="metric-header">
                  <span className="metric-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  </span>
                  <h4>Visibility</h4>
                </div>
                <p className="metric-value">{weather.visibility / 1000} km</p>
                <p className="metric-description">{weather.visibility / 1000 > 10 ? 'Excellent' : 'Good'}</p>
                <div className="visibility-graph">
                  <div className="bar bar-1" style={{ background: 'var(--gradient-visibility)' }}></div>
                  <div className="bar bar-2" style={{ background: 'var(--gradient-visibility)' }}></div>
                  <div className="bar bar-3" style={{ background: 'var(--gradient-visibility)' }}></div>
                </div>
              </div>

              {/* Wind Card */}
              <div className="card metric-card">
                <div className="metric-header">
                  <span className="metric-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wind"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 0 7.2 8H2"/><path d="M12.5 12.5A2.5 2.5 0 1 0 10 16H2"/></svg>
                  </span>
                  <h4>Wind</h4>
                </div>
                <div className="wind-details">
                  <div className="wind-compass-container">
                    <div className="wind-compass" style={{ transform: `rotate(${weather.wind.deg}deg)` }}>
                      <div className="arrow"></div>
                    </div>
                    <span className="direction north">N</span>
                    <span className="direction east">E</span>
                    <span className="direction south">S</span>
                    <span className="direction west">W</span>
                  </div>
                  <div className="wind-speed-info">
                    <p className="value">{Math.round(weather.wind.speed * 3.6)}</p> {/* m/s to km/h */}
                    <p className="unit">km/h</p>
                    <p className="label">Wind Speed</p>
                  </div>
                </div>
                <p className="metric-description">Force: {Math.round(weather.wind.speed)} ({getWindDirection(weather.wind.deg)} Light Breeze)</p>
              </div>

              {/* Pressure Card */}
              <div className="card metric-card">
                <div className="metric-header">
                  <span className="metric-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-gauge"><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="m2 12h2"/><path d="m20 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/></svg>
                  </span>
                  <h4>Pressure</h4>
                </div>
                <p className="metric-value">{weather.main.pressure} hPa</p>
                <p className="metric-description">
                  {weather.main.pressure > 1015 ? 'Rising' : (weather.main.pressure < 1005 ? 'Falling' : 'Steady')}
                </p>
                <div className="pressure-gauge-container">
                  <div className="pressure-gauge-fill" style={{ width: `${Math.min(Math.max((weather.main.pressure - 980) / 50 * 100, 0), 100)}%`, background: 'var(--gradient-pressure)' }}></div>
                </div>
              </div>

              {/* AQI Card */}
              <div className="card metric-card">
                <div className="metric-header">
                  <span className="metric-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-air-vent"><path d="M4 10a2 2 0 0 1-2 2v2a2 2 0 0 1 2 2h16a2 2 0 0 1 2-2v-2a2 2 0 0 1-2-2Z"/><path d="M7 10v6"/><path d="M12 10v6"/><path d="M17 10v6"/></svg>
                  </span>
                  <h4>AQI</h4>
                </div>
                {aqi ? (
                  <>
                    <p className="metric-value" style={{ color: getAqiColor(aqi.main.aqi) }}>{aqi.main.aqi}</p>
                    <p className="metric-description">{getAqiDescription(aqi.main.aqi)}</p>
                    <div className="aqi-circle-graph">
                      <svg viewBox="0 0 36 36" className="circular-chart">
                        <path className="circle-bg"
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path className="circle"
                          strokeDasharray={`${(aqi.main.aqi / 5) * 100}, 100`}
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          style={{ stroke: getAqiColor(aqi.main.aqi) }}
                        />
                      </svg>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="metric-value">N/A</p>
                    <p className="metric-description">No data</p>
                    <div className="aqi-circle-graph">
                      <svg viewBox="0 0 36 36" className="circular-chart">
                        <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="circle" strokeDasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ stroke: '#B0BEC5' }} />
                      </svg>
                    </div>
                  </>
                )}
              </div>

              {/* UV Index Card (Placeholder as OpenWeatherMap doesn't directly provide) */}
              <div className="card metric-card">
                <div className="metric-header">
                  <span className="metric-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                  </span>
                  <h4>UV</h4>
                </div>
                {(() => {
                  const dummyUvIndex = 8; // Example value, replace with actual data if available
                  return (
                    <>
                      <p className="metric-value" style={{ color: getUvColor(dummyUvIndex) }}>{dummyUvIndex}</p>
                      <p className="metric-description">{getUvDescription(dummyUvIndex)}</p>
                      <div className="uv-circle-graph">
                        <svg viewBox="0 0 36 36" className="circular-chart">
                          <path className="circle-bg"
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path className="circle"
                            strokeDasharray={`${(dummyUvIndex / 11) * 100}, 100`} // UV index typically up to 11+
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                            style={{ stroke: getUvColor(dummyUvIndex) }}
                          />
                        </svg>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Humidity Card */}
              <div className="card metric-card">
                <div className="metric-header">
                  <span className="metric-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-droplet"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-5-1.7-6-3V2l-2.78 2.78a4.5 4.5 0 0 0-1.79 4.46c-.4 3.7 2.1 7.2 6.1 8.5a7 7 0 0 0 2.7 1.8V22Z"/></svg>
                  </span>
                  <h4>Humidity</h4>
                </div>
                <p className="metric-value">{weather.main.humidity}%</p>
                <div className="humidity-graph">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="humidity-bar-segment"
                      style={{
                        height: `${(i + 1) * 10}%`, // Each segment represents 10%
                        opacity: (i + 1) * 10 <= weather.main.humidity ? 1 : 0.3, // Full opacity if filled, else partial
                        background: (i + 1) * 10 <= weather.main.humidity ? 'var(--gradient-humidity)' : 'var(--border-light)',
                        '--segment-height': `${(i + 1) * 10}%` // Custom property for animation
                      }}
                    ></div>
                  ))}
                </div>
                <p className="metric-description">Dew point: {calculateDewPoint(weather.main.temp, weather.main.humidity)}°C</p>
              </div>

              {/* Sun Hours Card */}
              <div className="card metric-card sun-hours-card">
                <div className="metric-header">
                  <span className="metric-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sunrise"><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/><path d="M12 12A6 6 0 0 0 6 6v6a6 6 0 0 0 12 0V6a6 6 0 0 0-6 6Z"/></svg>
                  </span>
                  <h4>Sun hours</h4>
                </div>
                <div className="sun-hours-content">
                  <p className="total-hours">
                    {(() => {
                      const sunrise = new Date((weather.sys.sunrise + weather.timezone) * 1000);
                      const sunset = new Date((weather.sys.sunset + weather.timezone) * 1000);
                      const diffMs = sunset.getTime() - sunrise.getTime();
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                      const diffMinutes = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      return `${diffHours}h ${diffMinutes}m`;
                    })()}
                  </p>
                  <div className="sun-time-graph">
                    <svg viewBox="0 0 100 50">
                      <path d="M5 45 C 25 5, 75 5, 95 45" stroke="var(--accent-yellow)" strokeWidth="2" fill="none"/>
                      <circle cx="5" cy="45" r="3" fill="var(--accent-yellow)"/> {/* Sunrise point */}
                      <circle cx="95" cy="45" r="3" fill="var(--accent-yellow)"/> {/* Sunset point */}
                    </svg>
                  </div>
                  <div className="sun-times-labels">
                    <p className="sunrise-time">
                      {new Date((weather.sys.sunrise + weather.timezone) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })}
                      <br />
                      <span>Sunrise</span>
                    </p>
                    <p className="sunset-time">
                      {new Date((weather.sys.sunset + weather.timezone) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })}
                      <br />
                      <span>Sunset</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Map Card (Placeholder) */}
              <div className="card map-card">
                <h4>Location Map</h4>
                <div className="map-placeholder">
                  {weather ? (
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight="0"
                      marginWidth="0"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${weather.coord.lon - 0.1},${weather.coord.lat - 0.1},${weather.coord.lon + 0.1},${weather.coord.lat + 0.1}&layer=mapnik&marker=${weather.coord.lat},${weather.coord.lon}`}
                      style={{ border: '1px solid var(--border-light)', borderRadius: '10px' }}
                    ></iframe>
                  ) : (
                    <img
                      src="https://placehold.co/300x200/cccccc/333333?text=Map+Placeholder"
                      alt="Map placeholder"
                      style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }}
                    />
                  )}
                </div>
                <button className="larger-map-button">Larger Map</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
