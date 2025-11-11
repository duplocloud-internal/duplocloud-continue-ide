import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setDialogMessage, setShowDialog } from "../redux/slices/uiSlice";
import { DuploContextDialog } from "./dialogs/DuploContextDialog";

export const ListenComponentEvents: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const message = event.data;
      const messageType = message.messageType;
      const messageId = message.messageId;
      if (messageType === "tools-duplo/setDuploContext") {
        dispatch(
          setDialogMessage(
            <DuploContextDialog sendToIDE={true} eventId={messageId} />,
          ),
        );
        dispatch(setShowDialog(true));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return <></>;
};

export default ListenComponentEvents;
