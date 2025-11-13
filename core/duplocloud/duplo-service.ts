import { fetchwithRequestOptions } from "@continuedev/fetch";
import {
  AiTicket,
  ChatRole,
  CreateAiTicket,
  DuploAgentResponse,
  DuploContext,
  DuploContextPayload,
  DuploContextType,
  TenantsWithAgents,
  TicketAgent,
  UserMessage,
} from "./ai.model";
import { createChatMessage } from "./ai.utils";

class DuploService {
  cacheTenants: Map<string, TenantsWithAgents[]> = new Map();

  constructor() {
    setInterval(() => this.cleanupExpiredCache(), 60 * 1000 * 10);
  }

  private cleanupExpiredCache(): void {
    this.cacheTenants = new Map();
  }

  async getPortalTenants(portalURL: string, authToken?: string) {
    const cachedTenants = this.cacheTenants.get(portalURL);
    if (cachedTenants && cachedTenants?.length > 0)
      return { success: true, body: cachedTenants };
    try {
      const res = await fetchwithRequestOptions(
        `${portalURL}/v1/aiservicedesk/admin/tenants/agents`,
        {
          method: "GET",
          headers: {
            Authorization: authToken ? `Bearer ${authToken}` : "",
            "content-type": "application/json",
          },
        },
      );
      const text = await res.text();
      try {
        const json: TenantsWithAgents[] = JSON.parse(text);
        console.log("[duplo-service/getPortalTenants] status=", res.status);

        const tenants = json?.map((agent) => new TenantsWithAgents(agent));
        this.cacheTenants.set(portalURL, tenants);
        return { success: true, body: tenants };
      } catch {
        console.log(
          "[duplo-service/getPortalTenants] status=",
          res.status,
          "(non-JSON body)",
        );
        return { success: false, body: "Invalid response format" };
      }
    } catch (error) {
      console.error(
        "[duplo-service/getPortalTenants] Error getting tenants with agents for `",
        portalURL,
        "`:",
        error,
      );
      return {
        success: false,
        body: error instanceof Error ? error.message : error + "",
      };
    }
  }

  async getAgentInstance(
    tenantId: string,
    portalURL: string,
    instanceId: string,
  ): Promise<TicketAgent | null> {
    const cachedTenants = await this.getPortalTenants(portalURL);
    if (!cachedTenants.success) return null;
    const tenant = (cachedTenants.body as TenantsWithAgents[]).find(
      (tnt: TenantsWithAgents) => tnt.tenantId === tenantId,
    );
    if (!tenant) return null;
    return (
      tenant?.agentInstances?.find(
        (agent: TicketAgent) => agent.instanceId === instanceId,
      ) ?? null
    );
  }

  async setTicketContext(payload: DuploContextPayload): Promise<any> {
    console.info(
      "[duplo-service/setTicketContext] Setting ticket context : ",
      payload,
    );
    if (payload.type === DuploContextType.CREATE) {
      return this.createAiTicket(payload);
    } else if (payload.type === DuploContextType.UPDATE_AGENT) {
      return this.updateTicketAgent(payload);
    } else if (
      payload.type === DuploContextType.UPDATE_TENANT ||
      payload.type === DuploContextType.UPDATE_PORTAL
    ) {
      const { context, authToken, sessionId } = payload;
      const { portal, tenant } = context;
      const cntxPayload = {
        portalUrl: portal,
        tenantId: tenant?.tenantId as string,
        ticketId: sessionId,
        authToken: authToken,
      };
      const checkTicketInContext = await this.checkTicketInContext(cntxPayload);
      if (checkTicketInContext) {
        return this.setTicketUpdatedContext(cntxPayload);
      } else {
        return this.createAiTicket(payload);
      }
    }
  }

  async createAiTicket(
    payload: DuploContextPayload,
  ): Promise<{ success: boolean; body: any }> {
    const { context, authToken, userText, sessionId } = payload;
    const { portal, tenant, agent } = context;
    console.info(
      "[duplo-service/createAiTicket] Creating AI ticket : ",
      payload,
    );

    const aiTicket = new CreateAiTicket({
      name: sessionId,
      title: userText,
      assignee: agent,
      platform_context: {
        duplo_base_url: portal,
        duplo_token: authToken,
      },
      imAppDetails: {
        channelId: "continue.dev",
        threadId: sessionId,
      },
    });

    console.info(
      "[duplo-service/createAiTicket] Creating AI ticket : ",
      aiTicket,
    );
    try {
      const res = await fetchwithRequestOptions(
        `${portal}/v1/aiservicedesk/tickets/${tenant?.tenantId}`,
        {
          method: "POST",
          headers: {
            Authorization: authToken ? `Bearer ${authToken}` : "",
            "content-type": "application/json",
          },
          body: JSON.stringify(aiTicket),
        },
      );

      const text = await res.text();

      console.log("[duplo-service/createAiTicket] status=", res.status);

      try {
        const json: AiTicket[] = JSON.parse(text);
        console.log("[duplo-service/createAiTicket] body=", json);

        return { success: true, body: json };
      } catch {
        console.log("[duplo-service/createAiTicket] body=", text);
        return { success: false, body: "Invalid response format" };
      }
    } catch (error) {
      console.error(
        "[duplo-service/createAiTicket] Error while getting creating AI ticket:",
        aiTicket,
        error,
      );
      return {
        success: false,
        body: error instanceof Error ? error.message : error + "",
      };
    }
  }

