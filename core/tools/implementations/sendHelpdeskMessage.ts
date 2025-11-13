import { ToolImpl } from ".";
import {
  DuploAgentResponse,
  DuploContext,
  DuploContextPayload,
  DuploPortal,
  getDuploResponseListStr,
} from "../../duplocloud/ai.model";
import duploService from "../../duplocloud/duplo-service";
import {
  requestApproveCommands,
  requestDuploContext,
  sendAgentResponse,
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
    const duploContextRequest = await requestDuploContext(extras);
    if (duploContextRequest.success) {
      duploContext = duploContextRequest.duploContext;
    } else {
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
  const respList: DuploAgentResponse[] = [];
  const { success: lastSuccess, error: lastError } =
    await processHelpDeskResponse(
      {
        context: duploContext as DuploContext,
        authToken: authToken as string,
        userText: message as string,
        sessionId: sessionId as string,
      },
      message,
      extras,
      respList,
    );

  console.log("[sendHelpdeskMessageImpl] respList: ", respList);

  const responseStr = getDuploResponseListStr(respList);

  console.log("[sendHelpdeskMessageImpl] Response String: ", responseStr);
  console.log("[sendHelpdeskMessageImpl] Last Error: ", lastError);

  if (!lastSuccess && !responseStr.length) {
    return [
      {
        name: "Helpdesk Error",
        description: "Failed to send message to DuploCloud helpdesk",
        content: `Error sending message to DuploCloud helpdesk: ${lastError}`,
        data: respList,
      },
    ];
  }

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
      data: respList,
    },
  ];
};

const MAX_RECURSION_DEPTH = 10;

async function processHelpDeskResponse(
  payload: DuploContextPayload,
  message: string,
  extras: any,
  respList: DuploAgentResponse[],
  lastResp?: DuploAgentResponse,
  recursionDepth: number = 0,
): Promise<{ success: boolean; error?: string }> {
  let actions = {};
  const hasLastResp =
    lastResp !== undefined &&
    lastResp !== null &&
    (lastResp?.hasOwnProperty("content") || lastResp?.hasOwnProperty("data"));

  console.log(
    `[sendHelpdeskMessageImpl processHelpDeskResponse] Recursion depth: ${recursionDepth}, Has commands: ${!!lastResp?.data?.cmds?.length}`,
  );

  if (hasLastResp) {
    respList.push(lastResp);

    if (
      !lastResp?.data?.cmds?.length ||
      recursionDepth >= MAX_RECURSION_DEPTH
    ) {
      sendAgentResponse(extras, lastResp);
      return { success: true };
    }

    const { success: cmdApproved, cmdList: approvedCmds } =
      await requestApproveCommands(extras, lastResp);

    if (!cmdApproved || !approvedCmds?.length) return { success: false };

    actions = { cmdList: approvedCmds };
  }

  try {
    const { success, body } = await duploService.sendHelpDeskMessage(
      payload,
      actions,
    );

    if (!success) return { success: false, error: body as string };

    const agentResp: DuploAgentResponse = body as DuploAgentResponse;

    return processHelpDeskResponse(
      {
        ...payload,
        userText: "",
      },
      message,
      extras,
      respList,
      agentResp,
      recursionDepth + 1,
    );
  } catch (error) {
    console.error("processHelpDeskResponse error", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : error + "",
    };
  }
}
