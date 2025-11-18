import {
  CommandSelectionType,
  HelpDeskFile,
  TerminalCommand,
} from "core/duplocloud/ai.model";
import { useContext } from "react";
import { SecondaryButton } from "..";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { getFontSize } from "../../util";
import {
  StyledTerminalContainer,
  TerminalContent,
} from "../UnifiedTerminal/UnifiedTerminal";
import ActionButtonSection from "./ActionButtonSection";

interface CommandBlockProps {
  cmd: TerminalCommand;
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
  const ideMessenger = useContext(IdeMessengerContext);

  const handleFileOpen = (file: HelpDeskFile) => {
    void ideMessenger.ide.showVirtualFile(file.file_path, file.file_content);
  };

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

            {/* List of files path in badge format display in same line */}
            {cmd?.files?.length && (
              <div className="flex-start mb-1 flex flex-wrap">
                {cmd?.files?.map((file) => (
                  <SecondaryButton
                    onClick={() => handleFileOpen(file)}
                    key={file.uid}
                  >
                    {file.file_path}
                  </SecondaryButton>
                ))}
              </div>
            )}
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
