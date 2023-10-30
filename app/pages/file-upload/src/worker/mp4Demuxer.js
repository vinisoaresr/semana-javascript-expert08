import { createFile, DataStream } from "./../deps/mp4box.0.5.2.js";

export default class MP4Demuxer {
  #onConfig;
  #onChunk;
  /** @type {MP4BoxFile} */
  #file;

  /**
   *
   * @param {ReadableStream} stream
   * @param {object} options
   * @param {function} options.onConfig - callback for config data
   * @param {function} options.onChunk - callback for chunk data
   *
   * @returns {Promise<void>}
   */
  run(stream, { onConfig, onChunk }) {
    this.#onConfig = onConfig;
    this.#onChunk = onChunk;
    this.#file = createFile();
    this.#file.onReady = this.#onReady.bind(this);
    this.#file.onSamples = this.#onSamples.bind(this);

    this.#file.onError = (args) => {
      console.error("error on MP4Demuxer ", args);
    };
    return this.#init(stream);
  }

  #onReady(info) {
    const [track] = info.videoTracks;
    this.#onConfig({
      codec: track.codec,
      codecHeight: track.video.height,
      codecWidth: track.video.width,
      description: this.#description(track),
      durationSecs: track.duration / track.timescale,
    });

    this.#file.setExtractionOptions(track.id);

    this.#file.start();
  }

  #onSamples(track_id, ref, samples) {
    // Generate and emit an EncodedVideoChunk for each demuxed sample.
    for (const sample of samples) {
      this.#onChunk(
        new EncodedVideoChunk({
          type: sample.is_sync ? "key" : "delta",
          timestamp: (1e6 * sample.cts) / sample.timescale,
          duration: (1e6 * sample.duration) / sample.timescale,
          data: sample.data,
        })
      );
    }
  }

  // Get the appropriate `description` for a specific track. Assumes that the
  // track is H.264, H.265, VP8, VP9, or AV1.
  #description({ id }) {
    const track = this.#file.getTrackById(id);
    for (const entry of track.mdia.minf.stbl.stsd.entries) {
      const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
      if (box) {
        const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
        box.write(stream);
        return new Uint8Array(stream.buffer, 8); // Remove the box header.
      }
    }
    throw new Error("avcC, hvcC, vpcC, or av1C box not found");
  }

  /**
   *
   * @param {ReadableStream} stream
   *
   * @returns {Promise<void>}
   */
  #init(stream) {
    let _offset = 0;

    const consumeFile = new WritableStream({
      /** @param {Uint8Array} chunk */
      write: async (chunk) => {
        const copy = chunk.buffer;
        copy.fileStart = _offset;
        this.#file.appendBuffer(copy);

        _offset += chunk.byteLength;
        // await this.#file.appendBuffer(chunk);
      },
      close: async () => {
        await this.#file.flush();
      },
    });
    return stream.pipeTo(consumeFile);
  }
}

