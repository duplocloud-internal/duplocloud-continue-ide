import { ToolImpl } from ".";
import { getStringArg } from "../parseArgs";

export const sendHelpdeskApprovalImpl: ToolImpl = async (args, extras) => {
  const agentName = getStringArg(args, "agent_name");

  // Validate commands array
  const commands = args?.commands;
  if (
    !Array.isArray(commands) ||
    !commands.every((c) => typeof c === "string" && c.trim().length > 0)
  ) {
    throw new Error(
      "`commands` argument is required and must be an array of non-empty strings.",
    );
  }

  try {
    // Reuse the same Duplo configuration pattern as sendHelpdeskMessageImpl
    const duploConfig = {
      baseUrl: process.env.DUPLO_BASE_URL || "",
      tenantId: process.env.DUPLO_TENANT_ID || "",
      ticketId: process.env.DUPLO_TICKET_ID || "",
      token: process.env.DUPLO_TOKEN || "",
    };

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

    const apiUrl = `${duploConfig.baseUrl}/v1/aiservicedesk/tickets/${duploConfig.tenantId}/${duploConfig.ticketId}/sendmessage`;

    // Build approval payload: set execute: true for each command
    const requestBody = {
      content: "Approved.",
      data: {
        cmds: commands.map((command: string) => ({ command, execute: true })),
      },
    };

    console.log("requestBody", requestBody);

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
          description: `Failed to send approval (${response.status})`,
          content: `Error: ${response.statusText}\n\nDetails: ${errorText}`,
        },
      ];
    }

    const responseData = await response.json();

    console.log("responseData", responseData);

    return [
      {
        name: "Helpdesk Approval Response",
        description: `Approval sent to ${agentName} via DuploCloud helpdesk`,
        content: `✅ Approved ${commands.length} command(s) for ${agentName}.\n\nPayload: ${JSON.stringify(requestBody, null, 2)}\n\nResponse: ${JSON.stringify(responseData, null, 2)}`,
      },
    ];
  } catch (error) {
    return [
      {
        name: "Helpdesk Error",
        description: "Failed to send approval",
        content: `Error sending approval to helpdesk: ${error instanceof Error ? error.message : String(error)}`,
      },
    ];
  }
};
