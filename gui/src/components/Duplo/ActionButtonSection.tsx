import { CommandSelectionType } from "core/duplocloud/ai.model";
import { Button, GhostButton } from "..";

const ActionButtonSection = ({
  selectionType,
  isDisabled,
  onSelectionChange,
}: {
  selectionType: CommandSelectionType | undefined;
  isDisabled: boolean;
  onSelectionChange: (newState: CommandSelectionType) => void;
}) => {
  return (
    <div className="flex items-center gap-2 px-4">
      {selectionType === CommandSelectionType.APPROVED ? (
        <Button
          disabled={isDisabled}
          onClick={() => onSelectionChange(CommandSelectionType.APPROVED)}
        >
          Approve
        </Button>
      ) : (
        <GhostButton
          disabled={isDisabled}
          onClick={() => onSelectionChange(CommandSelectionType.APPROVED)}
        >
          Approve
        </GhostButton>
      )}

      {selectionType === CommandSelectionType.REJECTED ? (
        <Button
          disabled={isDisabled}
          onClick={() => onSelectionChange(CommandSelectionType.REJECTED)}
        >
          Reject
        </Button>
      ) : (
        <GhostButton
          disabled={isDisabled}
          onClick={() => onSelectionChange(CommandSelectionType.REJECTED)}
        >
          Reject
        </GhostButton>
      )}

      {selectionType === CommandSelectionType.IGNORED ? (
        <Button
          disabled={isDisabled}
          onClick={() => onSelectionChange(CommandSelectionType.IGNORED)}
        >
          Ignore
        </Button>
      ) : (
        <GhostButton
          disabled={isDisabled}
          onClick={() => onSelectionChange(CommandSelectionType.IGNORED)}
        >
          Ignore
        </GhostButton>
      )}
    </div>
  );
};

export default ActionButtonSection;
