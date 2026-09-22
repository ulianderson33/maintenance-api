import { getJson } from '../utils/httpClient.js';
import { config } from '../config/index.js';
import { AppError } from '../errors/AppError.js';

/**
 * Сервис прогноза погоды.
 * Переиспользует HTTP-клиент из Кейса 1 и добавляет правило пригодности
 * окна для наружных работ.
 */
export class WeatherService {
  /**
   * @param {{ lat:number, lon:number }} location
   * @param {number} days
   */
  async getForecast(location, days = 3) {
    const url = new URL(config.weather.forecastUrl);
    url.search = new URLSearchParams({
      latitude: String(location.lat),
      longitude: String(location.lon),
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
      forecast_days: String(days),
      timezone: 'auto',
    }).toString();

    const data = await getJson(url.toString());

    if (!data.daily) {
      throw new AppError('Погодный API вернул ответ без daily', {
        code: 'UPSTREAM_BAD_RESPONSE',
        statusCode: 502,
      });
    }

    const {
      time,
      temperature_2m_max,
      temperature_2m_min,
      precipitation_sum,
      wind_speed_10m_max,
    } = data.daily;

    return time.map((date, i) => ({
      date,
      temperatureMax: temperature_2m_max[i],
      temperatureMin: temperature_2m_min[i],
      precipitation: precipitation_sum[i],
      windSpeedMax: wind_speed_10m_max[i],
    }));
  }

  /**
   * Проверяет, пригодно ли окно для наружных работ.
   * Правило задано в конфиге.
   */
  isWindowSuitable(day) {
    return (
      day.precipitation <= config.weather.maxPrecipitationMm &&
      day.windSpeedMax <= config.weather.maxWindMs
    );
  }

  /**
   * Возвращает прогноз с флагом suitable по каждому дню.
   */
  async getForecastWithSuitability(location, days = 3) {
    const forecast = await this.getForecast(location, days);
    return forecast.map((day) => ({
      ...day,
      suitable: this.isWindowSuitable(day),
    }));
  }
}

export const weatherService = new WeatherService();