  async getAITicketById(
    payload: {
      portalUrl: string;
      tenantId: string;
      ticketId: string;
      authToken: string;
    },
    canFail = false,
  ): Promise<{ success: boolean; body: AiTicket | any }> {
    const { portalUrl, tenantId, ticketId, authToken } = payload;
    const url = `${portalUrl}/v1/aiservicedesk/tickets/${tenantId}/${ticketId}`;
    try {
      const response = await fetchwithRequestOptions(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "content-type": "application/json",
        },
      });
      const text = await response.text();
      try {
        const json: AiTicket[] = JSON.parse(text);
        console.log("[duplo-service/getAITicketById] body=", json);

        return { success: true, body: json };
      } catch {
        console.log("[duplo-service/getAITicketById] body=", text);
        return { success: false, body: "Invalid response format" };
      }
    } catch (error) {
      console.error(
        "[duplo-service/getAITicketById] Error while getting ticket by id:",
        error,
      );
      if (canFail)
        return {
          success: false,
          body: error instanceof Error ? error.message : error + "",
        };
      throw error;
    }
  }

  async checkTicketInContext(payload: {
    portalUrl: string;
    tenantId: string;
    ticketId: string;
    authToken: string;
  }): Promise<boolean> {
    try {
      const response = await this.getAITicketById(payload, true);
      const { success, body } = response;
      if (!success || !body) return false;
      return body?.name === payload.ticketId;
    } catch (error) {
      console.error("Ticket not found:", error);
      return false;
    }
  }

  async setTicketUpdatedContext(payload: {
    portalUrl: string;
    tenantId: string;
    ticketId: string;
    authToken: string;
  }): Promise<{ success: boolean; body: any }> {
    const { portalUrl, tenantId, ticketId, authToken } = payload;
    const url = `${portalUrl}/v1/aiservicedesk/tickets/${tenantId}/${ticketId}/contextUpdated`;
    try {
      const response = await fetchwithRequestOptions(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "content-type": "application/json",
        },
      });
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        console.log("[duplo-service/setTicketUpdatedContext] body=", json);
        return { success: true, body: json };
      } catch {
        console.log("[duplo-service/setTicketUpdatedContext] body=", text);
        return { success: false, body: "Invalid response format" };
      }
    } catch (error) {
      console.error(
        "[duplo-service/setTicketUpdatedContext]  Error while set ticket context updated:",
        error,
      );
      return {
        success: false,
        body: error instanceof Error ? error.message : error + "",
      };
    }
  }

  async updateTicketAgent(payload: {
    context: DuploContext;
    authToken: string;
    sessionId: string;
  }): Promise<{ success: boolean; body: any }> {
    const { context, authToken, sessionId } = payload;
    const { portal, tenant, agent } = context;

    const url = `${portal}/v1/aiservicedesk/tickets/${tenant?.tenantId}/${sessionId}/assignee`;
    try {
      const response = await fetchwithRequestOptions(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(agent),
      });
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        console.log("[duplo-service/updateTicketAgent] body=", json);
        return { success: true, body: json };
      } catch {
        console.log("[duplo-service/updateTicketAgent] body=", text);
        return { success: false, body: "Invalid response format" };
      }
    } catch (error) {
      console.error("Error while updating agent:", error);
      return {
        success: false,
        body: error instanceof Error ? error.message : error + "",
      };
    }
  }

  async sendHelpDeskMessage(
    contextDetails: DuploContextPayload,
    payload?: UserMessage,
  ): Promise<{ success: boolean; body: DuploAgentResponse | string }> {
    console.log(
      "[duplo-service/sendHelpDeskMessage] contextDetails=",
      contextDetails,
    );
    console.log(
      "[duplo-service/sendHelpDeskMessage] UserMessage payload=",
      payload,
    );

    const { context, authToken, sessionId } = contextDetails;
    const { portal, tenant } = context;
    const url = `${portal}/v1/aiservicedesk/tickets/${tenant?.tenantId}/${sessionId}/sendmessage`;

    console.log("[duplo-service/sendHelpDeskMessage] msgBody=", payload);

    try {
      const response = await fetchwithRequestOptions(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        console.log("[duplo-service/sendHelpDeskMessage] body=", json);
        return {
          success: true,
          body: createChatMessage(
            json,
            ChatRole.ASSISTANT,
          ) as DuploAgentResponse,
        };
      } catch {
        console.error("[duplo-service/sendHelpDeskMessage] body=", text);
        return { success: false, body: "Invalid response format" };
      }
    } catch (error) {
      console.error("Error while sending message:", error);
      return {
        success: false,
        body: error instanceof Error ? error.message : error + "",
      };
    }
  }
}

const duploContextService = new DuploService();

export default duploContextService;
