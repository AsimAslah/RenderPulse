const STATES = new Set(["queued", "processing", "completed", "failed"]);

export class RenderApiError extends Error {
  constructor(code, options = {}) {
    super(code, options);
    this.name = "RenderApiError";
    this.code = code;
  }
}

function validateResponse(data, expectedId) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new RenderApiError("malformed_response");
  }
  if (data.render_id !== expectedId || !STATES.has(data.status)) {
    throw new RenderApiError("malformed_response");
  }
  const result = { render_id: data.render_id, status: data.status };
  if (data.progress !== undefined) {
    if (!Number.isInteger(data.progress) || data.progress < 0 || data.progress > 100) {
      throw new RenderApiError("malformed_response");
    }
    result.progress = data.progress;
  }
  if (data.model_format !== undefined) {
    if (typeof data.model_format !== "string" || !/^[A-Z0-9]{2,12}$/.test(data.model_format)) {
      throw new RenderApiError("malformed_response");
    }
    result.model_format = data.model_format;
  }
  if (data.updated_at !== undefined) {
    if (typeof data.updated_at !== "string" || Number.isNaN(Date.parse(data.updated_at))) {
      throw new RenderApiError("malformed_response");
    }
    result.updated_at = data.updated_at;
  }
  return result;
}

export function createRenderApiClient({ baseUrl, apiKey, timeoutMs = 10_000, fetchImpl = fetch }) {
  return {
    async getStatus(renderId, context) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetchImpl(`${baseUrl}/api/renders/${encodeURIComponent(renderId)}/status`, {
          method: "GET",
          headers: {
            authorization: `Bearer ${apiKey}`,
            accept: "application/json",
            "x-renderpulse-slack-team": context.teamId,
            "x-renderpulse-slack-channel": context.channelId,
            "x-renderpulse-slack-user": context.userId,
          },
          signal: controller.signal,
        });
      } catch (error) {
        if (error?.name === "AbortError") throw new RenderApiError("timeout", { cause: error });
        throw new RenderApiError("unavailable", { cause: error });
      } finally {
        clearTimeout(timeout);
      }

      if (response.status === 404) throw new RenderApiError("not_found");
      if (response.status === 401 || response.status === 403) throw new RenderApiError("unauthorized");
      if (!response.ok) throw new RenderApiError("unavailable");
      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw new RenderApiError("malformed_response", { cause: error });
      }
      return validateResponse(data, renderId);
    },
  };
}

