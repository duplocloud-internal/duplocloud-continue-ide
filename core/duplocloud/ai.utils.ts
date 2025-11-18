import { encode } from "@toon-format/toon";
import { v4 as uuidv4 } from "uuid";
import {
  AgentResponseData,
  ChatRole,
  CommandSelectionType,
  DuploAgentResponse,
  DuploToolResponse,
  HelpDeskFile,
  HelpDeskMessagePayload,
  MessageResponse,
  TerminalCommand,
  URlBox,
  UserMessage,
} from "./ai.model";

export function getDuploResponseListStr(respList: MessageResponse[]): string {
  if (!Array.isArray(respList) || !respList?.length) return "";

  const parsedList: DuploAgentResponse[] = respList
    .filter((resp) => resp?.role === ChatRole.ASSISTANT)
    .map((resp: any) => {
      const respData: AgentResponseData = {};

      if (resp.data?.duplo_url) respData.duplo_url = resp.data?.duplo_url;
      if (resp.data?.cmds?.length)
        respData.cmds = resp.data?.cmds?.map((cmd: TerminalCommand) => {
          const cmdData: Partial<TerminalCommand> = {
            command: cmd?.command,
          };
          const cmdFiles = HelpDeskFile.getPayloadFiles(cmd?.files);
          if (cmdFiles?.length) cmdData.files = cmdFiles;
          return cmdData;
        });

      if (resp.data?.executed_cmds?.length)
        respData.executed_cmds = resp.data?.executed_cmds?.map(
          (cmd: TerminalCommand) => {
            const cmdData: Partial<TerminalCommand> = {
              command: cmd?.command,
              output: cmd?.output,
            };
            const cmdFiles = HelpDeskFile.getPayloadFiles(cmd?.files);
            if (cmdFiles?.length) cmdData.files = cmdFiles;
            return cmdData;
          },
        );

      if (resp.data?.tool_calls?.length)
        respData.tool_calls = resp.data?.tool_calls;

      if (resp.data?.url_configs?.length)
        respData.url_configs = resp.data?.url_configs;

      return {
        content: resp.content,
        role: resp.role,
        id: resp.id,
        data: respData,
        timeStamp: resp.timeStamp,
        thread_id: resp.thread_id,
      };
    });

  return encode(parsedList);
}

export function generateUserMessagePayload(payload: HelpDeskMessagePayload) {
  const { content, data } = payload;
  const { cmds, tool_calls, files } = data || {};

  const typeList = ["approved", "rejected"];
  const cmdList =
    Array.isArray(cmds) && cmds?.length
      ? cmds
          .filter(
            (cmd) =>
              !typeList.includes(cmd?.selectionType?.toLowerCase() || ""),
          )
          .map((cmd) => ({
            command: cmd.command,
            execute:
              cmd.execute ||
              cmd.selectionType === CommandSelectionType.APPROVED,
            uid: cmd?.uid,
          }))
      : undefined;

  const toolList =
    Array.isArray(tool_calls) && tool_calls?.length
      ? tool_calls?.map((tl) => {
          const tool = new DuploToolResponse(tl);
          return tool.toPayload();
        })
      : undefined;

  const fileList = HelpDeskFile.getPayloadFiles(files);

  const msgBody: UserMessage = {
    content:
      content || generateActionUserMessage(cmdList || [], toolList || []),
    data: { cmds: cmdList, tool_calls: toolList, files: fileList },
    role: ChatRole.USER,
  };

  return msgBody;
}

function generateActionUserMessage(
  blockCmdList: TerminalCommand[],
  blockToolList: DuploToolResponse[],
): string {
  if (blockCmdList.length === 0 && blockToolList.length === 0) return "";

  // Count approvals and rejections
  const cmdApproved = blockCmdList.filter((cmd) => cmd?.execute).length;
  const cmdRejected = blockCmdList.filter((cmd) => !cmd?.execute).length;
  const toolApproved = blockToolList.filter((tool) => tool?.execute).length;
  const toolRejected = blockToolList.filter((tool) => !tool?.execute).length;

  // Build message parts
  const messageParts = [
    createMessagePart(cmdApproved, "approve", "command"),
    createMessagePart(cmdRejected, "reject", "command"),
    createMessagePart(toolApproved, "approve", "tool"),
    createMessagePart(toolRejected, "reject", "tool"),
  ].filter(Boolean); // Remove null/undefined values

  return messageParts.length ? `I ${messageParts.join(", ")} .` : "";
}

function createMessagePart(
  count: number,
  action: string,
  itemType: string,
): string | null {
  if (count <= 0) return null;
  return `${action} ${count} ${itemType}${count > 1 ? "s" : ""}`;
}

