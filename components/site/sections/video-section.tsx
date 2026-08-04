import type { SiteSettings } from "@/lib/settings";

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/);
  return m ? m[1] : null;
}
function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

export function VideoSection({ settings }: { settings: SiteSettings }) {
  const videoUrl = settings.videoUrl;
  const ytId = videoUrl ? getYouTubeId(videoUrl) : null;
  const vimeoId = videoUrl ? getVimeoId(videoUrl) : null;
  const title = settings.videoTitle || "See what we can build together";
  const description = settings.videoDescription;
  const poster = settings.videoPoster;

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">Take a Look</p>
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">{title}</h2>
        {description && <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      <div className="mx-auto max-w-4xl">
        {videoUrl ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
            {ytId ? (
              <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0`} title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="size-full" />
            ) : vimeoId ? (
              <iframe src={`https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0`} title="Video" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="size-full" />
            ) : (
              <video src={videoUrl} poster={poster || undefined} controls className="size-full object-contain" />
            )}
          </div>
        ) : (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted/50 border-2 border-dashed flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <div className="text-center">
              <p className="text-sm font-medium">No video set</p>
              <p className="text-xs">Add a YouTube, Vimeo, or video URL in the Video block settings.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
