import React, { useEffect } from "react";
import { useAppDispatch } from "../redux/hooks";
import { setDialogMessage, setShowDialog } from "../redux/slices/uiSlice";
import { updateToolStateItemsWithSave } from "../redux/thunks/updateToolStateItems";
import { DuploContextDialog } from "./dialogs/DuploContextDialog";

export const ListenComponentEvents: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const message = event.data;
      const messageType = message.messageType;
      const messageId = message.messageId;
      const data = message.data;

      if (messageType === "tools-duplo/setDuploContext") {
        dispatch(
          setDialogMessage(
            <DuploContextDialog sendToIDE={true} eventId={messageId} />,
          ),
        );
        dispatch(setShowDialog(true));
      }

      if (messageType === "tools-duplo/updateStateItems") {
        void dispatch(
          updateToolStateItemsWithSave({
            toolCallId: data.toolCallId,
            stateItems: data.stateItems,
          }),
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return <></>;
};

export default ListenComponentEvents;
