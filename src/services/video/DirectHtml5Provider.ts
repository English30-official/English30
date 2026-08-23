import { IVideoProvider, VideoPlayback, VideoSource } from './IVideoProvider';

export class DirectHtml5Provider implements IVideoProvider {
  readonly id = 'direct-html5' as const;
  canHandle(source: VideoSource): boolean { return source.provider === this.id || /\.(mp4|webm|ogg)(\?.*)?$/i.test(source.url); }
  resolve(source: VideoSource): VideoPlayback { return { kind: 'html5', src: source.url, poster: source.poster }; }
}
