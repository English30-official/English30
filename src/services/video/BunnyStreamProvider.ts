import { IVideoProvider, VideoPlayback, VideoSource } from './IVideoProvider';

/** Contract placeholder only. Signed Bunny URLs and API calls intentionally remain unimplemented. */
export class BunnyStreamProvider implements IVideoProvider {
  readonly id = 'bunny-stream' as const;
  canHandle(source: VideoSource): boolean { return source.provider === this.id; }
  resolve(_source: VideoSource): VideoPlayback | null { return null; }
}
