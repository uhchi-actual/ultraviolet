/** Convert a recorded capture (webm/opus) into a WAV File the backend can always read. */

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

export function encodeWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bitDepth = 16;
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(audioBuffer.getChannelData(ch));
  }

  const frameCount = audioBuffer.length;
  const interleaved = new Float32Array(frameCount * numChannels);
  for (let i = 0; i < frameCount; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      interleaved[i * numChannels + ch] = channelData[ch][i];
    }
  }

  const dataLength = interleaved.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, (sampleRate * numChannels * bitDepth) / 8, true);
  view.setUint16(32, (numChannels * bitDepth) / 8, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);
  floatTo16BitPCM(view, 44, interleaved);

  return new Blob([view], { type: "audio/wav" });
}

export async function captureBlobToWavFile(blob: Blob, baseName: string): Promise<File> {
  const arrayBuffer = await blob.arrayBuffer();
  if (arrayBuffer.byteLength < 1000) {
    throw new Error("Capture too short. Play music louder or capture the full 12 seconds.");
  }

  const audioCtx = new AudioContext();
  try {
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    if (decoded.duration < 1) {
      throw new Error("Almost no audio detected. Enable Share tab audio and keep music playing.");
    }
    const wav = encodeWav(decoded);
    return new File([wav], `${baseName}.wav`, { type: "audio/wav" });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Share tab audio")) throw err;
    throw new Error(
      "Could not decode captured audio. Share the music tab (not this page) with Share tab audio checked.",
    );
  } finally {
    await audioCtx.close();
  }
}
