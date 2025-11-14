import {
  CommandSelectionType,
  DuploAgentResponse,
  DuploToolResponse,
  TerminalCommand,
} from "core/duplocloud/ai.model";
import { useCallback, useContext, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "..";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { CommandBlock } from "./CommandBlock";
import { LinkBlock } from "./LinkBlock";
import { ToolBlock } from "./ToolBlock";

interface DuploResponseDisplayProps {
  agentResponse: DuploAgentResponse;
  eventId: string;
  isActive: boolean;
}

export function DuploResponseDisplay({
  agentResponse,
  eventId,
  isActive,
}: DuploResponseDisplayProps) {
  const ideMessenger = useContext(IdeMessengerContext);
  const [cmdList, setCmdList] = useState<TerminalCommand[]>([]);
  const [toolList, setToolList] = useState<DuploToolResponse[]>([]);
  const [isSubmited, setIsSubmited] = useState(false);

  useEffect(() => {
    if (!agentResponse.data?.cmds?.length) return;
    setCmdList(
      agentResponse.data?.cmds?.map((cmd) =>
        isActive
          ? {
              ...cmd,
              selectionType: CommandSelectionType.APPROVED,
            }
          : cmd,
      ) || [],
    );

    setToolList(
      agentResponse.data?.tool_calls?.map((tool) => {
        const newTool = isActive
          ? {
              ...tool,
              selectionType: CommandSelectionType.APPROVED,
            }
          : tool;
        return newTool as DuploToolResponse;
      }) || [],
    );
  }, [agentResponse, eventId]);

  const handleCmdChange = useCallback(
    (index: number, newState: CommandSelectionType) => {
      const updated = [...(cmdList || [])];
      updated[index].selectionType = newState;
      setCmdList(updated);
    },
    [setCmdList, cmdList],
  );

  const handleToolChange = useCallback(
    (index: number, newState: CommandSelectionType) => {
      const updated = [...(toolList || [])];
      updated[index].selectionType = newState;
      setToolList(updated);
    },
    [setToolList, toolList],
  );

  const handleSubmit = () => {
    const runCmds = cmdList
      ?.filter((cmd) => cmd.selectionType !== CommandSelectionType.IGNORED)
      .map((cmd) => ({
        command: cmd.command,
        execute: cmd.selectionType === CommandSelectionType.APPROVED,
        uid: cmd.uid,
      }));

    const runTools = toolList?.filter(
      (tool) => tool.selectionType !== CommandSelectionType.IGNORED,
    );

    ideMessenger.respond(
      "tools-duplo/approveActions",
      { success: true, cmdList: runCmds, toolList: runTools },
      eventId,
    );
    setIsSubmited(true);
  };

  const isDisabled = !isActive || isSubmited;

  return (
    <div className="bg-editor rounded-default mb-3 flex flex-col px-3 py-0">
      {agentResponse.content && (
        <div className="border-vscode-textBlockQuote-border rounded border-l-4 text-sm">
          <ReactMarkdown>{agentResponse.content}</ReactMarkdown>
        </div>
      )}

      <LinkBlock urlList={agentResponse.data?.url_configs || []} />

      {agentResponse.data?.executed_cmds?.length ? (
        <div className="mt-2 flex flex-col">
          <div className="mb-2 text-sm font-semibold">
            I ran the following commands:
          </div>
          {agentResponse.data?.executed_cmds?.map((cmd, index) => (
            <CommandBlock
              key={cmd.uid || index}
              cmd={cmd}
              isExecuted={true}
              isDisabled={isDisabled}
            />
          ))}
        </div>
      ) : null}

      {toolList?.length ? (
        <div className="mt-2 flex flex-col">
          <div className="mb-2 text-sm font-semibold">
            I can run the following tools for you:
          </div>
          {toolList?.map((tool, index) => (
            <ToolBlock
              key={tool.id || index}
              tool={tool as DuploToolResponse}
              isDisabled={isDisabled}
              onSelectionChange={handleToolChange.bind(null, index)}
            />
          ))}
        </div>
      ) : null}

      {/* Commands Section */}
      {cmdList?.length ? (
        <div className="mt-2 flex flex-col">
          <div className="mb-2 text-sm font-semibold">
            I would like to execute the following commands and would appreciate
            your approval to proceed :
          </div>
          {cmdList?.map((cmd, index) => (
            <CommandBlock
              key={cmd.uid || index}
              cmd={cmd}
              isDisabled={isDisabled}
              onSelectionChange={handleCmdChange.bind(null, index)}
            />
          ))}
        </div>
      ) : null}

      {/* Submit Button */}
      {!cmdList?.length || isDisabled ? null : (
        <Button disabled={!isActive} onClick={handleSubmit}>
          Submit
        </Button>
      )}
    </div>
  );
}
