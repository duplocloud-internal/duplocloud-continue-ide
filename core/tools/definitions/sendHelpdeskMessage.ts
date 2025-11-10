import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const sendHelpdeskMessageTool: Tool = {
  type: "function",
  displayTitle: "Send Helpdesk Message",
  wouldLikeTo: "send a message to the helpdesk",
  isCurrently: "sending a message to the helpdesk",
  hasAlready: "sent a message to the helpdesk",
  readonly: false,
  isInstant: false,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.SendHelpdeskMessage,
    description:
      "Use this tool when user asks k8s related questions like 'List my pods' or 'Deploy a helm chart'. Use this tool to send a message to the DuploCloud helpdesk. This allows you to communicate with DuploCloud's AI HelpDesk agents when you need assistance.",
    parameters: {
      type: "object",
      required: ["agent_name", "message"],
      properties: {
        agent_name: {
          type: "string",
          description:
            "The name of the DuploCloud's AI HelpDesk agent you want to contact (e.g., 'k8s')",
        },
        message: {
          type: "string",
          description:
            "The message you want to send to the DuploCloud's AI HelpDesk agent. Be clear and specific about your request or issue.",
        },
      },
    },
  },
  systemMessageDescription: {
    prefix: `To send a message to the DuploCloud's AI HelpDesk, use the ${BuiltInToolNames.SendHelpdeskMessage} tool. For example, to send a message to the  k8s agent, you would respond with this:`,
    exampleArgs: [
      ["agent_name", "k8s"],
      ["message", "List my pods"],
    ],
  },
  defaultToolPolicy: "allowedWithPermission",
  toolCallIcon: "ChatBubbleLeftRightIcon",
};
