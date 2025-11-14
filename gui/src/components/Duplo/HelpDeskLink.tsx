import { useMemo } from "react";
import { useAppSelector } from "../../redux/hooks";

export const HelpDeskLink = () => {
  const duploContext = useAppSelector((s) => s.session.duploContext);

  const sessionId = useAppSelector((store) => store.session.id);

  const helpDeskLink: string = useMemo(() => {
    if (!duploContext?.portal || !duploContext?.tenant?.tenantId || !sessionId)
      return "";

    return `${duploContext.portal}/app/ai/service-desk/${duploContext.tenant.tenantId}/tickets/chat/${sessionId}`;
  }, [duploContext, sessionId]);

  return helpDeskLink ? (
    <a className="text-sm no-underline" href={helpDeskLink}>
      Open AI HelpDesk
    </a>
  ) : null;
};
