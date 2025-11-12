import { ToolCallState } from "core";
import { DuploAgentResponse } from "core/duplocloud/ai.model";
import { useEffect, useRef, useState } from "react";
import { ToolCallStatusMessage } from "../ToolCallStatusMessage";
import { ToolTruncateHistoryIcon } from "../ToolTruncateHistoryIcon";
import { DuploCommandDisplay } from "./DuploResponseDisplay";

interface DuploToolEventProps {
  tool: any;
  toolCallState: ToolCallState;
  historyIndex: number;
}

interface DuploToolEventState {
  agentResponse: DuploAgentResponse;
  responseId: string;
  eventId: string;
  isActive: boolean;
}

export function DuploToolEvent({
  tool,
  toolCallState,
  historyIndex,
}: DuploToolEventProps) {
  console.log("DuploToolEvent toolCallState", toolCallState);
  console.log("DuploToolEvent tool", tool);

  const stateMap = useRef<Map<string, DuploToolEventState>>(new Map());
  const [stateList, setStateList] = useState<DuploToolEventState[]>([]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const message = event.data;
      const messageType = message.messageType;

      if (
        messageType !== "tools-duplo/approveActions" ||
        toolCallState.status === "done"
      )
        return;

      const data = message.data;
      const toolCallId = data.toolCallId as string;
      if (toolCallId !== toolCallState.toolCallId) return;

      const messageId = message.messageId;
      const agentResponse = data.agentResponse as DuploAgentResponse;
      console.log("DuploToolEvent agentResponse", agentResponse);
      const state = {
        agentResponse,
        responseId: agentResponse.id as string,
        eventId: messageId,
        isActive: true,
      };

      stateMap.current.set(toolCallState.toolCallId, state);

      setStateList((prev) => [...prev, state]);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="mt-1 flex flex-col px-4">
      {/* Status Header */}
      <div className="mb-2 flex min-w-0 flex-row items-center justify-between gap-2">
        <div className="text-description flex min-w-0 flex-row items-center gap-1.5 text-xs">
          <ToolCallStatusMessage tool={tool} toolCallState={toolCallState} />
        </div>
        {!!toolCallState.output?.length && (
          <ToolTruncateHistoryIcon historyIndex={historyIndex} />
        )}
      </div>

      {stateList.map(({ agentResponse, eventId, isActive }) => (
        <DuploCommandDisplay
          agentResponse={agentResponse}
          eventId={eventId}
          isActive={isActive}
        />
      ))}
    </div>
  );
}
