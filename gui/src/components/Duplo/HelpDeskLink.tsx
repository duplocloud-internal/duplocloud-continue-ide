import { DuploContext } from "core/duplocloud/ai.model";
import { useMemo } from "react";
import { useAppSelector } from "../../redux/hooks";

export const HelpDeskLink = ({
  context,
  children,
}: {
  context?: DuploContext;
  children?: React.ReactNode;
}) => {
  const sessionId = useAppSelector((store) => store.session.id);
  const helpDeskLink: string = useMemo(() => {
    if (!context?.portal || !context?.tenant?.tenantId || !sessionId) return "";

    return `${context.portal}/app/ai/service-desk/${context.tenant.tenantId}/tickets/chat/${sessionId}`;
  }, [context, sessionId]);

  return helpDeskLink ? (
    <a className="text-sm no-underline" href={helpDeskLink}>
      {children || "Open AI HelpDesk"}
    </a>
  ) : null;
};
