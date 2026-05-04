import { ToolSet } from '../completion/completion.strategy';

export interface IToolStrategy {
  getTools(): ToolSet | undefined;
}
