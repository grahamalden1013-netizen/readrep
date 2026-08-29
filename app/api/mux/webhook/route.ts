import { NextResponse } from "next/server";
import { getWebhookBackend } from "@/lib/db";
import { getVideoProvider } from "@/lib/video";
import { VideoProviderError } from "@/lib/video/provider";
import { applyVideoWebhook } from "@/lib/video/sync";

/**
 * Provider webhook sink.
 *
 * The signature covers the exact bytes of the request, so the body is read as
 * text and never re-serialised. Nothing here logs the signature header, the
 * webhook secret, or a playback token.
 */
export async function POST(request: Request) {
  let provider;
  try {
    provider = getVideoProvider();
  } catch (cause) {
    const message =
      cause instanceof VideoProviderError ? cause.toUserMessage() : "Video provider unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = provider.verifyWebhook(rawBody, request.headers);
  } catch (cause) {
    if (cause instanceof VideoProviderError) {
      // 400 for a bad signature: retrying will not help, so the provider
      // should stop rather than back off.
      const status = cause.code === "not_configured" ? 503 : 400;
      return NextResponse.json({ error: cause.toUserMessage() }, { status });
    }
    return NextResponse.json({ error: "Webhook could not be verified." }, { status: 400 });
  }

  try {
    const backend = getWebhookBackend();
    const outcome = await applyVideoWebhook(event, backend);
    // Always 200 once verified: an unknown game or an event type we ignore is
    // not a delivery failure, and asking the provider to retry would be wrong.
    return NextResponse.json(outcome, { status: 200 });
  } catch (cause) {
    console.error("[mux-webhook] failed to apply event", {
      eventId: event.id,
      type: event.type,
      message: cause instanceof Error ? cause.message : String(cause),
    });
    // 500 asks the provider to retry; the event id keeps that retry idempotent.
    return NextResponse.json({ error: "Could not apply the event." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