export function createChatMessage(
  resp: MessageResponse,
  role: ChatRole,
  id: string = "",
): MessageResponse {
  let cmdList =
    resp?.data?.cmds
      ?.filter((cmd) => cmd?.command)
      .map(
        (cmd) =>
          new TerminalCommand({
            uid: cmd?.uid,
            command: cmd?.command || "",
            execute: cmd?.execute,
            selectionType:
              cmd?.selectionType ||
              (cmd?.execute
                ? CommandSelectionType.APPROVED
                : cmd?.command
                  ? CommandSelectionType.REJECTED
                  : CommandSelectionType.IGNORED),
            selectionMessage: cmd?.rejection_reason
              ? cmd?.rejection_reason
              : "",
            sensitive: cmd?.sensitive,
          }),
      ) ?? [];

  let executedCmdList =
    resp?.data?.executed_cmds
      ?.filter((cmd) => cmd?.command)
      ?.map(
        (cmd) =>
          new TerminalCommand({
            command: cmd?.command || "",
            output: cmd?.output || "",
            execute: cmd?.execute || false,
            uid: cmd?.uid,
          }),
      ) ?? [];

  let url_configs =
    resp?.data?.url_configs
      ?.filter((link) => link?.url)
      ?.map(
        (link) =>
          new URlBox({
            description: link?.description || "",
            url: link?.url || "",
            uid: link?.uid,
          }),
      ) ?? [];

  let toolCalls =
    DuploToolResponse.fromJsonArray(resp?.data?.tool_calls) ?? undefined;

  return role === ChatRole.ASSISTANT
    ? new DuploAgentResponse({
        content: resp.content || "",
        role: ChatRole.ASSISTANT,
        id: id || resp?.name || uuidv4(),
        data: {
          cmds: cmdList,
          executed_cmds: executedCmdList,
          tool_calls: toolCalls,
          url_configs: url_configs,
        },
        timeStamp: resp.timeStamp,
        thread_id: resp.thread_id,
      })
    : new UserMessage({
        content: resp.content || "",
        role: ChatRole.USER,
        id: id || resp?.name || uuidv4(),
        data: {
          cmds: cmdList,
          executed_cmds: executedCmdList,
          tool_calls: toolCalls,
          url_configs: url_configs,
        },
        timeStamp: resp.timeStamp,
        thread_id: resp.thread_id,
      });
}

export function processMessageHistory(
  history: MessageResponse[],
): MessageResponse[] {
  return history.map((message, index) => {
    // Add user message first
    if (message?.role === ChatRole.USER) {
      return createChatMessage(message, ChatRole.USER, message.id);
    }

    // Add agent response
    else {
      const msgCopy = { ...message, data: { ...message.data } };
      const cmds = msgCopy?.data?.cmds || [];
      if (cmds?.length) {
        const nextMsg = history[index + 1];
        const nextUserMsg = nextMsg?.role === ChatRole.USER ? nextMsg : null;

        const execCmds = nextUserMsg?.data?.cmds
          ?.filter((cmd) => cmd?.execute && cmd?.command)
          ?.map((cmd) => cmd?.command);

        const rejectedCmds = nextUserMsg?.data?.cmds?.filter(
          (cmd) => !cmd?.execute && cmd?.command,
        );

        const userExecCmds = nextUserMsg?.data?.executed_cmds
          ?.filter((cmd) => cmd?.command)
          ?.map((cmd) => cmd?.command);

        const execCmdsMap = new Set(execCmds);
        const userExecCmdsMap = new Set(userExecCmds);

        const rejectedCmdsMap = new Map<string, TerminalCommand>();
        if (rejectedCmds?.length) {
          rejectedCmds.forEach((term) =>
            rejectedCmdsMap.set(term?.command, term),
          );
        }

        if (msgCopy.data) {
          msgCopy.data.cmds = cmds?.map((cmd) => {
            if (!cmd?.command) return cmd;
            const command = cmd?.command;
            const execute = execCmdsMap.has(command);
            const rejected = rejectedCmdsMap.has(command);
            const userExecuted = userExecCmdsMap.has(command);

            let selectionType: CommandSelectionType =
              CommandSelectionType.IGNORED;

            if (execute) selectionType = CommandSelectionType.APPROVED;
            else if (rejected) selectionType = CommandSelectionType.REJECTED;
            else if (userExecuted)
              selectionType = CommandSelectionType.EXECUTED;

            return { ...cmd, execute, selectionType };
          });
        }
      }

      const tools = msgCopy?.data?.tool_calls || [];
      if (tools?.length) {
        const nextMsg = history[index + 1];
        const nextUserMsg = nextMsg?.role === ChatRole.USER ? nextMsg : null;

        const approvedTools = nextUserMsg?.data?.tool_calls
          ?.filter((tool) => tool?.execute && tool?.id)
          ?.map((tool) => tool?.id);

        const rejectedTools = nextUserMsg?.data?.tool_calls?.filter(
          (tool) => !tool?.execute && tool?.id,
        );

        const approvedToolsMap = new Set(approvedTools);

        const rejectedToolsMap = new Map<string, DuploToolResponse>();
        if (rejectedTools?.length) {
          rejectedTools.forEach((tool) =>
            rejectedToolsMap.set(tool?.id || "", tool),
          );
        }

        tools?.forEach((tool) => {
          if (!tool?.id) return;
          const toolId = tool?.id;
          const execute = approvedToolsMap.has(toolId);
          const rejected = rejectedToolsMap.has(toolId);

          let selectionType: CommandSelectionType =
            CommandSelectionType.IGNORED;

          if (execute) selectionType = CommandSelectionType.APPROVED;
          else if (rejected) {
            selectionType = CommandSelectionType.REJECTED;
            const userTool = rejectedToolsMap.get(toolId);
            tool.rejection_reason = userTool?.rejection_reason;
          }

          tool.selectionType = selectionType;
        });
      }

      return createChatMessage(msgCopy, ChatRole.ASSISTANT, msgCopy.id);
    }
  });
}
