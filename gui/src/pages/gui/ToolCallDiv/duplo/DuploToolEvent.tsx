import { ToolCallState } from "core";
import {
  ChatRole,
  DuploAgentResponse,
  DuploToolState,
} from "core/duplocloud/ai.model";
import { processMessageHistory } from "core/duplocloud/ai.utils";
import { useContext, useEffect, useMemo, useState } from "react";
import { openContextItem } from "../../../../components/mainInput/belowMainInput/ContextItemsPeek";
import { IdeMessengerContext } from "../../../../context/IdeMessenger";
import { ToolCallStatusMessage } from "../ToolCallStatusMessage";
import { ToolTruncateHistoryIcon } from "../ToolTruncateHistoryIcon";
import { toolCallStateToContextItems } from "../utils";
import { DuploResponseDisplay } from "./DuploResponseDisplay";
import { DuploToolStatusDisplay } from "./DuploToolStatusDisplay";

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
  const ideMessenger = useContext(IdeMessengerContext);
  const [stateList, setStateList] = useState<DuploToolEventState[]>([]);
  const shownContextItems = useMemo(() => {
    const contextItems = toolCallStateToContextItems(toolCallState);
    return contextItems.filter((item) => !item.hidden);
  }, [toolCallState]);

  const isClickable = shownContextItems.length > 0;

  function handleClick() {
    if (shownContextItems.length > 0) {
      openContextItem(shownContextItems[0], ideMessenger);
    }
  }

  const [status, setStatus] = useState<{
    text: string;
    state: DuploToolState;
  }>();

  useEffect(() => {
    if (["generating", "generated", "calling"].includes(toolCallState.status)) {
      const handleMessage = async (event: MessageEvent) => {
        const message = event.data;
        const data = message.data;
        const toolCallId = data?.toolCallId as string;

        if (toolCallId !== toolCallState?.toolCallId) return;

        const messageType = message.messageType;
        if (messageType === "tools-duplo/approveActions") {
          const messageId = message.messageId;
          const agentResponse = data.agentResponse as DuploAgentResponse;

          const state = {
            agentResponse,
            responseId: agentResponse.id as string,
            eventId: messageId,
            isActive: true,
          };

          setStateList((prev) => [...prev, state]);
        }

        if (messageType === "tools-duplo/displayToolState") {
          const state = data.status as {
            text: string;
            state: DuploToolState;
          };
          setStatus(state);
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    } else {
      const histResp = toolCallState?.output?.[0]?.data;
      if (Array.isArray(histResp)) {
        const stateList = processMessageHistory(histResp)
          ?.filter((resp) => resp.role === ChatRole.ASSISTANT)
          .map((resp) => ({
            agentResponse: resp as DuploAgentResponse,
            responseId: resp.id as string,
            eventId: resp.id as string,
            isActive: false,
          }));

        if (stateList.length) {
          setStateList(stateList);
        }
      }
    }
  }, []);

  return (
    <div className="mt-1 flex flex-col pl-2 pr-1">
      {/* Status Header */}
      <div
        onClick={isClickable ? handleClick : undefined}
        className={`mb-2 flex min-w-0 flex-row items-center justify-between gap-2 transition-colors duration-200 ease-in-out ${
          isClickable ? "cursor-pointer hover:brightness-125" : ""
        }`}
      >
        <div className="text-description flex min-w-0 flex-row items-center gap-1.5 text-xs">
          <ToolCallStatusMessage tool={tool} toolCallState={toolCallState} />
        </div>
        {!!toolCallState.output?.length && (
          <ToolTruncateHistoryIcon historyIndex={historyIndex} />
        )}
      </div>

      {stateList.map(({ agentResponse, eventId, isActive, responseId }) => (
        <DuploResponseDisplay
          key={responseId}
          agentResponse={agentResponse}
          eventId={eventId}
          isActive={isActive}
        />
      ))}

      {status && (
        <div className="mt-0">
          <DuploToolStatusDisplay status={status} />
        </div>
      )}
    </div>
  );
}
