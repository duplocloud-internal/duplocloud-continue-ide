import { ToolImpl } from ".";
import {
  DuploAgentResponse,
  DuploContext,
  DuploContextPayload,
  DuploPortal,
  DuploToolResponse,
  DuploToolState,
  MessageResponse,
  TerminalCommand,
} from "../../duplocloud/ai.model";
import {
  generateUserMessagePayload,
  getDuploResponseListStr,
} from "../../duplocloud/ai.utils";
import duploService from "../../duplocloud/duplo-service";
import {
  requestApproveCommands,
  requestDuploContext,
  sendAgentResponse,
  sendDuploToolState,
} from "../duploGuiEvent";
import { getStringArg } from "../parseArgs";

export const sendHelpdeskMessageImpl: ToolImpl = async (args, extras) => {
  const duploPortals = extras.config.ui?.duplo as DuploPortal[];
  // Validate required configuration
  if (!duploPortals.length) {
    return [
      {
        name: "Configuration Error",
        description: "Missing DuploCloud configuration",
        content:
          "Please add DuploCloud configuration to your local config and set DuploCloud context.",
      },
    ];
  }

  let duploContext: DuploContext | undefined = extras.session?.duploContext;

  const sessionId = extras.session?.sessionId;

  // Validate required configuration
  if (!duploContext?.portal) {
    sendDuploToolState(extras, {
      text: "Setting DuploCloud context",
      state: DuploToolState.PENDING,
    });
    const duploContextRequest = await requestDuploContext(extras);
    if (duploContextRequest.success) {
      duploContext = duploContextRequest.duploContext;
      sendDuploToolState(extras, {
        text: "DuploCloud Context set successfully",
        state: DuploToolState.SUCCESS,
      });
    } else {
      sendDuploToolState(extras, {
        text: "Context setup cancelled",
        state: DuploToolState.FAILED,
      });
      return [
        {
          name: "Context Not Set",
          description: "User cancelled setting context",
          content: "The helpdesk message was not sent.",
        },
      ];
    }
  }

  const { portal } = duploContext || {};
  const authToken = duploPortals.find((dp) => dp.portal === portal)?.token;
  const agentName = getStringArg(args, "agent_name");
  const message = getStringArg(args, "message");
  const messageList: MessageResponse[] = [];

  const { success: lastSuccess, error: lastError } =
    await processHelpDeskResponse(
      {
        context: duploContext as DuploContext,
        authToken: authToken as string,
        userText: message as string,
        sessionId: sessionId as string,
      },
      extras,
      messageList,
    );

  console.log("[sendHelpdeskMessageImpl] messageList: ", messageList);
  console.log("[sendHelpdeskMessageImpl] Last Error: ", lastError);

  const responseStr = getDuploResponseListStr(messageList);

  console.log("[sendHelpdeskMessageImpl] Response String: ", responseStr);
  if (!lastSuccess && !responseStr.length) {
    sendDuploToolState(extras, {
      text: "Helpdesk request failed",
      state: DuploToolState.FAILED,
    });
    return [
      {
        name: "Helpdesk Error",
        description: "Failed to send message to DuploCloud helpdesk",
        content: `Error sending message to DuploCloud helpdesk: ${lastError}`,
        data: messageList,
      },
    ];
  }

  sendDuploToolState(extras, {
    text: "Helpdesk request processed successfully",
    state: DuploToolState.SUCCESS,
  });

  return [
    {
      name: "Helpdesk Response",
      description: `Message sent to ${agentName} via DuploCloud helpdesk`,
      content:
        `✅ Request successfully processed by ${agentName}\n\nMessage: "${message}"\n\nResponse: 
      ${responseStr}.
      Analyze the response to take appropriate action and provide short summary of the response.
      Please avoid repeating the same response.` +
        (!lastSuccess && lastError
          ? `\n\n But Error occurred in processing last helpdesk response: ${lastError}`
          : ""),
      data: {
        messageList,
        context: duploContext,
      },
    },
  ];
};

const MAX_RECURSION_DEPTH = 10;

async function processHelpDeskResponse(
  payload: DuploContextPayload,
  extras: any,
  messageList: MessageResponse[],
  lastResp?: DuploAgentResponse,
  recursionDepth: number = 0,
): Promise<{ success: boolean; error?: string }> {
  let actions: {
    cmdList?: TerminalCommand[];
    toolCalls?: DuploToolResponse[];
  } = {};
  const hasLastResp =
    lastResp !== undefined &&
    lastResp !== null &&
    (lastResp?.hasOwnProperty("content") || lastResp?.hasOwnProperty("data"));

  console.log(
    `[sendHelpdeskMessageImpl processHelpDeskResponse] Recursion depth: ${recursionDepth}, Has commands: ${!!lastResp?.data?.cmds?.length}`,
  );

  if (hasLastResp) {
    messageList.push(lastResp);

    const hasCommands = !!lastResp?.data?.cmds?.length;
    const hasTools = !!lastResp?.data?.tool_calls?.length;

    if ((!hasCommands && !hasTools) || recursionDepth >= MAX_RECURSION_DEPTH) {
      sendAgentResponse(extras, lastResp);
      return { success: true };
    }

    const actionList = [];
    if (hasCommands) actionList.push("commands");
    if (hasTools) actionList.push("tools");

    sendDuploToolState(extras, {
      text: `Waiting for ${actionList.join(" / ")} approval`,
      state: DuploToolState.PENDING,
    });

    const {
      success: actApproved,
      cmdList: approvedCmds,
      toolList: approvedTools,
    } = await requestApproveCommands(extras, lastResp);

    if (!actApproved || !approvedCmds?.length || !approvedTools?.length) {
      sendDuploToolState(extras, {
        text: "Commands/Tools not approved",
        state: DuploToolState.FAILED,
      });
      return { success: false };
    }

    actions = { cmdList: approvedCmds };
  }

  sendDuploToolState(extras, {
    text: "Sending request to AI Helpdesk",
    state: DuploToolState.PENDING,
  });

  try {
    const userMsg = generateUserMessagePayload(
      payload?.userText || "",
      actions?.cmdList,
      actions?.toolCalls,
    );
    const { success, body } = await duploService.sendHelpDeskMessage(
      payload,
      userMsg,
    );

    if (!success) {
      sendDuploToolState(extras, {
        text: "Helpdesk request failed",
        state: DuploToolState.FAILED,
      });
      return { success: false, error: body as string };
    }

    const agentResp: DuploAgentResponse = body as DuploAgentResponse;

    if (recursionDepth > 0) {
      sendDuploToolState(extras, {
        text: `Processing Helpdesk response`,
        state: DuploToolState.PENDING,
      });
    }

    messageList.push(userMsg);
    return await processHelpDeskResponse(
      {
        ...payload,
        userText: "",
      },
      extras,
      messageList,
      agentResp,
      recursionDepth + 1,
    );
  } catch (error) {
    console.error("processHelpDeskResponse error", error);

    sendDuploToolState(extras, {
      text: "Helpdesk request failed",
      state: DuploToolState.FAILED,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : error + "",
    };
  }
}
