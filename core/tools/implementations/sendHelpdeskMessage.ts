import { ToolImpl } from ".";
import { ToolExtras } from "../..";
import {
  DuploAgentResponse,
  DuploContext,
  DuploContextPayload,
  DuploToolResponse,
  DuploToolState,
  HelpDeskFile,
  HelpDeskMessagePayload,
  MessageResponse,
  TerminalCommand,
} from "../../duplocloud/ai.model";
import {
  generateUserMessagePayload,
  getDuploResponseListStr,
} from "../../duplocloud/ai.utils";
import duploService from "../../duplocloud/duplo-service";
import { throwIfFileIsSecurityConcern } from "../../indexing/ignore";
import { resolveInputPath } from "../../util/pathResolver";
import {
  renderAgentResponse,
  requestApproveActions,
  requestDuploContext,
  sendDuploContext,
  sendDuploToolState,
  updateToolStateItems,
} from "../duplo-tool.event";
import { getStringArg } from "../parseArgs";

export const sendHelpdeskMessageImpl: ToolImpl = async (args, extras) => {
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

  sendDuploContext(extras, duploContext as DuploContext);
  updateToolStateItems(extras, { context: duploContext });

  const { portal } = duploContext || {};

  const authToken = await extras.messenger.request("duplo/getPortalToken", {
    portal,
  });

  if (!authToken) {
    sendDuploToolState(extras, {
      text: "Authentication required",
      state: DuploToolState.FAILED,
    });

    return [
      {
        name: "Authentication Error",
        description: "No authentication token found",
        content: `Please authenticate with portal: ${portal}`,
      },
    ];
  }

  const agentName = duploContext?.agent?.friendlyName;
  const message = getStringArg(args, "message");
  const argFiles = args?.files || [];

  let fileObjects: HelpDeskFile[] | undefined = undefined;
  if (Array.isArray(argFiles) && argFiles.length) {
    sendDuploToolState(extras, {
      text: "Fetching file content",
      state: DuploToolState.PENDING,
    });

    fileObjects = await getFilesContent(extras, argFiles);

    sendDuploToolState(extras, {
      text: "File content fetched successfully",
      state: DuploToolState.PENDING,
    });
  }

  const messageList: MessageResponse[] = [];

  const { success: lastSuccess, error: lastError } =
    await processHelpDeskResponse(
      extras,
      {
        context: duploContext as DuploContext,
        authToken: authToken as string,
        userText: message as string,
        sessionId: sessionId as string,
      },
      {
        content: message,
        data: {
          user_file_uploads: fileObjects,
        },
      },
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
    text: "Helpdesk request processed",
    state: DuploToolState.SUCCESS,
  });

  return [
    {
      name: "Helpdesk Response",
      description: `Message sent to ${agentName} via DuploCloud helpdesk`,
      content:
        `✅ Request successfully processed by ${agentName}\n\nMessage: "${message}"\n\nResponse: 
      ${responseStr}.` +
        (!lastSuccess && lastError
          ? `\n\n But Error occurred in processing last helpdesk response: ${lastError}`
          : ""),
    },
  ];
};

const MAX_RECURSION_DEPTH = 10;

async function processHelpDeskResponse(
  extras: any,
  duploCtx: DuploContextPayload,
  hdPayload: HelpDeskMessagePayload,
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

    updateToolStateItems(extras, { messageList });

    const hasCommands = !!lastResp?.data?.cmds?.length;
    const hasTools = !!lastResp?.data?.tool_calls?.length;

    if ((!hasCommands && !hasTools) || recursionDepth >= MAX_RECURSION_DEPTH) {
      renderAgentResponse(extras, lastResp);
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
    } = await requestApproveActions(extras, lastResp);

    if (!actApproved || (!approvedCmds?.length && !approvedTools?.length)) {
      sendDuploToolState(extras, {
        text: "Commands/Tools not approved",
        state: DuploToolState.FAILED,
      });
      return { success: false };
    }

    actions = { cmdList: approvedCmds, toolCalls: approvedTools };
  }

  sendDuploToolState(extras, {
    text: "Sending request to Helpdesk",
    state: DuploToolState.PENDING,
  });

  updateToolStateItems(extras, { messageList });

  try {
    if (!hdPayload.data) hdPayload.data = {};

    if (Array.isArray(actions?.cmdList) && actions?.cmdList?.length)
      hdPayload.data.cmds = (hdPayload.data.cmds || []).concat(
        actions?.cmdList,
      );

    if (Array.isArray(actions?.toolCalls) && actions?.toolCalls?.length)
      hdPayload.data.tool_calls = (hdPayload.data.tool_calls || []).concat(
        actions?.toolCalls,
      );

    const userPayload = generateUserMessagePayload(hdPayload);
    console.log(
      "[processHelpDeskResponse] userPayload before API call:",
      JSON.stringify(userPayload, null, 2),
    );
    const { success, body } = await duploService.sendHelpDeskMessage(
      duploCtx,
      userPayload,
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

    messageList.push(userPayload);

    updateToolStateItems(extras, { messageList });

    return await processHelpDeskResponse(
      extras,
      duploCtx,
      { content: "", data: {} },
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

// Function to return file content using file source URI with file path in async manner with paraller execution
async function getFilesContent(
  extras: ToolExtras,
  files: {
    file_path: string;
    file_content_source_path: string;
  }[],
) {
  const fileList: HelpDeskFile[] = await Promise.all(
    files.map(async (file) => {
      const resolvedPath = await resolveInputPath(
        extras.ide,
        file.file_content_source_path,
      );
      if (!resolvedPath) {
        return new HelpDeskFile();
      }

      // Security check on the resolved display path
      try {
        throwIfFileIsSecurityConcern(resolvedPath.displayPath);
      } catch (error) {
        console.error("getFileContent error", error);
        return new HelpDeskFile();
      }

      const content = await extras.ide.readFile(resolvedPath.uri);

      return new HelpDeskFile({
        file_path: file.file_path,
        file_content: content,
      });
    }),
  );

  const filesWithContent: HelpDeskFile[] = fileList.filter(
    (f) => f?.file_content?.length,
  );

  return filesWithContent?.length ? filesWithContent : undefined;
}
