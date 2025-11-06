import { ContextItemWithId } from "../index.js";
import { DuploContext } from "./ai.model.js";

export interface DuploCloudResponse {
  type: "duplocloud-ai-response";
  content: string;
  uiElements?: {
    type: "terminal-commands" | "url-links" | "config-suggestions";
    data: any;
  }[];
  metadata?: Record<string, any>;
}

export class DuploCloudMessageHandler {
  async shouldHandle(contextItems: ContextItemWithId[]): Promise<boolean> {
    console.log(
      "DuploCloudMessageHandler shouldHandle contextItems",
      contextItems,
    );
    return contextItems.some(
      (item) => item.id.providerTitle === "duplocloud-ai",
    );
  }

  async handleMessage(
    userMessage: string,
    contextItems: ContextItemWithId[],
    duploContext?: DuploContext,
  ): Promise<DuploCloudResponse> {
    const duploItem = contextItems.find(
      (item) => item.id.providerTitle === "duplocloud-ai",
    );

    const query = duploItem?.description || userMessage;

    // Make API call to DuploCloud
    const response = await fetch(`${duploContext?.portal}/api/duplocloud-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Authorization: `Bearer ${duploContext?.token}`,
      },
      body: JSON.stringify({
        query,
        tenantId: duploContext?.tenant?.tenantId,
        agentId: duploContext?.agent?.instanceId,
        context: {
          userMessage,
          // Add any additional context
        },
      }),
    });

    const data = await response.json();

    return {
      type: "duplocloud-ai-response",
      content: data.response,
      uiElements: data.uiElements,
      metadata: data.metadata,
    };
  }
}
