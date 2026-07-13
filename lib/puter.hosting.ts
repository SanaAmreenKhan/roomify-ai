import puter from "@heyputer/puter.js";
import {
  createHostingSlug,
  fetchBlobFromUrl,
  getHostedUrl,
  getImageExtension,
  HOSTING_CONFIG_KEY,
  imageUrlToPngBlob,
  isHostedUrl,
} from "./utils";
export const getOrCreateHostingConfig =
    async (): Promise<HostingConfig | null> => {
      const existing = (await puter.kv.get(
          HOSTING_CONFIG_KEY,
      )) as HostingConfig | null;

      console.log("Existing hosting:", existing);

      if (existing?.subdomain) return existing;

      const subdomain = createHostingSlug();

      console.log("Creating hosting:", subdomain);

      try {
        const created = await puter.hosting.create(subdomain, ".");

        console.log("Hosting created response:", created);

        const record = {
          subdomain: created.subdomain,
        };

        await puter.kv.set(HOSTING_CONFIG_KEY, record);

        return record;
      } catch (e) {
        console.error("Hosting create failed:", e);
        return null;
      }
    };

export const uploadImageToHosting = async ({
  hosting,
  url,
  projectId,
  label,
}: StoreHostedImageParams): Promise<HostedAsset | null> => {
  if (!hosting || !url) return null;

  if (isHostedUrl(url)) return { url };
  try {
    const resolved =
      label === "rendered"
        ? await imageUrlToPngBlob(url).then((blob) =>
            blob ? { blob, contentType: "image/png" } : null,
          )
        : await fetchBlobFromUrl(url);

    if (!resolved) return null;

    const contentType = resolved.contentType || resolved.blob.type || "";
    const ext = getImageExtension(contentType, url);
    const dir = `projects/${projectId}`;
    const filePath = `${dir}/${label}.${ext}`;

    const uploadFile = new File([resolved.blob], `${label}.${ext}`, {
      type: contentType,
    });
    await puter.fs.mkdir(dir, { createMissingParents: true });
    await puter.fs.write(filePath, uploadFile);
    // File uploaded successfully.
    try {
      await puter.fs.stat(filePath);
    } catch (e) {
      console.warn("Stat failed after upload (non-critical):", e);
    }

    const hostedUrl = getHostedUrl({ subdomain: hosting.subdomain }, filePath);
    return hostedUrl ? { url: hostedUrl } : null;
  } catch (e) {
    console.warn(`couldn't find hosting url: ${e}`);
    return null;
  }
};
