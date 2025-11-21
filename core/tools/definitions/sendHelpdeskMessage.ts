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
  Capabilities: Has kubeconfig credentials and cluster context. Can execute commands against live Kubernetes clusters.
  
  CRITICAL: You do NOT have kubeconfig credentials. Any command that interacts with a live cluster MUST be delegated to this agent.
  
  DELEGATE TO K8S AGENT FOR:
  - Installing/managing helm releases: helm install, helm upgrade, helm uninstall, helm list, helm status, helm rollback
  - Applying/managing K8s resources: kubectl apply, kubectl create, kubectl delete, kubectl patch, kubectl scale
  - Querying live cluster state: kubectl get, kubectl describe, kubectl logs, kubectl top, kubectl exec
  - Any operation requiring cluster access, namespace context, or kubeconfig credentials
  
  YOU HANDLE LOCALLY (with your built-in tools):
  - Creating/editing Kubernetes manifests or Helm chart files (use write_file, edit tools)
  - Local helm operations: helm template, helm lint, helm package, helm dependency update
  - Analyzing or validating YAML files (use read_file)
  - Searching documentation or web resources

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
                  "The path of the file where the file content will be written to inside the uploaded directory used by DuploCloud AI HelpDesk Agent. For example if you mention file_path as foo/bar.txt it will be written to ~/uploaded/foo/bar.txt in the helpdesk agent's persistent storage. Do not include ~/uploaded/ in file_path. Just give the relative path with respect to the uploaded directory.",
              },
              file_content_source_path: {
                type: "string",
                description:
                  "The path of the file whose content will be sent to the helpdesk agent and written to the helpdesk agent's persistent storage at the file_path mentioned inside the ~uploaded directory in the helpdesk agent's persistent storage. Can be a relative path (from workspace root), absolute path, tilde path (~/...), or file:// URI.",
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
      [
        "files",
        '[{ "file_path": "pods.txt", "file_content_source_path": "path_in_project/pods.txt" }]',
      ],
    ],
  },
  defaultToolPolicy: "allowedWithPermission",
  toolCallIcon: "ChatBubbleLeftRightIcon",
};
