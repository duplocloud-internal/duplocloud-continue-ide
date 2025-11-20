import { TrashIcon } from "@heroicons/react/24/outline";
import {
  DuploPortalCredentials,
  DuploUserInfo,
} from "core/duplocloud/ai.model";
import React, { useContext, useEffect, useState } from "react";
import { Button, GhostButton } from "../..";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
import { useAppDispatch } from "../../../redux/hooks";
import {
  removePortalAuthStatus,
  setPortalAuthStatuses,
  updatePortalAuthStatus,
} from "../../../redux/slices/sessionSlice";
import {
  deleteDuploCredential,
  getAllPortalAuthStatus,
  saveDuploCredential,
} from "../../../util/duploCredentials";
import Spinner from "../../gui/Spinner";
import { AddPortalModal } from "./AddPortalModal";

export interface PortalStatus extends Partial<DuploPortalCredentials> {
  portal: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
  authToken?: string;
  userInfo?: DuploUserInfo;
}

export const PortalAuthStatus: React.FC = () => {
  const ideMessenger = useContext(IdeMessengerContext);
  const dispatch = useAppDispatch();

  // Local state for loading/UI states
  const [portalStatuses, setPortalStatuses] = useState<
    Record<string, PortalStatus>
  >({});
  const [isAddPortalModalOpen, setIsAddPortalModalOpen] = useState(false);
  const [selPortal, setSelPortal] = useState<string>("");

  // Initialize portal statuses (SECURE - only checks authentication status, not tokens)
  useEffect(() => {
    const initializeStatuses = async () => {
      // Set loading state
      const loadingStatuses: Record<string, PortalStatus> = {};
      setPortalStatuses(loadingStatuses);

      // Get auth statuses from extension (secrets never exposed to GUI)
      const authStatuses = (await getAllPortalAuthStatus(ideMessenger)) || {};

      // Update statuses
      const updatedStatuses: Record<string, PortalStatus> = {};

      await Promise.all(
        Object.entries(authStatuses).map(async ([portal, status]) => {
          if (status.authToken) {
            const result = await ideMessenger.request(
              "duplo/getUserRoleByPortal",
              {
                portalURL: portal,
                authToken: status.authToken,
              },
            );
            const isAuthenticated =
              result.status === "success" && result.content.success;

            if (isAuthenticated) {
              const userRole = result.content.body;
              saveDuploCredential(
                ideMessenger,
                portal,
                status.authToken,
                userRole,
              );
            }

            updatedStatuses[portal] = {
              isAuthenticated,
              portal,
              domain: DuploPortalCredentials.getDomainFromUrl(portal),
              isLoading: false,
            };
          } else {
            updatedStatuses[portal] = {
              portal,
              domain: DuploPortalCredentials.getDomainFromUrl(portal),
              isAuthenticated: false,
              isLoading: false,
            };
          }
        }),
      );
      setPortalStatuses(updatedStatuses);

      // Cache in Redux for zero-wait access in other components
      dispatch(
        setPortalAuthStatuses(
          Object.entries(updatedStatuses).reduce(
            (acc, [portal, status]) => ({
              ...acc,
              [portal]: status.isAuthenticated,
            }),
            {},
          ),
        ),
      );
    };

    initializeStatuses();
  }, [ideMessenger, dispatch]);

  const handleAddPortalSuccess = (portalStatus: PortalStatus) => {
    // Update local state
    setPortalStatuses((prev) => ({
      ...prev,
      [portalStatus.portal]: {
        ...portalStatus,
        domain: DuploPortalCredentials.getDomainFromUrl(portalStatus.portal),
        isLoading: false,
      },
    }));

    // Update Redux cache
    dispatch(
      updatePortalAuthStatus({
        portal: portalStatus.portal,
        status: true,
      }),
    );

    // Close modal
    setIsAddPortalModalOpen(false);
  };

  const handleDeletePortal = async (portal: string) => {
    // Delete from SecretStorage
    await deleteDuploCredential(ideMessenger, portal);

    // Update local state
    setPortalStatuses((prev) => {
      const newStatuses = { ...prev };
      delete newStatuses[portal];
      return newStatuses;
    });

    // Remove from Redux cache
    dispatch(removePortalAuthStatus(portal));
  };

  const handleAddPortal = () => {
    setSelPortal("");
    setIsAddPortalModalOpen(true);
  };

  const handleUpdatePortal = (portal: string) => {
    setSelPortal(portal);
    setIsAddPortalModalOpen(true);
  };

  return (
    <div className="flex w-full flex-col">
      <div className="m-auto flex flex-col">
        {Object.entries(portalStatuses).map(([portalUrl, portalStatus]) => {
          if (!portalStatus) return null;

          return (
            <div
              key={portalUrl}
              className="border-description rounded border p-1"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  {portalStatus.isLoading ? (
                    <Spinner />
                  ) : portalStatus.isAuthenticated ? (
                    <span className="text-lg text-green-500">✓</span>
                  ) : (
                    <span className="text-lg text-yellow-500">⚠</span>
                  )}
                  <span className="text-foreground text-sm font-medium">
                    {portalStatus.domain || portalStatus.portal}
                  </span>
                </div>

                {!portalStatus.isAuthenticated && !portalStatus.isLoading ? (
                  <GhostButton
                    onClick={() => handleUpdatePortal(portalUrl)}
                    className="text-description mb-1 ml-1 text-xs"
                  >
                    Login Required
                  </GhostButton>
                ) : null}

                <TrashIcon
                  className="mb-1.5 h-4 w-4 cursor-pointer"
                  onClick={() => handleDeletePortal(portalUrl)}
                />
              </div>
            </div>
          );
        })}

        {/* Button to add new portal */}
      </div>
      <Button onClick={handleAddPortal} className="flex-1">
        Add Portal
      </Button>

      <AddPortalModal
        portal={selPortal || ""}
        isUpdate={selPortal?.length > 0}
        isOpen={isAddPortalModalOpen}
        onAdd={handleAddPortalSuccess}
        onClose={() => setIsAddPortalModalOpen(false)}
      />
    </div>
  );
};
