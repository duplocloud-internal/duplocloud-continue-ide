import { fetchwithRequestOptions } from "@continuedev/fetch";
import {
  AiTicket,
  CreateAiTicket,
  TenantsWithAgents,
  TicketAgent,
} from "./ai.model";

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
        console.log("[duplo/getPortalTenants] status=", res.status);

        const tenants = json?.map((agent) => new TenantsWithAgents(agent));
        this.cacheTenants.set(portalURL, tenants);
        return { success: true, body: tenants };
      } catch {
        console.log(
          "[duplo/getPortalTenants] status=",
          res.status,
          "(non-JSON body)",
        );
        return { success: false, body: "Invalid response format" };
      }
    } catch (error) {
      console.error(
        "[duplo/getPortalTenants] Error getting tenants with agents for `",
        portalURL,
        "`:",
        error,
      );
      return { success: false, body: String(error) };
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

  async createAiTicket(payload: {
    portalUrl: string;
    authToken?: string;
    tenantId: string;
    assignee: TicketAgent;
    userText: string;
    sessionId: string;
  }): Promise<any> {
    const { portalUrl, authToken, tenantId, assignee, userText, sessionId } =
      payload;
    console.info("[duplo/createAiTicket] Creating AI ticket : ", payload);

    const aiTicket = new CreateAiTicket({
      name: sessionId,
      title: userText,
      assignee: assignee,
      platform_context: {
        duplo_base_url: portalUrl,
        duplo_token: authToken,
      },
      // historic_messages: msgHist,
      // defaultAgentPermissions: defaultPerms,
      // source: TicketSource.Slack,
      imAppDetails: {
        channelId: "continue.dev",
        threadId: sessionId,
      },
    });

    console.info("[duplo/createAiTicket] Creating AI ticket : ", aiTicket);
    try {
      const res = await fetchwithRequestOptions(
        `${portalUrl}/v1/aiservicedesk/tickets/${tenantId}`,
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

      console.log("[duplo/createAiTicket] status=", res.status);

      try {
        const json: AiTicket[] = JSON.parse(text);
        console.log("[duplo/createAiTicket] body=", json);

        return { success: true, body: json };
      } catch {
        console.log("[duplo/createAiTicket] body=", text);
        return { success: false, body: "Invalid response format" };
      }
    } catch (error) {
      console.error(
        "[duplo/createAiTicket] Error while getting creating AI ticket:",
        aiTicket,
        error,
      );
      throw error;
    }
  }
}

const duploContextService = new DuploService();

export default duploContextService;
