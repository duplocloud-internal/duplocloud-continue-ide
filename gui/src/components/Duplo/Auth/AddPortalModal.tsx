import {
  DuploPortalCredentials,
  DuploUserInfo,
} from "core/duplocloud/ai.model";
import React, { useContext, useEffect, useState } from "react";
import { Button, SecondaryButton, vscCommandCenterInactiveBorder } from "../..";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
import { saveDuploCredential } from "../../../util/duploCredentials";
import Spinner from "../../gui/Spinner";
import { PortalStatus } from "./PortalAuthStatus";

interface AddPortalModalProps {
  isOpen: boolean;
  portal?: string;
  isUpdate?: boolean;
  onAdd: (portalStatus: PortalStatus) => void;
  onClose: () => void;
}

export const AddPortalModal: React.FC<AddPortalModalProps> = ({
  isOpen,
  portal = "",
  isUpdate = false,
  onAdd = () => {},
  onClose = () => {},
}) => {
  const ideMessenger = useContext(IdeMessengerContext);
  const [portalUrl, setPortalUrl] = useState(isUpdate ? portal : "");
  const [token, setToken] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoginWaiting, setIsLoginWaiting] = useState(false);

  useEffect(() => {
    if (isUpdate) {
      setPortalUrl(portal);
    }
  }, [isUpdate, portal]);

  const validatePortalUrl = (url: string): string | null => {
    if (!url.trim()) {
      return "Portal URL is required";
    }

    const originUrl = DuploPortalCredentials.getOriginFromUrl(url.trim());
    if (!originUrl) {
      return "Invalid portal URL format. Expected: https://domain.duplocloud.net";
    }

    return null;
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    // Validate portal URL
    const urlError = validatePortalUrl(portalUrl);
    if (urlError) {
      newErrors.portalUrl = urlError;
    }

    // Token is optional, no validation needed
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const originUrl = DuploPortalCredentials.getOriginFromUrl(portalUrl.trim());
    if (!originUrl) return;

    if (!token) {
      await saveDuploCredential(ideMessenger, originUrl, "");
      onAdd({
        portal: originUrl,
        authToken: "",
        isLoading: false,
        isAuthenticated: false,
      });

      resetForm();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await ideMessenger.request("duplo/getUserRoleByPortal", {
        portalURL: originUrl,
        authToken: token,
      });
      if (result.status === "success" && result.content.success) {
        // Save credential with user info
        const userInfo = result.content.body as DuploUserInfo;
        await saveDuploCredential(ideMessenger, originUrl, token, userInfo);
        onAdd({
          portal: originUrl,
          authToken: token,
          isLoading: false,
          isAuthenticated: true,
          userInfo,
        });

        // Clear form and notify success
        resetForm();
        onClose();
      } else {
        // Display validation error
        const errorMsg =
          result.status === "error"
            ? result.error
            : result.content.body || "Invalid token";
        setErrors({ submit: errorMsg });
      }
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error ? error.message : "Failed to validate token",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle DuploCloud login using
  const handleDuploCloudLogin = async () => {
    try {
      const newErrors: Record<string, string> = {};

      // Validate portal URL
      const urlError = validatePortalUrl(portalUrl);
      if (urlError) {
        newErrors.portalUrl = urlError;
      }

      // Token is optional, no validation needed
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      const originUrl = DuploPortalCredentials.getOriginFromUrl(
        portalUrl.trim(),
      );
      // Set loading state
      setIsLoginWaiting(true);
      // Call IDE to initiate login
      const result = await ideMessenger.request("duplo/initiatePortalLogin", {
        portal: originUrl,
      });

      if (result.status === "success" && result.content.success) {
        onAdd({
          portal: originUrl,
          authToken: result.content.token,
          isLoading: false,
          isAuthenticated: true,
        });

        // Clear form and notify success
        resetForm();
        onClose();
      } else {
        // Display validation error
        const errorMsg =
          result.status === "error"
            ? result.error
            : result.content.error || "Invalid token";
        setErrors({ submit: errorMsg });
      }
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error ? error.message : "Failed to validate token",
      });
    } finally {
      setIsLoginWaiting(false);
    }
  };

  const resetForm = () => {
    setPortalUrl("");
    setToken("");
    setErrors({});
    setIsLoginWaiting(false);
    setIsSubmitting(false);
  };

  const handlePortalUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPortalUrl(e.target.value);
    if (errors.portalUrl) {
      setErrors({ ...errors, portalUrl: "" });
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value);
    if (errors.token) {
      setErrors({ ...errors, token: "" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="outline-command-border fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 outline">
      <div
        style={{ border: `1px solid ${vscCommandCenterInactiveBorder}` }}
        className="border-description bg-background w-full max-w-md rounded-lg border px-4 py-2 text-left shadow-lg"
      >
        <h4 className="text-foreground mb-0 text-lg font-semibold">
          {isUpdate ? "Update Credentials" : "Add DuploCloud Portal"}
        </h4>
        <p className="text-description mb-4 text-sm">
          {isUpdate
            ? "Update the authentication token for this portal"
            : "Add a new DuploCloud portal to your configuration"}
        </p>
        {/* Portal URL Input */}
        <div className="d-block mb-3 w-full text-left">
          <label className="text-description mb-1 block text-xs font-medium">
            Portal URL <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={portalUrl}
            onChange={handlePortalUrlChange}
            placeholder="https://domain.duplocloud.net"
            disabled={isSubmitting || isUpdate}
            className="border-description bg-input text-foreground placeholder-description focus:border-primary box-border w-[inherit] rounded border px-3 py-2 text-sm focus:outline-none"
          />
          {errors.portalUrl && (
            <p className="mt-1 text-xs text-red-500">{errors.portalUrl}</p>
          )}
        </div>
        {isLoginWaiting ? (
          <div className="py-2 pl-4 text-left">
            <Spinner />
          </div>
        ) : (
          <Button
            onClick={handleDuploCloudLogin}
            disabled={isSubmitting || !portalUrl.trim()}
            className="flex-1 px-4"
          >
            Login to DuploCloud
          </Button>
        )}
        <h5 className="my-2">OR</h5>
        {/* Token Input (Optional) */}
        <div className="d-block mb-3 w-full text-left">
          <label className="text-description mb-1 mr-auto block text-xs font-medium">
            Use Auth Token <span className="text-description">(optional)</span>
          </label>
          <input
            type="text"
            value={token}
            onChange={handleTokenChange}
            placeholder="Paste your authentication token (optional)"
            disabled={isSubmitting}
            className="border-description bg-input text-foreground placeholder-description focus:border-primary box-border w-[inherit] rounded border px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        {/* Submit Error */}
        {errors.submit && (
          <div className="mb-4 rounded bg-red-500 bg-opacity-10 p-2 text-sm text-red-500">
            {errors.submit}
          </div>
        )}
        {/* Buttons */}
        <div className="flex justify-start gap-2">
          <SecondaryButton
            onClick={() => {
              setPortalUrl("");
              setToken("");
              setErrors({});
              onClose();
            }}
            className="w-1/2"
          >
            Cancel
          </SecondaryButton>
          {isSubmitting ? (
            <div className="w-1/2 pt-4 text-center">
              <Spinner />
            </div>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !portalUrl.trim()}
              className="w-1/2"
            >
              Add Portal
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
