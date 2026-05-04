import { IToolStrategy } from './tool.strategy';
import { ToolSet } from '../completion/completion.strategy';

export class ToolsDisabledStrategy implements IToolStrategy {
  getTools(): ToolSet | undefined {
    return undefined;
  }
}
