export class SlackApiError extends Error {
  constructor(code, options = {}) {
    super(code, options);
    this.name = "SlackApiError";
    this.code = code;
  }
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function createSlackClient({ token, fetchImpl = fetch, sleep = delay, maxRetries = 2 }) {
  async function call(method, payload) {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(`https://slack.com/api/${method}`, {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        if (attempt < maxRetries) {
          await sleep(250 * (attempt + 1));
          continue;
        }
        throw new SlackApiError("network_error", { cause: error });
      }

      if (response.status === 429 && attempt < maxRetries) {
        const retryAfter = Math.min(Number(response.headers.get("retry-after") ?? 1), 5);
        await sleep(Math.max(1, retryAfter) * 1_000);
        continue;
      }
      if (response.status >= 500 && attempt < maxRetries) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw new SlackApiError("invalid_response", { cause: error });
      }
      if (!response.ok || data.ok !== true) {
        throw new SlackApiError(typeof data.error === "string" ? data.error : `http_${response.status}`);
      }
      return data;
    }
    throw new SlackApiError("retry_exhausted");
  }

  return {
    postMessage: (channel, message) => call("chat.postMessage", { channel, ...message }),
    postEphemeral: (channel, user, message) => call("chat.postEphemeral", { channel, user, ...message }),
  };
}

