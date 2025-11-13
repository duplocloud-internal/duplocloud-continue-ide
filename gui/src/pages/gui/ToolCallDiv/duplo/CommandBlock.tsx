import { TerminalCommand } from "core/duplocloud/ai.model";
import { Button, GhostButton } from "../../../../components";
import {
  StyledTerminalContainer,
  TerminalContent,
} from "../../../../components/UnifiedTerminal/UnifiedTerminal";
import { getFontSize } from "../../../../util";

interface CommandBlockProps {
  cmd: TerminalCommand;
  index: number;
  isDisabled: boolean;
  isExecuted?: boolean;
  onSelectionChange?: (
    index: number,
    newState: "Approved" | "Rejected" | "Ignored",
  ) => void;
}

export function CommandBlock({
  cmd,
  index,
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
            <div className="flex items-center gap-2 px-4">
              {cmd.selectionType === "Approved" ? (
                <Button
                  disabled={isDisabled}
                  onClick={() => onSelectionChange(index, "Approved")}
                >
                  Approve
                </Button>
              ) : (
                <GhostButton
                  disabled={isDisabled}
                  onClick={() => onSelectionChange(index, "Approved")}
                >
                  Approve
                </GhostButton>
              )}

              {cmd.selectionType === "Rejected" ? (
                <Button
                  disabled={isDisabled}
                  onClick={() => onSelectionChange(index, "Rejected")}
                >
                  Reject
                </Button>
              ) : (
                <GhostButton
                  disabled={isDisabled}
                  onClick={() => onSelectionChange(index, "Rejected")}
                >
                  Reject
                </GhostButton>
              )}

              {cmd.selectionType === "Ignored" ? (
                <Button
                  disabled={isDisabled}
                  onClick={() => onSelectionChange(index, "Ignored")}
                >
                  Ignore
                </Button>
              ) : (
                <GhostButton
                  disabled={isDisabled}
                  onClick={() => onSelectionChange(index, "Ignored")}
                >
                  Ignore
                </GhostButton>
              )}
            </div>
          )}
        </div>
      </StyledTerminalContainer>
    </div>
  );
}
