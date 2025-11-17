import { DuploContext } from "core/duplocloud/ai.model";
import { HelpDeskLink } from "./HelpDeskLink";

interface DuploContextDisplayProps {
  context?: DuploContext;
}

export function DuploContextDisplay({ context }: DuploContextDisplayProps) {
  if (!context?.portal || !context?.tenant?.tenantId) {
    return null;
  }

  return (
    <div className="rounded-default bg-editor outline-command-border mb-2 border px-3 py-2">
      {/* Context Header */}
      <div className="mb-1 mt-0 flex items-center justify-between">
        <div className="text-vscode-foreground text-sm font-medium">
          DuploCloud Context
        </div>

        <HelpDeskLink context={context}> View Ticket </HelpDeskLink>
      </div>

      {/* Context Details */}
      <div className="space-y-1 text-xs">
        {/* Portal */}
        <div className="flex items-start gap-2">
          <span className="text-vscode-foreground flex-shrink-0">Portal:</span>
          <span className="text-vscode-foreground break-words font-medium">
            {context.portal}
          </span>
        </div>

        {/* Tenant */}
        {context.tenant?.tenantName && (
          <div className="flex items-start gap-2">
            <span className="text-vscode-foreground flex-shrink-0">
              Tenant:
            </span>
            <span className="text-vscode-foreground break-words font-medium">
              {context.tenant.tenantName}
            </span>
          </div>
        )}

        {/* Agent */}
        {context.agent?.friendlyName && (
          <div className="flex items-start gap-2">
            <span className="text-vscode-foreground flex-shrink-0">Agent:</span>
            <span className="text-vscode-foreground break-words font-medium">
              {context.agent?.friendlyName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
