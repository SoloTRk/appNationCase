import { IToolStrategy } from './tool.strategy';
import { ToolSet } from '../completion/completion.strategy';
import { getCurrentWeather } from '../../tools/weather.tool';

export class ToolsEnabledStrategy implements IToolStrategy {
  getTools(): ToolSet {
    return { getCurrentWeather };
  }
}