/** @typedef {object} MP4BoxFile
 * @property {boolean} hasMoov
 * @property {number} duration
 * @property {number} timescale
 * @property {boolean} isFragmented
 * @property {boolean} isProgressive
 * @property {boolean} hasIOD
 * @property {string[]} brands
 * @property {string} created
 * @property {string} modified
 * @property {object[]} tracks
 * @property {number} tracks.id
 * @property {string} tracks.name
 * @property {} tracks.references
 * @property {object[]} tracks.edits
 * @property {number} tracks.edits.segment_duration
 * @property {number} tracks.edits.media_time
 * @property {number} tracks.edits.media_rate_integer
 * @property {number} tracks.edits.media_rate_fraction
 * @property {string} tracks.created
 * @property {string} tracks.modified
 * @property {number} tracks.movie_duration
 * @property {number} tracks.movie_timescale
 * @property {number} tracks.layer
 * @property {number} tracks.alternate_group
 * @property {number} tracks.volume
 * @property {object} tracks.matrix
 * @property {number} tracks.matrix.0
 * @property {number} tracks.matrix.1
 * @property {number} tracks.matrix.2
 * @property {number} tracks.matrix.3
 * @property {number} tracks.matrix.4
 * @property {number} tracks.matrix.5
 * @property {number} tracks.matrix.6
 * @property {number} tracks.matrix.7
 * @property {number} tracks.matrix.8
 * @property {number} tracks.track_width
 * @property {number} tracks.track_height
 * @property {number} tracks.timescale
 * @property {number} tracks.duration
 * @property {number} tracks.samples_duration
 * @property {string} tracks.codec
 * @property {object} tracks.kind
 * @property {string} tracks.kind.schemeURI
 * @property {string} tracks.kind.value
 * @property {string} tracks.language
 * @property {number} tracks.nb_samples
 * @property {number} tracks.size
 * @property {number} tracks.bitrate
 * @property {string} tracks.type
 * @property {object} tracks.video
 * @property {number} tracks.video.width
 * @property {number} tracks.video.height
 * @property {object} tracks.audio
 * @property {number} tracks.audio.sample_rate
 * @property {number} tracks.audio.channel_count
 * @property {number} tracks.audio.sample_size
 * @property {object[]} audioTracks
 * @property {number} audioTracks.id
 * @property {string} audioTracks.name
 * @property {} audioTracks.references
 * @property {string} audioTracks.created
 * @property {string} audioTracks.modified
 * @property {number} audioTracks.movie_duration
 * @property {number} audioTracks.movie_timescale
 * @property {number} audioTracks.layer
 * @property {number} audioTracks.alternate_group
 * @property {number} audioTracks.volume
 * @property {object} audioTracks.matrix
 * @property {number} audioTracks.matrix.0
 * @property {number} audioTracks.matrix.1
 * @property {number} audioTracks.matrix.2
 * @property {number} audioTracks.matrix.3
 * @property {number} audioTracks.matrix.4
 * @property {number} audioTracks.matrix.5
 * @property {number} audioTracks.matrix.6
 * @property {number} audioTracks.matrix.7
 * @property {number} audioTracks.matrix.8
 * @property {number} audioTracks.track_width
 * @property {number} audioTracks.track_height
 * @property {number} audioTracks.timescale
 * @property {number} audioTracks.duration
 * @property {number} audioTracks.samples_duration
 * @property {string} audioTracks.codec
 * @property {object} audioTracks.kind
 * @property {string} audioTracks.kind.schemeURI
 * @property {string} audioTracks.kind.value
 * @property {string} audioTracks.language
 * @property {number} audioTracks.nb_samples
 * @property {number} audioTracks.size
 * @property {number} audioTracks.bitrate
 * @property {string} audioTracks.type
 * @property {object} audioTracks.audio
 * @property {number} audioTracks.audio.sample_rate
 * @property {number} audioTracks.audio.channel_count
 * @property {number} audioTracks.audio.sample_size
 * @property {object[]} videoTracks
 * @property {number} videoTracks.id
 * @property {string} videoTracks.name
 * @property {} videoTracks.references
 * @property {object[]} videoTracks.edits
 * @property {number} videoTracks.edits.segment_duration
 * @property {number} videoTracks.edits.media_time
 * @property {number} videoTracks.edits.media_rate_integer
 * @property {number} videoTracks.edits.media_rate_fraction
 * @property {string} videoTracks.created
 * @property {string} videoTracks.modified
 * @property {number} videoTracks.movie_duration
 * @property {number} videoTracks.movie_timescale
 * @property {number} videoTracks.layer
 * @property {number} videoTracks.alternate_group
 * @property {number} videoTracks.volume
 * @property {object} videoTracks.matrix
 * @property {number} videoTracks.matrix.0
 * @property {number} videoTracks.matrix.1
 * @property {number} videoTracks.matrix.2
 * @property {number} videoTracks.matrix.3
 * @property {number} videoTracks.matrix.4
 * @property {number} videoTracks.matrix.5
 * @property {number} videoTracks.matrix.6
 * @property {number} videoTracks.matrix.7
 * @property {number} videoTracks.matrix.8
 * @property {number} videoTracks.track_width
 * @property {number} videoTracks.track_height
 * @property {number} videoTracks.timescale
 * @property {number} videoTracks.duration
 * @property {number} videoTracks.samples_duration
 * @property {string} videoTracks.codec
 * @property {object} videoTracks.kind
 * @property {string} videoTracks.kind.schemeURI
 * @property {string} videoTracks.kind.value
 * @property {string} videoTracks.language
 * @property {number} videoTracks.nb_samples
 * @property {number} videoTracks.size
 * @property {number} videoTracks.bitrate
 * @property {string} videoTracks.type
 * @property {object} videoTracks.video
 * @property {number} videoTracks.video.width
 * @property {number} videoTracks.video.height
 * @property {} subtitleTracks
 * @property {} metadataTracks
 * @property {} hintTracks
 * @property {} otherTracks
 * @property {string} mime
 */
