/**
 * Client-side helper for the backend's filesystem upload endpoints
 * (`POST /uploads`, `POST /uploads/base64`). Kept separate from `apiFetch` in
 * `client.ts` because multipart bodies must not be JSON-stringified or given
 * a `Content-Type: application/json` header.
 */
import { API_BASE_URL, ApiError, extractErrorMessage, getStoredAccessToken } from "./client";

// matches the backend/Cloudinary cap — keep in sync if that ever changes
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const IMAGE_TOO_LARGE_MESSAGE = "حجم الصورة يجب ألا يتجاوز 10 ميجابايت";

export const UPLOAD_FOLDERS = [
  "users",
  "businesses",
  "items",
  "offers",
  "categories",
  "agents",
  "general",
] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export interface UploadFileResponse {
  url: string;
  filename: string;
  originalName?: string;
  mimetype?: string;
  size?: number;
}

function authHeaders(): HeadersInit {
  const accessToken = getStoredAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

/**
 * Pulls a usable file record out of whatever envelope the upload endpoint
 * wrapped it in, trying the field names different upload responses commonly
 * use for the saved file's URL. A response this can't make sense of throws
 * instead of silently handing back `undefined` as the "url" — which is how
 * this used to fail: a blank/undefined URL would ride all the way into a
 * saved gallery or QR image with no error anywhere, leaving a dead image on
 * the live page with nothing in the logs to say why.
 */
function extractUploadFile(raw: unknown): UploadFileResponse {
  const record =
    raw && typeof raw === "object" && "data" in raw
      ? (raw as { data: unknown }).data
      : raw;

  if (!record || typeof record !== "object") {
    console.error("Unrecognized upload response shape:", raw);
    throw new ApiError(500, "Upload succeeded but returned no file info");
  }

  const r = record as Record<string, unknown>;
  const url = [r.url, r.path, r.fileUrl, r.location, r.secure_url, r.Location].find(
    (v): v is string => typeof v === "string" && v.length > 0,
  );

  if (!url) {
    console.error("Upload response has no recognizable URL field:", raw);
    throw new ApiError(500, "Upload succeeded but the server didn't return a file URL");
  }

  return {
    url,
    filename:
      typeof r.filename === "string"
        ? r.filename
        : (url.split("/").pop() ?? url),
    originalName:
      typeof r.originalName === "string" ? r.originalName : undefined,
    mimetype: typeof r.mimetype === "string" ? r.mimetype : undefined,
    size: typeof r.size === "number" ? r.size : undefined,
  };
}

/**
 * Uploads a single image file via multipart/form-data and returns the saved
 * public URL (e.g. `/public/items/<uuid>.png`).
 */
export async function uploadImage(
  file: File,
  folder: UploadFolder = "general",
): Promise<UploadFileResponse> {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ApiError(413, IMAGE_TOO_LARGE_MESSAGE);
  }
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/uploads?folder=${folder}`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const { message, details } = extractErrorMessage(
      response.status,
      await response.text(),
    );
    throw new ApiError(response.status, message, details);
  }

  return extractUploadFile(await response.json());
}

/**
 * Same as `uploadImage`, but over `XMLHttpRequest` instead of `fetch` so the
 * caller can show a real 0-100% progress ring instead of an indefinite
 * spinner — `fetch` has no upload-progress event, `XMLHttpRequest` does.
 */
export function uploadImageWithProgress(
  file: File,
  folder: UploadFolder = "general",
  onProgress?: (percent: number) => void,
): Promise<UploadFileResponse> {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return Promise.reject(new ApiError(413, IMAGE_TOO_LARGE_MESSAGE));
  }
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/uploads?folder=${folder}`);
    const token = getStoredAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(extractUploadFile(JSON.parse(xhr.responseText)));
        } catch {
          reject(new ApiError(500, "Upload succeeded but returned no file info"));
        }
      } else {
        const { message, details } = extractErrorMessage(xhr.status, xhr.responseText);
        reject(new ApiError(xhr.status, message, details));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, "Network error during upload"));
    xhr.send(formData);
  });
}

/**
 * Uploads several image files at once via multipart/form-data.
 */
export async function uploadImages(
  files: File[],
  folder: UploadFolder = "general",
): Promise<{ urls: string[]; files: UploadFileResponse[] }> {
  if (files.some((file) => file.size > MAX_IMAGE_SIZE_BYTES)) {
    throw new ApiError(413, IMAGE_TOO_LARGE_MESSAGE);
  }
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(
    `${API_BASE_URL}/uploads/multiple?folder=${folder}`,
    {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    },
  );

  if (!response.ok) {
    const { message, details } = extractErrorMessage(
      response.status,
      await response.text(),
    );
    throw new ApiError(response.status, message, details);
  }

  type MultiUploadResult = { urls: string[]; files: UploadFileResponse[] };
  const payload = (await response.json()) as
    | MultiUploadResult
    | { data: MultiUploadResult };
  return "data" in payload ? payload.data : payload;
}

/**
 * Converts a base64 Data URL (e.g. from a canvas crop or drag-and-drop
 * preview) into a saved file and returns its public URL. Prefer `uploadImage`
 * for plain file-picker input; this exists for flows that already hold the
 * image as a Data URL string.
 */
export async function uploadBase64Image(
  base64: string,
  folder: UploadFolder = "general",
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/uploads/base64`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ base64, folder }),
  });

  if (!response.ok) {
    const { message, details } = extractErrorMessage(
      response.status,
      await response.text(),
    );
    throw new ApiError(response.status, message, details);
  }

  const payload = (await response.json()) as
    | { url: string }
    | { data: { url: string } };
  return "data" in payload ? payload.data.url : payload.url;
}
