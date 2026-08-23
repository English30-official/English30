export type VideoProviderId = 'direct-html5' | 'bunny-stream';

export interface VideoSource { url: string; title?: string; poster?: string; provider?: VideoProviderId; }
export interface VideoPlayback { kind: 'html5' | 'embed'; src: string; poster?: string; }

export interface IVideoProvider {
  readonly id: VideoProviderId;
  canHandle(source: VideoSource): boolean;
  resolve(source: VideoSource): VideoPlayback | null;
}
