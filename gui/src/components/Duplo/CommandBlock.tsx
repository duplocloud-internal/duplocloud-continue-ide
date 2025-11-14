import {
  CommandSelectionType,
  TerminalCommand,
} from "core/duplocloud/ai.model";
import { getFontSize } from "../../util";
import {
  StyledTerminalContainer,
  TerminalContent,
} from "../UnifiedTerminal/UnifiedTerminal";
import ActionButtonSection from "./ActionButtonSection";

interface CommandBlockProps {
  cmd: TerminalCommand;
  index: number;
  isDisabled: boolean;
  isExecuted?: boolean;
  onSelectionChange?: (newState: CommandSelectionType) => void;
}

export function CommandBlock({
  cmd,
  isDisabled,
  onSelectionChange = () => {},
  isExecuted = false,
}: CommandBlockProps) {
  return (
    <div className="mb-2">
      {/* Terminal Input Box */}
      <StyledTerminalContainer
        fontSize={getFontSize()}
        // className="mx-2 mb-4"
        data-testid="terminal-container"
      >
        <div className="outline-command-border rounded-default bg-editor my-1 flex min-w-0 flex-col outline outline-1">
          <TerminalContent>
            <pre className="bg-editor pb-25">
              <code>
                {/* Command is always visible */}
                <div>$ {cmd.command}</div>
                {isExecuted && (
                  <>
                    <div>Output:</div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {cmd.output}
                    </div>
                  </>
                )}
              </code>
            </pre>
          </TerminalContent>

          {/* Selection Controls */}
          {isExecuted ? null : (
            <ActionButtonSection
              selectionType={cmd.selectionType}
              isDisabled={isDisabled}
              onSelectionChange={onSelectionChange}
            />
          )}
        </div>
      </StyledTerminalContainer>
    </div>
  );
}
