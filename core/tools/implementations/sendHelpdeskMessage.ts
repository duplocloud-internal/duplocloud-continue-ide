import { ToolImpl } from ".";
import { getStringArg } from "../parseArgs";

export const sendHelpdeskMessageImpl: ToolImpl = async (args, extras) => {
  const agentName = getStringArg(args, "agent_name");
  const message = getStringArg(args, "message");

  try {
    // Get DuploCloud configuration from IDE settings or environment
    // These would typically be configured by the user
    // const ideSettings = await extras.ide.getIdeSettings();

    const duploConfig = {
      baseUrl: process.env.DUPLO_BASE_URL || "",
      tenantId: process.env.DUPLO_TENANT_ID || "",
      ticketId: process.env.DUPLO_TICKET_ID || "",
      token: process.env.DUPLO_TOKEN || "",
    };

    // Validate required configuration
    if (!duploConfig.tenantId || !duploConfig.ticketId || !duploConfig.token) {
      return [
        {
          name: "Configuration Error",
          description: "Missing DuploCloud configuration",
          content:
            "Please configure DUPLO_TENANT_ID, DUPLO_TICKET_ID, and DUPLO_TOKEN environment variables to use the helpdesk integration.",
        },
      ];
    }

    // Construct the API URL
    const apiUrl = `${duploConfig.baseUrl}/v1/aiservicedesk/tickets/${duploConfig.tenantId}/${duploConfig.ticketId}/sendmessage`;

    // Prepare the request body
    const requestBody = {
      content: message,
      data: {},
    };

    console.log("requestBody", requestBody);

    // Make the API call
    const response = await extras.fetch(apiUrl, {
      method: "POST",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json; charset=UTF-8",
        authorization: `Bearer ${duploConfig.token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return [
        {
          name: "Helpdesk API Error",
          description: `Failed to send message (${response.status})`,
          content: `Error: ${response.statusText}\n\nDetails: ${errorText}`,
        },
      ];
    }

    const responseData = await response.json();

    console.log("responseData", responseData);

    return [
      {
        name: "Helpdesk Response",
        description: `Message sent to ${agentName} via DuploCloud helpdesk`,
        content: `✅ Request successfully processed by ${agentName}\n\nMessage: "${message}"\n\nResponse: ${JSON.stringify(responseData, null, 2)}`,
      },
    ];
  } catch (error) {
    return [
      {
        name: "Helpdesk Error",
        description: "Failed to send message",
        content: `Error sending message to helpdesk: ${error instanceof Error ? error.message : String(error)}`,
      },
    ];
  }
};
