import { ToolImpl } from ".";
import {
  DuploAgentResponse,
  DuploContext,
  DuploContextPayload,
  DuploPortal,
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

  return await processHelpDeskResponse(
    {
      context: duploContext as DuploContext,
      authToken: authToken as string,
      userText: message as string,
      sessionId: sessionId as string,
    },
    agentName,
    message,
    extras,
  );
};

const MAX_RECURSION_DEPTH = 10;

async function processHelpDeskResponse(
  payload: DuploContextPayload,
  agentName: string,
  message: string,
  extras: any,
  lastResp?: DuploAgentResponse,
  recursionDepth: number = 0,
) {
  let actions = {};
  let llmResp: any = {
    name: "Helpdesk Response",
    description: `Message sent to ${agentName} via DuploCloud helpdesk`,
    content: "",
  };

  const hasLastResp =
    lastResp !== undefined &&
    lastResp !== null &&
    (lastResp?.hasOwnProperty("content") || lastResp?.hasOwnProperty("data"));

  console.log(
    `[processHelpDeskResponse] Recursion depth: ${recursionDepth}, Has commands: ${!!lastResp?.data?.cmds?.length}`,
  );

  if (hasLastResp) {
    llmResp = {
      ...llmResp,
      content: `✅ Request successfully processed by ${agentName}\n\nMessage: "${message}"\n\nResponse: ${JSON.stringify(lastResp, null, 2)}`,
    };

    if (
      !lastResp?.data?.cmds?.length ||
      recursionDepth >= MAX_RECURSION_DEPTH
    ) {
      sendAgentResponse(extras, lastResp);
      return [llmResp];
    }

    const { success: cmdApproved, cmdList: approvedCmds } =
      await requestApproveCommands(extras, lastResp);

    if (!cmdApproved || !approvedCmds?.length) return [llmResp];

    actions = { cmdList: approvedCmds };
  }

  try {
    const { success, body } = await duploService.sendHelpDeskMessage(
      payload,
      actions,
    );

    if (!success) {
      llmResp = {
        ...llmResp,
        content:
          `Error sending message to helpdesk: ${body as string}` +
          (hasLastResp ? "\n\n Last Response" + llmResp.content : ""),
      };
      return [llmResp];
    }

    const agentResp: DuploAgentResponse = body as DuploAgentResponse;

    return processHelpDeskResponse(
      {
        ...payload,
        userText: "",
      },
      agentName,
      message,
      extras,
      agentResp,
      recursionDepth + 1,
    );
  } catch (error) {
    console.error("processHelpDeskResponse error", error);

    if (!hasLastResp) {
      llmResp = {
        ...llmResp,
        content:
          `Error sending message to helpdesk: ${error instanceof Error ? error.message : error + ""}` +
          (hasLastResp ? "\n\n Last Response" + llmResp.content : ""),
      };
      return [llmResp];
    }

    return [
      {
        name: "Helpdesk Error",
        description: "Failed to send message",
        content: `Error sending message to helpdesk: ${error instanceof Error ? error.message : error + ""}`,
      },
    ];
  }
}
