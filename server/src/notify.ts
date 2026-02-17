import { execFile } from "child_process";

const TELEGRAM_TARGET = "593960240";
/** Allow openclaw time to complete (e.g. Telegram API can be slow). Default execFile has no timeout. */
const OPENCLAW_TIMEOUT_MS = 60_000;

interface InlineButton {
  text: string;
  callback_data: string;
}

// In-memory map of txId → Telegram messageId for editing notifications later
const notificationMessages = new Map<string, string>();

export function getNotificationMessageId(txId: string): string | undefined {
  return notificationMessages.get(txId);
}

/** Normalize message for openclaw CLI: newlines in -m can cause exit code 1. */
function normalizeMessageForCli(message: string): string {
  return message.replace(/\n/g, " | ");
}

export function notifyTelegram(
  message: string,
  buttons?: InlineButton[][],
  txId?: string
): void {
  const args = [
    "message",
    "send",
    "--channel",
    "telegram",
    "--target",
    TELEGRAM_TARGET,
    "-m",
    normalizeMessageForCli(message),
  ];

  if (buttons) {
    args.push("--buttons", JSON.stringify(buttons));
  }

  // Use --json to capture messageId when we need to track it
  if (txId) {
    args.push("--json");
  }

  execFile("/usr/local/bin/openclaw", args, { timeout: OPENCLAW_TIMEOUT_MS }, (err, stdout, stderr) => {
    if (err) {
      const code = "code" in err ? (err as NodeJS.ErrnoException).code : (err as { exitCode?: number }).exitCode;
      const killed = (err as { killed?: boolean }).killed;
      console.error("Telegram notification failed:", err.message);
      if (code != null) console.error("Error code:", code);
      if (killed) console.error("Process was killed (timeout after", OPENCLAW_TIMEOUT_MS, "ms?)");
      if (stderr) console.error("openclaw stderr:", stderr.trim());
      if (stdout) console.error("openclaw stdout:", stdout?.trim());
      console.error("Message length:", message.length, "chars; preview:", JSON.stringify(message.slice(0, 80)) + (message.length > 80 ? "…" : ""));
      return;
    }
    if (txId && stdout) {
      try {
        const result = JSON.parse(stdout);
        const messageId = result?.payload?.messageId;
        if (messageId) {
          notificationMessages.set(txId, messageId);
        }
      } catch {
        // ignore parse errors
      }
    }
  });
}

export function editNotification(txId: string, newMessage: string): void {
  const messageId = notificationMessages.get(txId);
  if (!messageId) {
    console.warn(`No notification message found for ${txId}`);
    return;
  }

  execFile(
    "/usr/local/bin/openclaw",
    [
      "message",
      "edit",
      "--channel",
      "telegram",
      "--target",
      TELEGRAM_TARGET,
      "--message-id",
      messageId,
      "-m",
      normalizeMessageForCli(newMessage),
    ],
    { timeout: OPENCLAW_TIMEOUT_MS },
    (err, stdout, stderr) => {
      if (err) {
        const code = "code" in err ? (err as NodeJS.ErrnoException).code : (err as { exitCode?: number }).exitCode;
        const killed = (err as { killed?: boolean }).killed;
        console.error("Telegram edit failed:", err.message);
        if (code != null) console.error("Error code:", code);
        if (killed) console.error("Process was killed (timeout after", OPENCLAW_TIMEOUT_MS, "ms?)");
        if (stderr) console.error("openclaw stderr:", stderr.trim());
        if (stdout) console.error("openclaw stdout:", stdout?.trim());
      } else {
        notificationMessages.delete(txId);
      }
    }
  );
}
