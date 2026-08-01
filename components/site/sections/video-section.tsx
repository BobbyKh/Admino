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
  if (!settings.videoUrl) return null;
  const ytId = getYouTubeId(settings.videoUrl);
  const vimeoId = getVimeoId(settings.videoUrl);
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">Take a Look</p>
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">{settings.videoTitle || "Experience Maiti Resort"}</h2>
        {settings.videoDescription && <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{settings.videoDescription}</p>}
      </div>
      <div className="mx-auto max-w-4xl">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
          {ytId ? (
            <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0`} title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="size-full" />
          ) : vimeoId ? (
            <iframe src={`https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0`} title="Video" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="size-full" />
          ) : (
            <video src={settings.videoUrl} poster={settings.videoPoster || undefined} controls className="size-full object-contain" />
          )}
        </div>
      </div>
    </section>
  );
}
