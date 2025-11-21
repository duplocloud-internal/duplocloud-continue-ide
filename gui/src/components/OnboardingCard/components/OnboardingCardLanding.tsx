import { useContext, useRef } from "react";
import { Button } from "../..";
import { useAuth } from "../../../context/Auth";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { selectCurrentOrg } from "../../../redux/slices/profilesSlice";
import { selectFirstHubProfile } from "../../../redux/thunks/selectFirstHubProfile";
import {
  PortalAuthStatus,
  PortalAuthStatusHandle,
} from "../../Duplo/Auth/PortalAuthStatus";
import DuploCloudLogo from "../../svg/DuploCloudLogo";
import { useOnboardingCard } from "../hooks/useOnboardingCard";

export function OnboardingCardLanding({
  onSelectConfigure,
  isDialog,
}: {
  onSelectConfigure: () => void;
  isDialog?: boolean;
}) {
  const ideMessenger = useContext(IdeMessengerContext);
  const portalAuthRef = useRef<PortalAuthStatusHandle>(null);

  const onboardingCard = useOnboardingCard();
  const auth = useAuth();
  const currentOrg = useAppSelector(selectCurrentOrg);
  const dispatch = useAppDispatch();

  function onGetStarted() {
    void auth.login(true).then((success) => {
      if (success) {
        onboardingCard.close(isDialog);

        // A new assistant is created when the account is created
        // We want to switch to this immediately
        void dispatch(selectFirstHubProfile());

        ideMessenger.post("showTutorial", undefined);
        ideMessenger.post("showToast", ["info", "🎉 Welcome to Continue!"]);
      }
    });
  }

  function openBillingPage() {
    ideMessenger.post("controlPlane/openUrl", {
      path: "settings/billing",
      orgSlug: currentOrg?.slug,
    });
    onboardingCard.close(isDialog);
  }

  function openApiKeysPage() {
    ideMessenger.post("controlPlane/openUrl", {
      path: "setup-models/api-keys",
      orgSlug: currentOrg?.slug,
    });
    onboardingCard.close(isDialog);
  }

  // const { creditStatus, outOfStarterCredits } = useCreditStatus();

  return (
    <div className="xs:px-0 flex w-full max-w-full flex-col items-center justify-center px-4 text-center">
      <div className="xs:flex hidden">
        <DuploCloudLogo height={75} />
      </div>

      {/* {outOfStarterCredits ? (
        <>
          <p className="xs:w-3/4 w-full text-sm">
            You've used all your starter credits! Click below to purchase
            credits or configure API keys
          </p>
          <SecondaryButton
            onClick={openApiKeysPage}
            className="mt-4 grid w-full grid-flow-col items-center gap-2"
          >
            Set up API keys
          </SecondaryButton>
          <Button
            onClick={openBillingPage}
            className="mt-4 grid w-full grid-flow-col items-center gap-2"
          >
            Purchase credits
          </Button>
        </>
      ) : (
        <>
          <p className="mb-5 mt-0 w-full text-sm">
            Log in to get up and running with starter credits
          </p>

          <Button
            onClick={onGetStarted}
            className="mt-4 grid w-full grid-flow-col items-center gap-2"
          >
            Log in to DuploCloud
          </Button>
        </>
      )} */}

      <PortalAuthStatus ref={portalAuthRef} />

      <div className="flex w-full items-center justify-center gap-2">
        <Button
          onClick={() => portalAuthRef.current?.handleAddPortal()}
          className="flex-1"
        >
          Add Portal
        </Button>
        <Button onClick={onSelectConfigure} className="flex-1">
          Configure models
        </Button>
      </div>
    </div>
  );
}
