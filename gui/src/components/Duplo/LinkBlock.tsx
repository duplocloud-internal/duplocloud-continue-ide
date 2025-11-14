import { LinkIcon } from "@heroicons/react/24/outline";
import { URlBox } from "core/duplocloud/ai.model";

export const LinkBlock = ({ urlList }: { urlList: URlBox[] }) => {
  return Array.isArray(urlList) && urlList?.length ? (
    <div className="mb-1">
      {urlList?.map((url) => (
        <div key={url.uid} className="mb-1">
          <a className="flex items-start" href={url.url}>
            <LinkIcon className="mr-2 h-4 w-4" />
            {url?.description || url.url}
          </a>
        </div>
      ))}
    </div>
  ) : null;
};
