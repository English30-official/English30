import { BunnyStreamProvider } from './video/BunnyStreamProvider';
import { DirectHtml5Provider } from './video/DirectHtml5Provider';
import { IVideoProvider, VideoPlayback, VideoSource } from './video/IVideoProvider';

export type { IVideoProvider, VideoPlayback, VideoSource } from './video/IVideoProvider';

export class VideoService {
  constructor(private providers: IVideoProvider[] = [new DirectHtml5Provider(), new BunnyStreamProvider()]) {}
  resolve(source?: VideoSource): VideoPlayback | null {
    if (!source?.url) return null;
    return this.providers.find((provider) => provider.canHandle(source))?.resolve(source) ?? null;
  }
}
export const videoService = new VideoService();
