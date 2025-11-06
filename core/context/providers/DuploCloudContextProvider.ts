import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
} from "../..";
import { BaseContextProvider } from "../index.js";

class DuploCloudContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "duplocloud-ai",
    displayTitle: "DuploCloudAI",
    description: "Query DuploCloud AI Assistant",
    type: "normal",
    // renderInlineAs: "🔷",
  };

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    // This is just to show the mention in the input
    // Actual API call will be in the custom message handler
    return [
      {
        name: "DuploCloud AI Query",
        description: `Query: ${query}`,
        content: `[DuploCloud AI will process: ${query}]`,
      },
    ];
  }
}

export default DuploCloudContextProvider;
