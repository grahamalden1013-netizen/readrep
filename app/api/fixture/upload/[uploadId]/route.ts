import { NextResponse } from "next/server";
import { FixtureVideoProvider } from "@/lib/video/fixture";
import { getVideoConfig } from "@/lib/video";
import { MAX_UPLOAD_BYTES, VideoProviderError } from "@/lib/video/provider";

/**
 * Stand-in for the provider's direct-upload URL in fixture mode.
 *
 * It streams and counts the bytes the browser sends — so upload progress is
 * real — and then discards them: fixture playback is the committed demo film,
 * never the file you chose. The route refuses to exist unless fixture mode is
 * actually the active pipeline, so it can never shadow a real Mux upload.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const config = getVideoConfig();
  if (config.kind !== "fixture") {
    return NextResponse.json(
      { error: "Fixture uploads are not enabled on this server." },
      { status: 404 },
    );
  }

  const { uploadId } = await params;
  const body = request.body;
  if (!body) {
    return NextResponse.json({ error: "Expected a request body." }, { status: 400 });
  }

  let bytesReceived = 0;
  const reader = body.getReader();

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesReceived += value.byteLength;
      if (bytesReceived > MAX_UPLOAD_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: "File is larger than the 6 GB limit." }, { status: 413 });
      }
    }
  } catch {
    return NextResponse.json({ error: "The upload stream failed." }, { status: 400 });
  }

  if (bytesReceived === 0) {
    return NextResponse.json({ error: "The upload was empty." }, { status: 400 });
  }

  try {
    await new FixtureVideoProvider().completeUpload(uploadId, bytesReceived);
  } catch (cause) {
    if (cause instanceof VideoProviderError && cause.code === "not_found") {
      return NextResponse.json({ error: "Unknown upload." }, { status: 404 });
    }
    return NextResponse.json({ error: "Could not record the upload." }, { status: 500 });
  }

  return new NextResponse(null, { status: 200 });
}
