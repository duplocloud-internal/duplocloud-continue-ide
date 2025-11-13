import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME } from "../builtIn";

export const sendHelpdeskApprovalTool: Tool = {
  type: "function",
  displayTitle: "Send Helpdesk Approval",
  wouldLikeTo: "send an approval to the helpdesk",
  isCurrently: "sending an approval to the helpdesk",
  hasAlready: "sent an approval to the helpdesk",
  readonly: false,
  isInstant: false,
  group: BUILT_IN_GROUP_NAME,
  function: {
    // name: BuiltInToolNames.SendHelpdeskApproval,
    name: "sendHelpdeskApproval",
    description:
      "Use this tool to submit an approval or acknowledgement to the DuploCloud helpdesk, approving one or more commands returned by a prior helpdesk response.",
    parameters: {
      type: "object",
      required: ["agent_name", "commands"],
      properties: {
        agent_name: {
          type: "string",
          description: "The name of the helpdesk agent handling the approval.",
        },
        commands: {
          type: "array",
          description:
            "Array of shell commands being approved. Use the exact command strings returned by the helpdesk response.",
          items: {
            type: "string",
            description:
              "A shell command to approve, e.g. 'kubectl get pods -n duploservices-ai'",
          },
        },
      },
    },
  },
  systemMessageDescription: {
    prefix: `To approve commands returned by the helpdesk, use the sendHelpdeskApproval tool with an array of command strings. For example:`,
    exampleArgs: [
      ["agent_name", "technical"],
      ["commands", '["kubectl get pods -n duploservices-ai"]'],
    ],
  },
  defaultToolPolicy: "allowedWithPermission",
  toolCallIcon: "CheckCircleIcon",
};
