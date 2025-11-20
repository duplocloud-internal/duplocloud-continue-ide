import {
  DuploPortalCredentials,
  DuploUserInfo,
} from "core/duplocloud/ai.model";
import { IIdeMessenger } from "../context/IdeMessenger";

/**
 * Get authentication status for all portals (SECURE - returns status only, not tokens)
 */
export async function getAllPortalAuthStatus(
  ideMessenger: IIdeMessenger,
): Promise<Record<string, DuploPortalCredentials>> {
  try {
    const result = await ideMessenger.request(
      "duplo/getAllPortalAuthStatus",
      undefined,
    );

    if (result.status === "error") {
      console.error("Failed to get all portal auth status:", result.error);
      return {};
    }

    return result.content;
  } catch (error) {
    console.error("Failed to get all portal auth status:", error);
    return {};
  }
}

/**
 * Get authentication status for multiple portals (SECURE - returns status only, not tokens)
 */
export async function getPortalAuthStatuses(
  ideMessenger: IIdeMessenger,
  portals: string[],
): Promise<DuploPortalCredentials[]> {
  try {
    const result = await ideMessenger.request("duplo/getPortalAuthStatus", {
      portals,
    });

    if (result.status === "error") {
      console.error("Failed to get portal auth status:", result.error);
      return portals.map(
        (p) =>
          new DuploPortalCredentials({ portal: p, isAuthenticated: false }),
      );
    }

    return result.content;
  } catch (error) {
    console.error("Failed to get portal auth status:", error);
    return portals.map(
      (p) => new DuploPortalCredentials({ portal: p, isAuthenticated: false }),
    );
  }
}

/**
 * Save portal credentials (SECURE - token stays in extension, never exposed to GUI)
 */
export async function saveDuploCredential(
  ideMessenger: IIdeMessenger,
  portal: string,
  authToken: string,
  userInfo?: DuploUserInfo,
): Promise<void> {
  try {
    const result = await ideMessenger.request("duplo/savePortalCredentials", {
      portal,
      authToken,
      userInfo,
    });

    if (result.status === "error") {
      throw new Error(result.error || "Failed to save credentials");
    }
  } catch (error) {
    console.error("Failed to save Duplo credential:", error);
    throw error;
  }
}

/**
 * Get portal token (ONLY use when absolutely necessary for API calls)
 * WARNING: This exposes the token to GUI - use sparingly!
 */
export async function getDuploToken(
  ideMessenger: IIdeMessenger,
  portal: string,
): Promise<string | null> {
  try {
    const result = await ideMessenger.request("duplo/getPortalToken", {
      portal,
    });

    if (result.status === "error") {
      console.error("Failed to get portal token:", result.error);
      return null;
    }

    return result.content;
  } catch (error) {
    console.error("Failed to get portal token:", error);
    return null;
  }
}

/**
 * Delete a portal credential from secure storage
 */
export async function deleteDuploCredential(
  ideMessenger: IIdeMessenger,
  portal: string,
): Promise<void> {
  try {
    const result = await ideMessenger.request("duplo/deletePortalCredentials", {
      portal,
    });

    if (result.status === "error") {
      throw new Error(result.error || "Failed to delete credentials");
    }
  } catch (error) {
    console.error("Failed to delete Duplo credential:", error);
    throw error;
  }
}
