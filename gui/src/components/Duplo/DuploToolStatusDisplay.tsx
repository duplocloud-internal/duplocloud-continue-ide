import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { DuploToolState } from "core/duplocloud/ai.model";
import { vscForeground } from "..";
import DuploCloudIcon from "../svg/DuploCloudIcon";

interface DuploToolStatusDisplayProps {
  status: {
    text: string;
    state: DuploToolState;
  };
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <div
        className="h-1 w-1 animate-ping rounded-full"
        style={{ animationDelay: "0ms", backgroundColor: vscForeground }}
      />
      <div
        className="h-1 w-1 animate-ping rounded-full"
        style={{ animationDelay: "100ms", backgroundColor: vscForeground }}
      />
      <div
        className="h-1 w-1 animate-ping rounded-full"
        style={{ animationDelay: "200ms", backgroundColor: vscForeground }}
      />
    </div>
  );
}

export function DuploToolStatusDisplay({
  status,
}: DuploToolStatusDisplayProps) {
  const getStatusIcon = () => {
    switch (status.state) {
      case DuploToolState.PENDING:
        return <LoadingDots />;
      case DuploToolState.SUCCESS:
        return (
          <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
        );
      case DuploToolState.FAILED:
        return <XCircleIcon className="h-5 w-5 flex-shrink-0 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-2 px-0 pb-0 pt-0">
      {/* DuploCloud Icon */}
      <div className="flex-shrink-0 pt-1">
        <DuploCloudIcon width={18} height={18} />
      </div>

      {/* Text Display */}
      <div className="flex-grow-1 min-w-0">
        <div className="mt-n50 truncate text-xs">
          {status.text || "Processing"}
        </div>
      </div>

      {/* Status Icon */}
      <div className="flex-shrink-0 pt-1">{getStatusIcon()}</div>
    </div>
  );
}
