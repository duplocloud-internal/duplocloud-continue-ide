import { ToolImpl } from ".";
import { DuploContext, DuploPortal } from "../../duplocloud/ai.model";
import duploService from "../../duplocloud/duplo-service";
import { getStringArg } from "../parseArgs";
import { requestDuploContext } from "../requestUserInput";

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

  try {
    // Construct the API URL
    const { success, body } = await duploService.sendHelpDeskMessage({
      context: duploContext as DuploContext,
      authToken: authToken as string,
      sessionId: sessionId as string,
      message: message as string,
      agentName: agentName as string,
    });

    if (success) {
      return [
        {
          name: "Helpdesk Response",
          description: `Message sent to ${agentName} via DuploCloud helpdesk`,
          content: `✅ Request successfully processed by ${agentName}\n\nMessage: "${message}"\n\nResponse: ${JSON.stringify(body, null, 2)}`,
        },
      ];
    } else {
      throw new Error(body);
    }
  } catch (error) {
    console.error("sendHelpdeskMessageImpl error", error);
    return [
      {
        name: "Helpdesk Error",
        description: "Failed to send message",
        content: `Error sending message to helpdesk: ${error instanceof Error ? error.message : String(error)}`,
      },
    ];
  }
};
