import {
  DuploContext,
  DuploPortal,
  TenantsWithAgents,
  TicketAgent,
} from "core/duplocloud/ai.model";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Button, SecondaryButton } from "..";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { ConfigHeader } from "../../pages/config/components/ConfigHeader";
import { UserSetting } from "../../pages/config/components/UserSetting";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { setDialogMessage, setShowDialog } from "../../redux/slices/uiSlice";
import { saveDuploContextSettings } from "../../redux/thunks/session";
import Spinner from "../gui/Spinner";
import { Card } from "../ui";

export const DuploContextDialog: React.FC = () => {
  const dispatch = useAppDispatch();
  const ideMessenger = useContext(IdeMessengerContext);
  const isDialogOpen = useAppSelector((s) => s.ui.showDialog);
  const duploContext = useAppSelector((s) => s.session.duploContext);

  const sessionId = useAppSelector((store) => store.session.id);
  const sesTitle = useAppSelector((s) => s.session.title);

  const duploList = useAppSelector<DuploPortal[]>(
    (s) => (s.config?.config?.ui as any)?.duplo || [],
  );

  const [portal, setPortal] = useState<string>(duploContext?.portal ?? "");
  const [tenant, setTenant] = useState<TenantsWithAgents | undefined>(
    duploContext?.tenant || undefined,
  );
  const [agent, setAgent] = useState<TicketAgent | undefined>(
    duploContext?.agent || undefined,
  );
  const [isLoading, setIsLoading] = useState(false);

  const [tenantsErrorByPortal, setTenantsErrorByPortal] = useState<
    Record<string, string | null>
  >({});
  const [tenantsByPortal, setTenantsByPortal] = useState<
    Record<string, TenantsWithAgents[]>
  >({});

  // Ensure the select preselects the current session's portal when the saved value changes
  useEffect(() => {
    if (duploContext?.portal && portal !== duploContext.portal) {
      setPortal(duploContext.portal);
    }
  }, [duploContext?.portal]);

  // On every open: fetch tenants for each portal via Core proxy and log results
  useEffect(() => {
    if (!isDialogOpen) return;

    const setPortalMap = async () => {
      const list = duploList || [];

      console.log(
        "[CloudSettings] starting tenants fetch for portals: ",
        list.map((d) => d.portal),
      );

      const portalTenantsMap: Record<string, TenantsWithAgents[]> = {};
      setIsLoading(true);
      for (const d of list) {
        if (!d?.portal) continue;
        try {
          const configPortals = await ideMessenger.request(
            "duplo/getPortalTenants",
            {
              portal: d.portal,
              token: d.token,
            },
          );
          console.log(
            "[CloudSettings] tenants fetch configPortals:",
            configPortals,
          );

          if (configPortals.status !== "success") {
            setTenantsErrorByPortal((prev) => ({
              ...prev,
              [d.portal]: configPortals.error,
            }));
            portalTenantsMap[d.portal] = [];
            continue;
          }

          const { success, body } = configPortals.content;

          if (!success) {
            setTenantsErrorByPortal((prev) => ({
              ...prev,
              [d.portal]: body,
            }));
            portalTenantsMap[d.portal] = [];
            continue;
          }

          const tenants = Array.isArray(body)
            ? body.filter((t) => t.agentInstances?.length)
            : [];

          console.log("[CloudSettings] tenants fetch tenants:", tenants);
          portalTenantsMap[d.portal] = tenants;
        } catch (e) {
          console.warn("[CloudSettings] GET via core proxy failed", portal, e);

          setTenantsErrorByPortal((prev) => ({
            ...prev,
            [d.portal]: (e as Error)?.message || String(e),
          }));
          // Ensure tenants list for this portal is empty when failing
          portalTenantsMap[d.portal] = [];
        }
      }

      console.log(
        "[CloudSettings] tenants fetch portalTenantsMap:",
        portalTenantsMap,
      );
      setTenantsByPortal((prev) => ({ ...prev, ...portalTenantsMap }));
      if (!duploContext?.portal && list.length === 1) {
        onPortalChange(list[0].portal);
      }

      setIsLoading(false);
    };

    setPortalMap().catch((e) =>
      console.error("[CloudSettings] tenants fetch failed", e),
    );
  }, [isDialogOpen, ideMessenger]);

  useEffect(() => {
    if (duploContext?.tenant?.tenantId) {
      onTenantChange(duploContext?.tenant?.tenantId, true);
    }
  }, [tenantsByPortal]);

  const onCloseDialog = useCallback(() => {
    dispatch(setShowDialog(false));

    dispatch(setDialogMessage(undefined));
  }, [dispatch]);

  const onSaveTicket = useCallback(async () => {
    try {
      const authToken = duploList.find((d) => d.portal === portal)?.token;

      if (!agent?.instanceId) {
        throw new Error("Agent is not selected");
      }

      if (!tenant?.tenantId) {
        throw new Error("Tenant is not selected");
      }

      setIsLoading(true);
      const result = await ideMessenger.request("duplo/createAiTicket", {
        portalUrl: portal,
        authToken: authToken,
        tenantId: tenant?.tenantId || "",
        assignee: agent,
        userText: sesTitle,
        sessionId: sessionId,
      });

      if (result.status === "success" && result.content.success) {
        onCloseDialog();

        const duploContext: DuploContext = {
          portal,
          tenant: {
            tenantId: tenant.tenantId,
            tenantName: tenant.tenantName,
          },
          agent: agent,
        };
        await dispatch(saveDuploContextSettings({ duploContext }));
      }
    } catch (e) {
      console.error("[CloudSettings] Error saving ticket", e);
    }

    setIsLoading(false);
  }, [portal, tenant, agent]);

  const onPortalChange = (value: string) => {
    if (value !== portal) {
      setPortal(value);
      setTenant(undefined);
      setAgent(undefined);
    }
  };

  const tenantOptions = useMemo(
    () =>
      tenantsByPortal?.[portal]?.map((t) => ({
        label: t.tenantName,
        value: t.tenantId,
      })) || [],
    [portal, tenantsByPortal],
  );

  const onTenantChange = (value: string, avoidAgentReset?: boolean) => {
    const tenant = tenantsByPortal?.[portal]?.find((t) => t.tenantId === value);
    setTenant(tenant);
    if (!avoidAgentReset) {
      setAgent(undefined);
    }
  };

  const agentOptions = useMemo(
    () =>
      tenant?.agentInstances?.map((a) => ({
        label: a.friendlyName || a.agentName,
        value: a.instanceId,
      })) || [],
    [tenant],
  );

  const onAgentChange = (value: string) => {
    const agent = tenant?.agentInstances?.find((a) => a.instanceId === value);
    setAgent(agent);
  };

  return (
    <div className="p-4">
      <ConfigHeader title="Set Context" />
      <Card>
        <div className="flex flex-col gap-4">
          <UserSetting
            stacked
            type="select"
            title="DuploCloud Portal"
            description="Select a portal from your config."
            value={portal}
            onChange={onPortalChange}
            options={(duploList || []).map((d) => ({
              label: d.portal,
              value: d.portal,
            }))}
          />

          <UserSetting
            stacked
            type="select"
            title="Tenant"
            description="Select a tenant for the chosen portal."
            placeholder="Select a tenant"
            value={tenant?.tenantId || ""}
            onChange={onTenantChange}
            options={tenantOptions}
          />
          {tenantsErrorByPortal[portal] ? (
            <div className="text-sm text-red-500">
              Failed to load tenants for this portal:{" "}
              {tenantsErrorByPortal[portal]}
            </div>
          ) : null}

          <UserSetting
            stacked
            type="select"
            title="Agent"
            description="Select an agent for the chosen tenant."
            placeholder="Select an agent"
            options={agentOptions}
            value={agent?.instanceId || ""}
            onChange={onAgentChange}
          />
        </div>
      </Card>
      <div className="mt-4 flex gap-2">
        <SecondaryButton onClick={onCloseDialog}>Cancel</SecondaryButton>
        {isLoading ? (
          <div className="mt-3">
            <Spinner />
          </div>
        ) : (
          <Button
            onClick={onSaveTicket}
            disabled={!portal || !tenant?.tenantId || !agent?.instanceId}
          >
            Save
          </Button>
        )}
      </div>
    </div>
  );
};
