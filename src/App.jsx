import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WeatherDetails from './components/WeatherDetails';
import WeatherForecast from './components/WeatherForecast'; // Import WeatherForecast
import './styles.css';

// Ensure your API keys are in a .env.local file in your project's root directory
const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const App = () => {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null); // State for forecast data
  const [clothingSuggestion, setClothingSuggestion] = useState('');
  const [travelSuggestion, setTravelSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false); // State for forecast loading
  const [error, setError] = useState('');
  const [suggestionError, setSuggestionError] = useState('');
  // Removed darkMode state as we are now only in dark mode
  // const [darkMode, setDarkMode] = useState(false);

  // Function to generate AI suggestion based on weather data
  const generateSuggestion = async (weatherData) => {
    setLoadingSuggestion(true);
    setClothingSuggestion('');
    setTravelSuggestion('');
    setSuggestionError('');

    // Basic check for API key
    if (!GEMINI_API_KEY) {
      setSuggestionError("Gemini API Key is not configured. Please check your .env.local file.");
      setLoadingSuggestion(false);
      console.error("Gemini API Key is missing!");
      return;
    }

    try {
      const prompt = `Given the current weather in ${weatherData.name}:
        Temperature: ${Math.round(weatherData.main.temp)}°C
        Feels like: ${Math.round(weatherData.main.feels_like)}°C
        Description: ${weatherData.weather[0].description}
        Humidity: ${weatherData.main.humidity}%
        Wind Speed: ${weatherData.wind.speed} m/s

        Please provide clothing advice and travel advice in a JSON object with two fields: "clothingAdvice" (string) and "travelAdvice" (string).
        Example: {"clothingAdvice": "Wear light layers.", "travelAdvice": "Carry an umbrella."}`;

      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = {
        contents: chatHistory,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              "clothingAdvice": { "type": "STRING" },
              "travelAdvice": { "type": "STRING" }
            },
            propertyOrdering: ["clothingAdvice", "travelAdvice"]
          }
        }
      };

      const apiKey = GEMINI_API_KEY;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini API error response:", errorData);
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const jsonText = result.candidates[0].content.parts[0].text;
        try {
          const parsedJson = JSON.parse(jsonText);
          setClothingSuggestion(parsedJson.clothingAdvice || "No clothing advice available.");
          setTravelSuggestion(parsedJson.travelAdvice || "No travel advice available.");
        } catch (parseError) {
          console.error("Failed to parse AI suggestion JSON:", parseError, "Raw text:", jsonText);
          setSuggestionError("AI provided an unparseable suggestion format.");
        }
      } else {
        console.error("Gemini API response structure unexpected:", result);
        setSuggestionError("Could not generate AI suggestion due to unexpected response structure.");
      }
    } catch (err) {
      console.error("Error generating AI suggestion:", err);
      setSuggestionError(`Failed to generate AI suggestion: ${err.message || "Unknown error"}`);
    } finally {
      setLoadingSuggestion(false);
    }
  };

  // Function to fetch 5-day / 3-hour forecast
  const fetchForecast = async (queryType, value) => {
    setLoadingForecast(true);
    setForecast(null); // Clear previous forecast
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
    } catch (err) {
      console.error("Error fetching forecast:", err);
      // Don't set a global error for forecast if weather is okay
    } finally {
      setLoadingForecast(false);
    }
  };

  // This function fetches the weather from the API
  const fetchWeather = async (queryType, value) => {
    setLoading(true);
    setError('');
    setWeather(null); // Clear previous results
    setClothingSuggestion(''); // Clear previous suggestions
    setTravelSuggestion('');
    setSuggestionError(''); // Clear previous suggestion error
    setForecast(null); // Clear previous forecast

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
      
      // After successful weather fetch, fetch forecast and generate suggestion
      if (queryType === 'city') {
        fetchForecast('city', value);
      } else if (queryType === 'coords') {
        fetchForecast('coords', value);
      }
      generateSuggestion(weatherRes.data);

    } catch (err) {
      setError('Location not found. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // This function is called when the user initiates a search
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
        setError('Unable to retrieve your location.');
        console.error(err);
      });
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };
  
  // Function to handle exporting the weather summary
  const handleExportSummary = () => {
    if (!weather) {
      setError("No weather data to export. Please search for a city first.");
      return;
    }

    let summaryText = `Weather Summary for ${weather.name}\n\n`;
    summaryText += `Temperature: ${Math.round(weather.main.temp)}°C (Feels like: ${Math.round(weather.main.feels_like)}°C)\n`;
    summaryText += `Description: ${weather.weather[0].description}\n`;
    summaryText += `Humidity: ${weather.main.humidity}%\n`;
    summaryText += `Wind Speed: ${weather.wind.speed} m/s\n`;
    summaryText += `Pressure: ${weather.main.pressure} hPa\n`;
    summaryText += `Sunrise: ${new Date((weather.sys.sunrise + weather.timezone) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}\n`;
    summaryText += `Sunset: ${new Date((weather.sys.sunset + weather.timezone) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}\n\n`;

    if (clothingSuggestion) {
      summaryText += `Clothing Suggestion:\n${clothingSuggestion}\n\n`;
    }
    if (travelSuggestion) {
      summaryText += `Travel Advice:\n${travelSuggestion}\n\n`;
    }
    
    if (forecast && forecast.list) {
      summaryText += `5-Day Forecast:\n`;
      const timezoneOffsetSeconds = forecast.city.timezone;
      const dailyForecasts = groupForecastByDay(forecast.list, timezoneOffsetSeconds); // Re-use helper
      dailyForecasts.slice(0, 5).forEach((day, index) => {
        summaryText += `  ${index === 0 ? 'Today' : day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: High ${day.maxTemp}°C / Low ${day.minTemp}°C (${day.description})\n`;
      });
      summaryText += `\n`;
    }


    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weather_summary_${weather.name.replace(/\s/g, '_').toLowerCase()}.txt`; // Dynamic filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up the URL object
  };

  // Helper function for export (copied from WeatherForecast.jsx to be self-contained)
  // This is duplicated to ensure the export functionality is self-contained within App.jsx
  // and doesn't rely on WeatherForecast.jsx's internal functions for export.
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


  return (
    <div className="app-container">
      {/* Animated background with gradient */}
      <div className="animated-background"></div>

      {/* Cloud animation elements */}
      <div className="clouds">
        <div className="cloud x1"></div>
        <div className="cloud x2"></div>
        <div className="cloud x3"></div>
        <div className="cloud x4"></div>
        <div className="cloud x5"></div>
      </div>

      <header className="app-header">
        <h1>SkyScope</h1>
        {/* Removed theme-toggle button as per previous discussion */}
      </header>
      
      <main>
        <div className="search-panel">
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
          />
          <button onClick={handleSearch}>Search</button>
          <button onClick={handleLocationSearch}>Use My Location</button>
          {weather && ( // Only show export button when weather data is available
            <button onClick={handleExportSummary} className="export-button">Export Summary</button>
          )}
        </div>

        {/* --- FIX: Wrapped adjacent loader/error messages in a React Fragment --- */}
        <>
          {loading && <div className="loader">Loading weather...</div>}
          {loadingForecast && <div className="loader">Loading forecast...</div>}
          {loadingSuggestion && <div className="loader">Generating suggestions...</div>}
          {error && <div className="error-message">{error}</div>}
        </>
        {/* ------------------------------------------------------------------ */}
        
        {weather ? (
          <div className="weather-dashboard">
            <div className="current-weather-panel">
              <h2>{weather.name}</h2>
              <img 
                src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`} 
                alt={weather.weather[0].description}
                className="weather-icon-large"
              />
              <p className="current-temp">{Math.round(weather.main.temp)}°C</p>
              <p className="weather-description">{weather.weather[0].description}</p>
            </div>

            <div className="right-panel">
              {suggestionError && (
                <div className="ai-suggestion-panel error-message">
                  <h3>AI Suggestion Error</h3>
                  <p>{suggestionError}</p>
                </div>
              )}
              
              {/* Clothing Suggestion Panel */}
              {clothingSuggestion && !loadingSuggestion && !suggestionError && (
                 <div className="ai-suggestion-panel">
                   <h3>Clothing Suggestion</h3>
                   <p>{clothingSuggestion}</p>
                 </div>
              )}

              {/* Travel Suggestion Panel */}
              {travelSuggestion && !loadingSuggestion && !suggestionError && (
                 <div className="ai-suggestion-panel">
                   <h3>Travel Advice</h3>
                   <p>{travelSuggestion}</p>
                 </div>
              )}

              <WeatherDetails weather={weather} />
            </div>
            {/* Render WeatherForecast component here */}
            {forecast && !loadingForecast && (
              <WeatherForecast forecast={forecast} />
            )}
          </div>
        ) : (
          // Initial state panel when no weather data is loaded
          <div className="weather-dashboard">
            <div className="current-weather-panel initial">
              <h2>Search for a city to get weather info!</h2>
              {/* You can add a subtle icon or graphic here for visual appeal in initial state */}
            </div>
            {/* Optional: Add placeholder panels for AI suggestions/details here if desired */}
            <div className="right-panel">
              <div className="ai-suggestion-panel initial">
                <h3>AI Suggestions</h3>
                <p>Suggestions for clothing and travel will appear here.</p>
              </div>
              <div className="weather-details-grid initial">
                <h3>Weather Details</h3>
                <p>Detailed weather parameters will be displayed here.</p>
              </div>
            </div>
            <div className="weather-forecast-panel initial"> {/* Added initial forecast panel */}
              <h3>5-Day Forecast</h3>
              <p>Future weather predictions will be shown here.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
