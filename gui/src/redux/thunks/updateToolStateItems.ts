import { createAsyncThunk } from "@reduxjs/toolkit";
import { updateToolStateItems as updateToolStateItemsAction } from "../slices/sessionSlice";
import { ThunkApiType } from "../store";
import { saveCurrentSession } from "./session";

/**
 * Updates tool state items and persists to storage.
 * This is a thunk wrapper that combines the Redux action with session save.
 */
export const updateToolStateItemsWithSave = createAsyncThunk<
  void,
  {
    toolCallId: string;
    stateItems: any;
  },
  ThunkApiType
>(
  "session/updateToolStateItemsWithSave",
  async ({ toolCallId, stateItems }, { dispatch, getState }) => {
    // 1. Update Redux state immediately
    dispatch(updateToolStateItemsAction({ toolCallId, stateItems }));

    // 2. Save to disk
    // Using openNewSession: false and generateTitle: false to avoid side effects
    await dispatch(
      saveCurrentSession({
        openNewSession: false,
        generateTitle: false,
      }),
    );
  },
);
