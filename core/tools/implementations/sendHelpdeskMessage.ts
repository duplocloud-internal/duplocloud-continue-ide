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
      baseUrl: process.env.DUPLO_BASE_URL || "https://test10.duplocloud.net",
      tenantId:
        process.env.DUPLO_TENANT_ID || "fac0d44f-c170-47f2-815f-9420f7fd18ae",
      ticketId: process.env.DUPLO_TICKET_ID || "ai-251107190427",
      token:
        process.env.DUPLO_TOKEN ||
        "AQAAANCMnd8BFdERjHoAwE_Cl-sBAAAA0tnNtDk9lkK9nrQqpW5kBAAAAAACAAAAAAAQZgAAAAEAACAAAAAGsYWjAh1pNp3mY1ha2Gnas4XRF0eSsryFFWJ6KOkLjgAAAAAOgAAAAAIAACAAAAB76FaMPg7hDDgF240k1R9mX_SAgVZ2bSAan9H4SsioAcAAAAC_u5tS_Xz4NiqHlnKeO21qYbjNL-0wUbcnjjBRgrWjGij7eocaiXhtuUz2I9NOf9LiEMDjrrLDjaknk3UZFTf0cch3TVlvtRe15lOW3b02cibe3gBDM6P1Z06o2HO2WqUZfbs9VChYl3HWCIu5CdoU5SU9aV1uHQAGIkK0gx-YRJhZijqjwF93NHuhWm8N5dGVjT6uJmmZvu8P8ZRGPzTJOW5PusDmI6kQ5rm__yQBP7-KXHvFbMWX-YVqc7MrKrpAAAAAaTNURqjJc98UO13MlKw_CYk1_jewOBE7TLGRzkznEqSEPuFvuPo0CkN2c-8L-W96zjIjAWHUH5c1pjHJeZkxMw",
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
