export default class VideoProcessor {
  #mp4Demuxer;

  /**
   *
   * @param {object} options
   * @param {import('./mp4Demuxer').default} options.mp4Demuxer - mp4Demuxer instance
   */
  constructor({ mp4Demuxer }) {
    this.#mp4Demuxer = mp4Demuxer;
  }

  async start({ file, encoderConfig, sendMessage, renderFrame }) {
    const stream = file.stream();
    // const fileName = file.name.split("/").pop().replace(".mp4", "");

    return this.mp4Decoder(encoderConfig, stream).pipeTo(
      new WritableStream({
        write(frame) {
          renderFrame(frame);
        },
      })
    );
  }

  mp4Decoder(encoderConfig, stream) {
    return new ReadableStream({
      start: async (controller) => {
        const decoder = new VideoDecoder({
          /** @param {VideoFrame} frame */
          output: (frame) => {
            controller.enqueue(frame);
          },
          error: (error) => {
            console.error("error on VideoDecoder", error);
            controller.error(error);
          },
        });

        return this.#mp4Demuxer.run(stream, {
          onConfig(config) {
            decoder.configure(config);
          },
          /** @param {EncodedVideoChunk} chunk */
          onChunk(chunk) {
            decoder.decode(chunk);
          },
        });
      },
    });
  }
}
