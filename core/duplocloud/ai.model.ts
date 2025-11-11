import { v4 as uuidv4 } from "uuid";

export interface SetDuploContextPayload {
  context: DuploContext;
  type: DuploContextType;
  authToken: string;
  userText: string;
  sessionId: string;
}

export enum DuploContextType {
  CREATE = "create",
  UPDATE_PORTAL = "update_portal",
  UPDATE_TENANT = "update_tenant",
  UPDATE_AGENT = "update_agent",
}

export class DuploPortal {
  portal: string = "";
  token?: string;

  constructor(props?: Partial<DuploPortal>) {
    Object.assign(this, props || {});
  }
}

export class DuploContext {
  portal: string = "";
  tenant: TenantsWithAgents | null = null;
  agent: TicketAgent | null = null;

  constructor(props?: Partial<DuploContext>) {
    Object.assign(this, props || {});
  }
}

export class TicketAgent {
  agentName: string = "";
  instanceId: string = "";
  friendlyName?: string;
  agentHostTenantId: string = "";

  constructor(props?: Partial<TicketAgent>) {
    Object.assign(this, props || {});

    if (!this?.friendlyName) this.friendlyName = this.instanceId;
  }
}

export class TenantsWithAgents {
  tenantId: string = "";
  tenantName: string = "";
  agentInstances?: TicketAgent[] = [];

  constructor(props?: Partial<TenantsWithAgents>) {
    Object.assign(this, props || {});

    if (props?.agentInstances?.length) {
      this.agentInstances = props.agentInstances.map(
        (agent) => new TicketAgent(agent),
      );
    }
  }
}

export class ImAppDetails {
  constructor(props?: Partial<ImAppDetails>) {
    Object.assign(this, props || {});
  }

  channelId: string = "";
  threadId: string = "";
}

export class CreateAiTicket {
  title: string = "";
  assignee: TicketAgent | null = null;
  process_message?: boolean;
  historic_messages?: MessagePayload[];
  platform_context?: {
    duplo_base_url?: string;
    duplo_token?: string;
  };
  name?: string;

  defaultAgentPermissions?: string[];
  source?: TicketSource;
  imAppDetails: ImAppDetails | null = null;

  constructor(props?: Partial<CreateAiTicket>) {
    Object.assign(this, props || {});

    if (!props?.assignee) {
      this.assignee = {
        agentName: "",
        instanceId: "",
        agentHostTenantId: "",
      };
    }

    if (typeof this.process_message !== "boolean") {
      this.process_message = CreateAiTicket.AUTO_PROCESS_MESSAGE;
    }
  }
  // Toggle this to true to enable auto processing of messages
  static readonly AUTO_PROCESS_MESSAGE = false;
}

export class AiTicket {
  lastModified: string = "";
  createTime: string = "";
  title: string = "";
  assignee: TicketAgent | null = null;
  messagesMetaData: any[] = [];
  tenantId: string = "";
  name: string = "";
  metaData: Record<string, any> = {};
  priority: string = "";
  defaultAgentPermissions?: string[];
  source?: TicketSource;
  imAppDetails: ImAppDetails | null = null;

  get agentName(): string {
    return this.assignee?.agentName || "";
  }

  get instanceId(): string {
    return this.assignee?.instanceId || "";
  }

  get friendlyName(): string {
    return this.assignee?.friendlyName || this.instanceId;
  }

  constructor(props?: Partial<AiTicket>) {
    Object.assign(this, props || {});
  }
}

export enum ChatRole {
  ASSISTANT = "assistant",
  USER = "user",
}

export enum TicketSource {
  None = 0,
  Slack = 1,
}

export class AgentResponse {
  constructor(properties?: Partial<AgentResponse>) {
    Object.assign(this, properties || {});
  }

  content: string = "";
  data: AgentResponseData | null = null;
  role?: ChatRole.ASSISTANT;
  id?: string;
  timeStamp?: string;
  thread_id?: string;
}

export class AgentResponseData {
  constructor(properties?: Partial<AgentResponseData>) {
    Object.assign(this, properties || {});
  }
  duplo_url?: string;
  cmds?: TerminalCommand[];
  executed_cmds?: TerminalCommand[];
  tool_calls?: ToolResponse[];
  url_configs?: URlBox[];
}

export class UserMessage {
  constructor(properties?: Partial<UserMessage>) {
    Object.assign(this, properties || {});
  }

  content: string = "";
  data: AgentResponseData | null = null;
  role?: ChatRole.USER;
  platform_context?: Record<string, any>;
  id?: string;
  timeStamp?: string;
  thread_id?: string;
  agent_managed_memory: boolean = false;
}

export type MessageResponse = UserMessage | AgentResponse;

export class TerminalCommand {
  constructor(properties?: Partial<TerminalCommand>) {
    Object.assign(this, properties || {});

    if (!this?.uid) this.uid = uuidv4();
  }

  command: string = "";
  output?: string;
  execute?: boolean;
  uid?: string;
  rejection_reason?: string;
  selectionType?: "Approved" | "Rejected" | "Ignored" | "Execute";
  selectionMessage?: string;
  isTriggered?: boolean;
  sensitive?: boolean;
}

export class URlBox {
  constructor(properties?: Partial<URlBox>) {
    Object.assign(this, properties || {});
  }
  url: string = "";
  description?: string;
  uid?: string;
}

export class MessagePayload {
  constructor(properties?: Partial<MessagePayload>) {
    Object.assign(this, properties || {});
  }

  content: string = "";
  data?: {
    duplo_url?: string;
    cmds?: TerminalCommand[];
    executed_cmds?: TerminalCommand[];
    tool_calls?: ToolResponse[];
  };
  platform_context?: Record<string, any>;

  message_mode?: number;
}

export interface ToolInputDescriptionMap {
  [key: string]: {
    type: string;
    description: string;
  };
}

export interface ToolInput {
  [key: string]: any;
}

export class ToolResponse {
  id?: string | null;
  name?: string;
  input?: ToolInput;
  execute?: boolean;
  tool_description?: string;
  input_description?: ToolInputDescriptionMap;
  intent?: string | null;
  rejection_reason?: string;
  selectionType?: string | null;

  constructor(properties?: Partial<ToolResponse>) {
    Object.assign(this, properties || {});

    if (!this?.selectionType) this.selectionType = null;
    if (!this?.id) this.id = null;
  }
}
