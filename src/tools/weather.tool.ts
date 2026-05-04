import { jsonSchema } from 'ai';

interface WeatherInput {
  location: string;
  unit: 'celsius' | 'fahrenheit';
}

interface WeatherOutput {
  location: string;
  temperature: number;
  unit: 'celsius' | 'fahrenheit';
  condition: string;
  humidity: number;
  windSpeed: number;
}

export const getCurrentWeather = {
  description: 'Get the current weather for a given location',
  inputSchema: jsonSchema<WeatherInput>({
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name, e.g. "Istanbul"' },
      unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
    },
    required: ['location', 'unit'],
  }),
  execute: async ({ location, unit }: WeatherInput): Promise<WeatherOutput> => {
    const conditions = ['Sunny', 'Partly cloudy', 'Cloudy', 'Rainy', 'Clear'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)] as string;
    const tempC = Math.floor(Math.random() * 30) + 5;

    return {
      location,
      temperature: unit === 'celsius' ? tempC : Math.round(tempC * 9 / 5 + 32),
      unit,
      condition,
      humidity: Math.floor(Math.random() * 60) + 30,
      windSpeed: Math.floor(Math.random() * 30) + 2,
    };
  },
};
