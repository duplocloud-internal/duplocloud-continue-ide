import { DuploAgentResponse, TerminalCommand } from "core/duplocloud/ai.model";
import { useContext, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "../../../../components";
import { IdeMessengerContext } from "../../../../context/IdeMessenger";
import { CommandBlock } from "./CommandBlock";

interface DuploCommandDisplayProps {
  agentResponse: DuploAgentResponse;
  eventId: string;
  isActive: boolean;
}

export function DuploCommandDisplay({
  agentResponse,
  eventId,
  isActive,
}: DuploCommandDisplayProps) {
  const ideMessenger = useContext(IdeMessengerContext);
  const [cmdList, setCmdList] = useState<TerminalCommand[]>([]);
  const [isSubmited, setIsSubmited] = useState(false);

  useEffect(() => {
    if (!agentResponse.data?.cmds?.length) return;
    setCmdList(
      agentResponse.data?.cmds?.map((cmd) => ({
        ...cmd,
        selectionType: "Approved",
      })) || [],
    );
  }, [agentResponse, eventId]);

  const handleSelectionChange = (
    index: number,
    newState: "Approved" | "Rejected" | "Ignored",
  ) => {
    const updated = [...(cmdList || [])];
    updated[index].selectionType = newState;
    setCmdList(updated);
  };

  const handleSubmit = () => {
    const runCmds = cmdList
      ?.filter((cmd) => cmd.selectionType !== "Ignored")
      .map((cmd) => ({
        command: cmd.command,
        execute: cmd.selectionType === "Approved",
      }));

    ideMessenger.respond(
      "tools-duplo/approveActions",
      { success: true, cmdList: runCmds },
      eventId,
    );
    setIsSubmited(true);
  };

  const isDisabled = !isActive || isSubmited;

  return (
    <div className="bg-editor rounded-default mb-4 flex flex-col px-4 py-0">
      {agentResponse.content && (
        <div className="border-vscode-textBlockQuote-border rounded border-l-4 text-sm">
          <ReactMarkdown>{agentResponse.content}</ReactMarkdown>
        </div>
      )}

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
              index={index}
              isDisabled={isDisabled}
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
              index={index}
              isDisabled={isDisabled}
              onSelectionChange={handleSelectionChange}
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
