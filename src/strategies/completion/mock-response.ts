const WEATHER_RESPONSE = (location = 'Istanbul') =>
  `The current weather in ${location} is 22°C and Sunny with 55% humidity and wind speed of 15 km/h. It's a great day to be outside!`;

const GENERIC_RESPONSES: Record<string, string> = {
  hello: "Hello! I'm an AI assistant ready to help you. What can I do for you today?",
  help: "I can help you with a wide range of tasks including answering questions, analyzing text, writing code, and much more. What would you like to explore?",
  code: "Here's a simple example in TypeScript:\n\n```typescript\nconst greet = (name: string): string => `Hello, ${name}!`;\nconsole.log(greet('World'));\n```\n\nThis function takes a name and returns a greeting string.",
  default: "That's an interesting question. Based on my analysis, the answer involves multiple factors. I'd recommend considering the context carefully and approaching it systematically. Is there a specific aspect you'd like me to elaborate on?",
};

export function generateMockResponse(userMessage: string, isWeatherQuery: boolean): string {
  if (isWeatherQuery) {
    const locationMatch = userMessage.match(/in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    return WEATHER_RESPONSE(locationMatch ? locationMatch[1] : 'Istanbul');
  }

  const lower = userMessage.toLowerCase();
  if (lower.includes('hello') || lower.includes('hi')) return GENERIC_RESPONSES.hello;
  if (lower.includes('help') || lower.includes('what can')) return GENERIC_RESPONSES.help;
  if (lower.includes('code') || lower.includes('function') || lower.includes('typescript')) return GENERIC_RESPONSES.code;
  return GENERIC_RESPONSES.default;
}
