/**
 * Client-side helper for the backend's filesystem upload endpoints
 * (`POST /uploads`, `POST /uploads/base64`). Kept separate from `apiFetch` in
 * `client.ts` because multipart bodies must not be JSON-stringified or given
 * a `Content-Type: application/json` header.
 */
import { API_BASE_URL, ApiError, extractErrorMessage, getStoredAccessToken } from "./client";

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

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
 * Uploads a single image file via multipart/form-data and returns the saved
 * public URL (e.g. `/public/items/<uuid>.png`).
 */
export async function uploadImage(
  file: File,
  folder: UploadFolder = "general",
): Promise<UploadFileResponse> {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ApiError(413, "Image size must be 5 MB or less");
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

  const payload = (await response.json()) as
    | UploadFileResponse
    | { data: UploadFileResponse };
  return "data" in payload ? payload.data : payload;
}

/**
 * Uploads several image files at once via multipart/form-data.
 */
export async function uploadImages(
  files: File[],
  folder: UploadFolder = "general",
): Promise<{ urls: string[]; files: UploadFileResponse[] }> {
  if (files.some((file) => file.size > MAX_IMAGE_SIZE_BYTES)) {
    throw new ApiError(413, "Image size must be 5 MB or less");
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
