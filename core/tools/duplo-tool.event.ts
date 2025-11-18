import { ToolExtras } from "..";
import {
  DuploAgentResponse,
  DuploContext,
  DuploToolResponse,
  DuploToolState,
  TerminalCommand,
} from "../duplocloud/ai.model";

export async function requestDuploContext(
  extras: ToolExtras,
): Promise<{ success: boolean; duploContext?: DuploContext }> {
  // Check if messenger is available
  if (!extras.messenger) {
    return {
      success: false,
    };
  }

  try {
    const response = await extras.messenger.request(
      "tools-duplo/setDuploContext",
    );
    console.log("requestDuploContext response", response);
    return response;
  } catch (error) {
    console.error("Error requesting user input:", error);
    return { success: false };
  }
}

export async function requestApproveActions(
  extras: ToolExtras,
  agentResponse: DuploAgentResponse,
): Promise<{
  success: boolean;
  cmdList?: TerminalCommand[];
  toolList?: DuploToolResponse[];
}> {
  // Check if messenger is available
  if (!extras.messenger) {
    return {
      success: false,
    };
  }

  try {
    const response = await extras.messenger.request(
      "tools-duplo/approveActions",
      { agentResponse, toolCallId: extras.toolCallId },
    );

    console.log("requestApproveCommands response", response);
    return response;
  } catch (error) {
    console.error("Error requesting user input:", error);
    return { success: false };
  }
}

export function renderAgentResponse(
  extras: ToolExtras,
  agentResponse: DuploAgentResponse,
): void {
  // Check if messenger is available
  if (!extras.messenger) {
    return;
  }

  extras.messenger.request("tools-duplo/approveActions", {
    agentResponse,
    toolCallId: extras.toolCallId,
  });
}

export function sendDuploToolState(
  extras: ToolExtras,
  status: {
    text: string;
    state: DuploToolState;
  },
): void {
  // Check if messenger is available
  if (!extras.messenger) {
    return;
  }

  extras.messenger.request("tools-duplo/displayToolState", {
    status,
    toolCallId: extras.toolCallId,
  });
}

export function updateToolStateItems(
  extras: ToolExtras,
  stateItems: any,
): void {
  // Check if messenger is available
  if (!extras.messenger) {
    return;
  }

  extras.messenger.request("tools-duplo/updateStateItems", {
    stateItems,
    toolCallId: extras.toolCallId,
  });
}

export function sendDuploContext(
  extras: ToolExtras,
  duploContext: DuploContext,
): void {
  // Check if messenger is available
  if (!extras.messenger) {
    return;
  }

  extras.messenger.request("tools-duplo/showDuploContext", {
    duploContext,
    toolCallId: extras.toolCallId,
  });
}
