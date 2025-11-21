import { ToolCallState } from "core";
import {
  ChatRole,
  DuploAgentResponse,
  DuploContext,
  DuploToolState,
} from "core/duplocloud/ai.model";
import { processMessageHistory } from "core/duplocloud/ai.utils";
import { useContext, useEffect, useMemo, useState } from "react";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { ToolCallStatusMessage } from "../../pages/gui/ToolCallDiv/ToolCallStatusMessage";
import { ToolTruncateHistoryIcon } from "../../pages/gui/ToolCallDiv/ToolTruncateHistoryIcon";
import { toolCallStateToContextItems } from "../../pages/gui/ToolCallDiv/utils";
import { useAppSelector } from "../../redux/hooks";
import { openContextItem } from "../mainInput/belowMainInput/ContextItemsPeek";
import { DuploContextDisplay } from "./DuploContextDisplay";
import { DuploToolStatusDisplay } from "./DuploToolStatusDisplay";
import { HelpDeskLink } from "./HelpDeskLink";
import { DuploResponseDisplay } from "./ResponseDisplay";

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

const ACTIVE_TOOL_STATUS = ["generating", "generated", "calling"];

export function DuploToolEvent({
  tool,
  toolCallState,
  historyIndex,
}: DuploToolEventProps) {
  const ideMessenger = useContext(IdeMessengerContext);
  const sessionContext = useAppSelector((s) => s.session.duploContext);
  const history = useAppSelector((s) => s.session.history);
  const [duploContext, setDuploContext] = useState<DuploContext | undefined>(
    sessionContext,
  );

  const [stateList, setStateList] = useState<DuploToolEventState[]>([]);
  const [status, setStatus] = useState<{
    text: string;
    state: DuploToolState;
  }>();

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

  useEffect(() => {
    const messageList = toolCallState?.stateItems?.messageList;

    if (Array.isArray(messageList)) {
      const stateList = processMessageHistory(messageList)
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

    const context = toolCallState?.stateItems?.context as DuploContext;
    if (context?.portal && context?.tenant?.tenantId) {
      setDuploContext(context);
    }
  }, []);

  const isCancelled = useMemo(() => {
    // Check if there is any user message after the current message index
    if (!ACTIVE_TOOL_STATUS.includes(toolCallState.status)) return false;

    return history
      .slice(historyIndex + 1)
      .some((item) => item.message.role === "user");
  }, [history, historyIndex]);

  useEffect(() => {
    if (ACTIVE_TOOL_STATUS.includes(toolCallState.status) && !isCancelled) {
      const handleMessage = async (event: MessageEvent) => {
        const message = event.data;
        const data = message.data;
        const toolCallId = data?.toolCallId as string;

        if (toolCallId !== toolCallState?.toolCallId || isCancelled) return;

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

        if (messageType === "tools-duplo/showDuploContext") {
          console.log("tools-duplo/showDuploContext ", data);
          const context = data.duploContext as DuploContext;
          setDuploContext(context);
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, [isCancelled]);

  return (
    <div className="mb-4 mt-1 flex flex-col pl-2 pr-1">
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

      {/* Display Tool Context */}
      <DuploContextDisplay context={duploContext} />

      {stateList.map(({ agentResponse, eventId, isActive, responseId }) => (
        <DuploResponseDisplay
          key={responseId}
          agentResponse={agentResponse}
          eventId={eventId}
          isActive={isActive}
          isCancelled={isCancelled}
        />
      ))}

      <div className="mt-0 flex items-center justify-between">
        {status && !isCancelled ? (
          <DuploToolStatusDisplay status={status} />
        ) : (
          <div></div>
        )}

        <HelpDeskLink context={duploContext} />
      </div>
    </div>
  );
}
