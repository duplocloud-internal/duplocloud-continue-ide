import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { SecondaryButton } from "..";
import { setDialogMessage, setShowDialog } from "../../redux/slices/uiSlice";
import { Card } from "../ui";

function ContextUpdatedDialog({
  isUpdateContext,
  isAutoClose = false,
}: {
  isUpdateContext: boolean;
  isAutoClose?: boolean;
}) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (isAutoClose) {
      setTimeout(() => {
        dispatch(setShowDialog(false));
        dispatch(setDialogMessage(undefined));
      }, 5000);
    }
  }, [isAutoClose]);

  const onClose = () => {
    dispatch(setShowDialog(false));
    dispatch(setDialogMessage(undefined));
  };

  return (
    <div className="p-4 pt-0">
      <h1 className="mb-4 text-xl">
        Context {isUpdateContext ? "Updated" : "Created"}
      </h1>

      <Card>
        <p className="text-base" style={{ whiteSpace: "pre-wrap" }}>
          DuploCloud context has been {isUpdateContext ? "updated" : "created"}{" "}
          successfully.
        </p>
      </Card>

      <div className="mt-4 flex gap-2">
        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
      </div>
    </div>
  );
}

export default ContextUpdatedDialog;
