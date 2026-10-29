export type VideoConfig = { baseURL: string; apiKey: string; model: string };
export type VideoJob = {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress?: number;
  error?: { code: string; message: string };
};
export type VeoInput = { prompt: string; [key: string]: unknown };
export type SeedanceRequest = {
  input: {
    duration: number;
    resolution: "480p" | "720p";
    prompt?: string;
    image?: string;
    last_frame_image?: string;
    reference_images?: string[];
    reference_videos?: string[];
    reference_audios?: string[];
    output_format?: "mp4";
    [key: string]: unknown;
  };
};
export type TopazUpscaleRequest = {
  input: { video: string; target_resolution: "720p" | "1080p" | "4k"; target_fps: number };
};
export type VideoRequest =
  | SeedanceRequest
  | TopazUpscaleRequest
  | {
      input: string | Record<string, unknown>[];
      response_format: { type: "video"; resolution: string; duration: string; aspect_ratio?: string };
      generation_config?: Record<string, unknown>;
    }
  | {
      instances: [VeoInput];
      parameters: {
        durationSeconds: number;
        resolution: string;
        sampleCount: 1;
        generateAudio: boolean;
        [key: string]: unknown;
      };
    };

export class VideoGatewayError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function jobResponse(response: Response): Promise<VideoJob> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new VideoGatewayError(response.status, body?.message ?? `Video request failed: ${response.status}`);
  }
  return response.json() as Promise<VideoJob>;
}

export async function createVideo(config: VideoConfig, request: VideoRequest) {
  return jobResponse(
    await fetch(`${config.baseURL}/v1/videos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...request, model: config.model }),
    }),
  );
}

export async function pollVideo(config: VideoConfig, id: string) {
  return jobResponse(
    await fetch(`${config.baseURL}/v1/videos/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    }),
  );
}

export async function storeCompletedVideo(
  config: VideoConfig,
  job: VideoJob,
  saveOnce: (id: string, download: () => Promise<ReadableStream<Uint8Array>>) => Promise<string>,
) {
  if (job.status === "failed") throw new Error(job.error?.message ?? "Video generation failed");
  if (job.status !== "completed") throw new Error("Video is not complete");
  return saveOnce(job.id, async () => {
    const response = await fetch(`${config.baseURL}/v1/videos/${encodeURIComponent(job.id)}/content`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    if (!response.ok || !response.body) throw new Error(`Video download failed: ${response.status}`);
    return response.body;
  });
}
