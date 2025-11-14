import {
  ChevronDownIcon,
  ChevronUpIcon,
  WrenchIcon,
} from "@heroicons/react/24/outline";
import {
  CommandSelectionType,
  DuploToolResponse,
} from "core/duplocloud/ai.model";
import { useMemo, useState } from "react";
import { SecondaryButton } from "..";
import ActionButtonSection from "./ActionButtonSection";

interface ToolBlockProps {
  tool: DuploToolResponse;
  isDisabled: boolean;
  onSelectionChange?: (newState: CommandSelectionType) => void;
}

interface ToolInputRow {
  key: string;
  value: any;
  description?: string;
}

export function ToolBlock({
  tool,
  isDisabled,
  onSelectionChange = () => {},
}: ToolBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const inputRows = useMemo((): ToolInputRow[] => {
    if (!tool.input) return [];

    return Object.entries(tool.input).map(([key, value]) => ({
      key,
      value,
      description: tool.input_description?.[key]?.description,
    }));
  }, [tool]);

  return (
    <div className="rounded-default border-vscode-input-border bg-editor outline-command-border mb-2 border pb-2 outline outline-1">
      {/* Tool Header */}
      <div className="flex items-center justify-between px-2 py-1">
        {/* Left Section: Icon and Intent/Name */}
        <div className="flex min-w-0 items-center gap-2">
          <WrenchIcon className="h-5 w-5 flex-shrink-0" />
          <span className="text-vscode-foreground truncate text-sm font-medium">
            {tool.intent || tool.name}
          </span>
        </div>

        {/* Right Section: Toggle Button */}
        <SecondaryButton onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-1">
            <span>{isExpanded ? "Collapse" : "Expand"}</span>
            {isExpanded ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </div>
        </SecondaryButton>
      </div>

      {/* Tool Details (Collapsible) */}
      {isExpanded && (
        <div className="border-vscode-input-border border-t px-3 pb-2 pt-1">
          {/* Name Row */}
          <div className="mb-1 flex items-start gap-2">
            <span className="text-vscode-foreground flex-shrink-0 font-medium">
              Name:
            </span>
            <span className="text-vscode-foreground">{tool.name}</span>
          </div>

          {/* Description Row (Optional) */}
          {tool.tool_description && (
            <div className="mb-1 flex items-start gap-2">
              <span className="text-vscode-foreground flex-shrink-0 font-medium">
                Description:
              </span>
              <span className="text-vscode-foreground">
                {tool.tool_description}
              </span>
            </div>
          )}

          {/* Inputs Table (Optional) */}
          {inputRows.length > 0 && (
            <div className="mt-2">
              <div className="text-vscode-foreground mb-1 text-sm font-medium">
                Inputs
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-vscode-input-border border-b">
                      <th className="text-vscode-foreground pr-2 pt-1 text-left font-medium">
                        Name
                      </th>
                      <th className="text-vscode-foreground pr-2 pt-1 text-left font-medium">
                        Value
                      </th>
                      <th className="text-vscode-foreground pt-1 text-left font-medium">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inputRows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="border-vscode-input-border hover:bg-vscode-input-background border-b"
                      >
                        <td className="pr-2 pt-1 text-blue-500">{row?.key}</td>
                        <td className="pr-2 pt-1 text-green-500">
                          {row?.value
                            ? typeof row.value === "object"
                              ? JSON.stringify(row.value)
                              : String(row.value)
                            : ""}
                        </td>
                        <td className="text-vscode-foreground pt-1">
                          {row?.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <ActionButtonSection
        selectionType={tool.selectionType}
        isDisabled={isDisabled}
        onSelectionChange={onSelectionChange}
      />
    </div>
  );
}
