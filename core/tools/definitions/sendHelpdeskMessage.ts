import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const sendHelpdeskMessageTool: Tool = {
  type: "function",
  displayTitle: "Send Helpdesk Message",
  wouldLikeTo: "send a message to the AI Helpdesk",
  isCurrently: "sending a message to the AI Helpdesk",
  hasAlready: "sent a message to the AI Helpdesk",
  readonly: false,
  isInstant: false,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.SendHelpdeskMessage,
    description: `Send messages to specialized DuploCloud HelpDesk AI agents for capabilities beyond your built-in tools. You can have multi-turn conversations—send follow-up messages to clarify, drill down, or build on previous responses.

AVAILABLE HELP DESK AGENTS:

1. "k8s"
  Capabilities: Has kubeconfig credentials and cluster context. Executes kubectl and helm commands against live Kubernetes clusters.
  
  When to use: Anytime you need to run kubectl or helm commands that require cluster access. Examples: querying cluster state, deploying resources, checking logs, scaling deployments, managing helm releases.
  
  When not to use: Tasks you can complete with built-in tools (read_file, write_file, run_command, web search). Examples: generating manifests, creating Helm chart files locally, analyzing YAML, searching documentation.

RESPONSE STYLE:
This tool calls outputs i.e. the HelpDesk Agent outputs are displayed directly to the user above your response. Reference them naturally without repeating their content. Keep your response minimal and action-oriented.`,
    parameters: {
      type: "object",
      required: ["agent_name", "message", "files"],
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
        // List of file objects to send to the helpdesk agent with each file object containing file_path to be used by HelpDesk Agent and file_source_path URI within actual file system in open project
        files: {
          type: "array",
          // optional: true,
          items: {
            type: "object",
            properties: {
              file_path: {
                type: "string",
                description:
                  "The path of the file to be used by DuploCloud AI HelpDesk Agent.",
              },
              file_source_uri: {
                type: "string",
                description:
                  "The path of the file to read. Can be a relative path (from workspace root), absolute path, tilde path (~/...), or file:// URI",
              },
            },
          },
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
